import schools from "@/data/schools.json";

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
  programs: string[];
  acceptanceRate: number;
  tuition: string;
  internationalPercentage: number;
  notes: string;
  tier: "elite" | "high" | "mid" | "accessible"; // For filtering
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

// Playing time scoring (reduced importance)
const playingTimeScore: Record<string, number> = {
  "90mins": 100,
  regular: 85,
  sometimes: 65,
  substitute: 40,
  reserve: 20,
};

export function calculateMatches(profile: AthleteProfile): MatchResult[] {
  const testScore = profile.satScore ? profile.satScore : (profile.actScore ? profile.actScore * 36 : 0);

  const matches: MatchResult[] = schools
    .map((school) => {
      let score = 0;
      const reasons: string[] = [];
      let athleticFit = "Match";

      // HARD CONSTRAINT: Club level vs school tier
      const isIvyLeague = ["Harvard", "Yale", "Princeton", "Penn", "Dartmouth", "Brown", "Columbia", "Cornell"].includes(school.name);
      const isEliteACC = ["Stanford", "UNC", "Duke", "Virginia"].includes(school.name);
      const isTopD1 = ["Michigan", "Ohio State", "UCLA", "Northwestern", "Boston College", "Wake Forest"].includes(school.name);
      const isMidD1 = school.tier === "high" || school.tier === "mid";

      // Lower club levels can't recruit at elite/top D1 schools
      if (profile.clubLevel === "ea-usys") {
        if (isIvyLeague || isEliteACC || isTopD1) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Club level too low for this program"],
            athleticFit: "Not Viable",
          };
        }
        if (isMidD1) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Club level too low for this program"],
            athleticFit: "Not Viable",
          };
        }
      }

      if (profile.clubLevel === "lower-ecnl") {
        if (isIvyLeague || isEliteACC || isTopD1) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Need MLS Next Club or Academy level for this program"],
            athleticFit: "Not Viable",
          };
        }
      }

      // Ivy League minimum playing time requirement - only for LOWER club levels
      if (isIvyLeague && (profile.playingTime === "substitute" || profile.playingTime === "reserve")) {
        if (profile.clubLevel === "lower-ecnl" || profile.clubLevel === "ea-usys") {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Ivy League requires at least regular starter status at your club level"],
            athleticFit: "Not Viable",
          };
        }
        // MLS Next Academy/Club players can be subs at Ivy - they're elite enough
      }

      // Academic fit (35% of score)
      const gpaMatch = Math.min(100, (profile.gpa / school.avgGPA) * 100);
      const satMatch = testScore ? Math.min(100, (testScore / school.avgSAT) * 100) : 100;
      const academicScore = (gpaMatch + satMatch) / 2;
      score += academicScore * 0.35;

      // HARD CONSTRAINT: Elite schools need SAT 1360+ and GPA 3.6+
      if (isIvyLeague || isEliteACC) {
        if (testScore < 1360 || profile.gpa < 3.6) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Need SAT 1360+ and GPA 3.6+ for this program"],
            athleticFit: "Not Viable",
          };
        }
      }

      if (gpaMatch >= 95) reasons.push("Excellent GPA match");
      else if (gpaMatch >= 85) reasons.push("Strong GPA match");
      else if (gpaMatch < 70) reasons.push("GPA below school average");

      // Club level (55% of score - DOMINANT FACTOR)
      const clubScore = clubLevelTier[profile.clubLevel] || 50;
      score += clubScore * 0.55;

      if (clubScore >= 85) reasons.push("Top club level - strong advantage");
      if (clubScore >= 60 && clubScore < 85) reasons.push("Competitive club level");
      if (clubScore < 60) reasons.push("Lower club level");

      // Playing time (10% of score - MINIMAL WEIGHT)
      const playingTimeValue = playingTimeScore[profile.playingTime] || 50;
      score += playingTimeValue * 0.1;

      if (playingTimeValue >= 85) reasons.push("Elite playing time");

      // International player consideration (5% of score)
      let internationalBoost = 100;
      if (profile.clubLevel === "mls-next-academy" || profile.clubLevel === "mls-next-club") {
        // Top players less affected by international roster
        internationalBoost = 100;
      } else if (school.internationalPercentage > 60) {
        // Lower club level players competing for limited spots
        internationalBoost = 70;
        reasons.push(`High international roster (${school.internationalPercentage}%)`);
      }
      score += internationalBoost * 0.05;

      // Normalize score
      score = Math.round(Math.max(0, Math.min(100, score)));

      // Determine athletic fit category
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