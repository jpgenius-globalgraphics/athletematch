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
  "lower-ecnl": 70,
  "ea-usys": 50,
};

// Playing time scoring
const playingTimeScore: Record<string, number> = {
  "90mins": 100,
  regular: 85,
  sometimes: 70,
  substitute: 50,
  reserve: 30,
};

export function calculateMatches(profile: AthleteProfile): MatchResult[] {
  const testScore = profile.satScore ? profile.satScore : (profile.actScore ? profile.actScore * 36 : 0);
  const playerClubTier = clubLevelTier[profile.clubLevel] || 50;

  const matches: MatchResult[] = schools
    .map((school) => {
      let score = 0;
      const reasons: string[] = [];
      let athleticFit = "Match";

      // HARD CONSTRAINT: Club level vs school tier
      const isEliteSchool = ["Stanford", "Harvard", "Yale", "Princeton", "UNC", "Michigan", "Ohio State", "UCLA", "Northwestern", "Duke"].includes(school.name);
      
      if (isEliteSchool && profile.clubLevel === "ea-usys") {
        return {
          ...school,
          matchScore: 0,
          reasons: ["Athletic profile too low for this elite program"],
          athleticFit: "Not Viable",
        };
      }

      if (isEliteSchool && profile.clubLevel === "lower-ecnl") {
        return {
          ...school,
          matchScore: 0,
          reasons: ["Need MLS Next Club or Academy level for this elite program"],
          athleticFit: "Not Viable",
        };
      }

      // Academic fit (45% of score)
      const gpaMatch = Math.min(100, (profile.gpa / school.avgGPA) * 100);
      const satMatch = testScore ? Math.min(100, (testScore / school.avgSAT) * 100) : 100;
      const academicScore = (gpaMatch + satMatch) / 2;
      score += academicScore * 0.45;

      // HARD CONSTRAINT: Elite schools need SAT 1360+ and GPA 3.6+
      if (isEliteSchool) {
        if (testScore < 1360 || profile.gpa < 3.6) {
          return {
            ...school,
            matchScore: 0,
            reasons: ["Need SAT 1360+ and GPA 3.6+ for this elite program"],
            athleticFit: "Not Viable",
          };
        }
      }

      if (gpaMatch >= 95) reasons.push("Excellent GPA match");
      else if (gpaMatch >= 85) reasons.push("Strong GPA match");
      else if (gpaMatch < 70) reasons.push("GPA below school average");

      // Athletic fit (50% of score)
      const playingTimeValue = playingTimeScore[profile.playingTime] || 50;
      const clubScore = clubLevelTier[profile.clubLevel] || 50;
      
      const athleticScore = (playingTimeValue + clubScore) / 2;
      score += athleticScore * 0.5;

      if (playingTimeValue >= 85) reasons.push("Elite playing time");
      if (clubScore >= 85) reasons.push("Top club level");

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
      if (score >= 80) athleticFit = "Excellent Fit";
      else if (score >= 70) athleticFit = "Good Fit";
      else if (score >= 60) athleticFit = "Possible Fit";
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