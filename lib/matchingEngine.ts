import schools from "@/data/schools.json";

export type Gender = "mens" | "womens";

export interface AthleteProfile {
  gpa: number;
  satScore?: number;
  actScore?: number;
  clubLevel: "mls-next-academy" | "mls-next-club" | "lower-ecnl" | "ea-usys";
  playingTime: "90mins" | "regular" | "sometimes" | "substitute" | "reserve";
}

export interface School {
  id: number;
  name: string;
  location: string;
  avgGPA: number;
  avgSAT: number;
  avgACT: number;
  division: string;
  conference: string;
  hasMensSoccer: boolean;
  hasWomensSoccer: boolean;
  mensUrl: string | null;
  womensUrl: string | null;
  acceptanceRate: number;
  tuition: string;
  internationalPercentage: number;
  tier: "elite" | "high" | "mid" | "accessible";
  notes: string;
}

export interface MatchResult extends School {
  matchScore: number;
  reasons: string[];
  athleticFit: string;
}

// Club level to recruitment competitiveness
const clubLevelTier: Record<string, number> = {
  "mls-next-academy": 100,
  "mls-next-club": 85,
  "lower-ecnl": 60,
  "ea-usys": 35,
};

// Playing time scoring
const playingTimeScore: Record<string, number> = {
  "90mins": 100,
  regular: 85,
  sometimes: 65,
  substitute: 40,
  reserve: 20,
};

const IVY_NAMES = ["Harvard", "Yale", "Princeton", "University of Pennsylvania", "Dartmouth", "Brown", "Columbia", "Cornell"];
const ELITE_ACC_NAMES = ["Stanford University", "University of North Carolina", "Duke University", "University of Virginia"];
const TOP_D1_NAMES = [
  "University of Michigan", "Ohio State University", "UCLA", "Northwestern University",
  "Boston College", "Wake Forest University", "Notre Dame", "Georgetown University",
  "Florida State University", "University of Maryland", "Indiana University",
];

export function calculateMatches(profile: AthleteProfile, gender: Gender = "mens"): MatchResult[] {
  const testScore = profile.satScore
    ? profile.satScore
    : profile.actScore
    ? profile.actScore * 36
    : 0;

  // Only include schools that have a program for the selected gender
  const eligibleSchools = (schools as School[]).filter((s) =>
    gender === "mens" ? s.hasMensSoccer : s.hasWomensSoccer
  );

  const matches: MatchResult[] = eligibleSchools
    .map((school) => {
      let score = 0;
      const reasons: string[] = [];
      let athleticFit = "Match";

      const isIvy = IVY_NAMES.some((n) => school.name.includes(n.split(" ")[0]) || school.name === n);
      const isEliteACC = ELITE_ACC_NAMES.some((n) => school.name === n);
      const isTopD1 = TOP_D1_NAMES.some((n) => school.name === n);
      const isMidD1 = school.tier === "high" || school.tier === "mid";

      // Hard constraint: club level vs school tier
      if (profile.clubLevel === "ea-usys") {
        if (isIvy || isEliteACC || isTopD1 || isMidD1) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Club level too low for this program"],
            athleticFit: "Not Viable",
          };
        }
      }

      if (profile.clubLevel === "lower-ecnl") {
        if (isIvy || isEliteACC || isTopD1) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Need MLS Next Club or Academy level for this program"],
            athleticFit: "Not Viable",
          };
        }
      }

      // Ivy League playing time constraint (lower club levels)
      if (isIvy && (profile.playingTime === "substitute" || profile.playingTime === "reserve")) {
        if (profile.clubLevel === "lower-ecnl" || profile.clubLevel === "ea-usys") {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Ivy League requires at least regular starter status at your club level"],
            athleticFit: "Not Viable",
          };
        }
      }

      // Hard constraint: elite schools need SAT 1360+ and GPA 3.6+
      if (isIvy || isEliteACC) {
        if (testScore < 1360 || profile.gpa < 3.6) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Need SAT 1360+ and GPA 3.6+ for this program"],
            athleticFit: "Not Viable",
          };
        }
      }

      // Academic fit (35%)
      const gpaMatch = Math.min(100, (profile.gpa / school.avgGPA) * 100);
      const satMatch = testScore ? Math.min(100, (testScore / school.avgSAT) * 100) : 100;
      const academicScore = (gpaMatch + satMatch) / 2;
      score += academicScore * 0.35;

      if (gpaMatch >= 95) reasons.push("Excellent GPA match");
      else if (gpaMatch >= 85) reasons.push("Strong GPA match");
      else if (gpaMatch < 70) reasons.push("GPA below school average");

      // Club level (55% — dominant factor)
      const clubScore = clubLevelTier[profile.clubLevel] || 50;
      score += clubScore * 0.55;

      if (clubScore >= 85) reasons.push("Top club level — strong recruiting advantage");
      else if (clubScore >= 60) reasons.push("Competitive club level");
      else reasons.push("Lower club level");

      // Playing time (10%)
      const playingTimeValue = playingTimeScore[profile.playingTime] || 50;
      score += playingTimeValue * 0.1;

      if (playingTimeValue >= 85) reasons.push("Elite playing time");

      // International roster consideration (5%)
      let internationalBoost = 100;
      if (
        profile.clubLevel !== "mls-next-academy" &&
        profile.clubLevel !== "mls-next-club" &&
        school.internationalPercentage > 60
      ) {
        internationalBoost = 70;
        reasons.push(`High international roster (${school.internationalPercentage}%)`);
      }
      score += internationalBoost * 0.05;

      score = Math.round(Math.max(0, Math.min(100, score)));

      if (score >= 85) athleticFit = "Excellent Fit";
      else if (score >= 75) athleticFit = "Good Fit";
      else if (score >= 65) athleticFit = "Possible Fit";
      else if (score >= 50) athleticFit = "Reach";

      return {
        ...school,
        matchScore: score,
        reasons,
        athleticFit,
      };
    })
    .filter((match) => match.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore);

  return matches;
}

export function filterByThreshold(matches: MatchResult[], threshold: number = 50): MatchResult[] {
  return matches.filter((match) => match.matchScore >= threshold);
}
