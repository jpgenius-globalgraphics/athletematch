import schools from "@/data/schools.json";

export interface AthleteProfile {
  gpa: number;
  satScore?: number;
  actScore?: number;
  athleticLevel: "elite" | "high" | "medium" | "low";
  playingTime: "90mins" | "regular" | "sometimes" | "substitute" | "reserve";
  clubLevel: "national" | "state" | "regional" | "local";
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
  athleticLevel: string;
  programs: string[];
  acceptanceRate: number;
  tuition: string;
  notes: string;
}

export interface MatchResult extends School {
  matchScore: number;
  reasons: string[];
}

// Athletic level scoring
const athleticLevelMap: Record<string, number> = {
  "90mins": 100,
  regular: 85,
  sometimes: 70,
  substitute: 50,
  reserve: 30,
};

const clubLevelMap: Record<string, number> = {
  national: 100,
  state: 80,
  regional: 60,
  local: 40,
};

const athleticTierMap: Record<string, number> = {
  elite: 90,
  high: 75,
  medium: 55,
  low: 35,
};

export function calculateMatches(profile: AthleteProfile): MatchResult[] {
  const testScore = profile.satScore ? profile.satScore : (profile.actScore ? profile.actScore * 36 : 0);

  const matches: MatchResult[] = schools.map((school) => {
    let score = 0;
    const reasons: string[] = [];

    // Academic fit (40% of score)
    const gpaMatch = Math.min(100, (profile.gpa / school.avgGPA) * 100);
    const satMatch = testScore ? Math.min(100, (testScore / school.avgSAT) * 100) : 100;
    const academicScore = (gpaMatch + satMatch) / 2;
    score += academicScore * 0.4;

    if (gpaMatch >= 90) reasons.push("Strong GPA match");
    if (gpaMatch < 70) reasons.push("GPA below school average");

    // Athletic fit (50% of score)
    const playingTimeScore = athleticLevelMap[profile.playingTime] || 50;
    const clubScore = clubLevelMap[profile.clubLevel] || 50;
    const schoolTierScore = athleticTierMap[profile.athleticLevel] || 50;
    
    const athleticScore = (playingTimeScore + clubScore + schoolTierScore) / 3;
    score += athleticScore * 0.5;

    if (playingTimeScore >= 85) reasons.push("Elite playing time");
    if (clubScore >= 80) reasons.push("Top club level");

    // Division fit (10% of score)
    let divisionBoost = 0;
    if (profile.athleticLevel === "elite" && school.athleticLevel === "elite") divisionBoost = 100;
    else if (profile.athleticLevel === "high" && (school.athleticLevel === "elite" || school.athleticLevel === "high")) divisionBoost = 90;
    else if (profile.athleticLevel === "medium" && school.athleticLevel !== "elite") divisionBoost = 85;
    else if (profile.athleticLevel === "low") divisionBoost = 60;

    score += divisionBoost * 0.1;

    // Normalize score
    score = Math.round(Math.max(0, Math.min(100, score)));

    return {
      ...school,
      matchScore: score,
      reasons,
    };
  });

  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

export function filterByThreshold(matches: MatchResult[], threshold: number = 60): MatchResult[] {
  return matches.filter((match) => match.matchScore >= threshold);
}