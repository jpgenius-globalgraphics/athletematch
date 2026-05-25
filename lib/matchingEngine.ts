import schools from "@/data/schools.json";

export type Gender = "mens" | "womens";
export type Division = "D1" | "D2" | "D3";
export type Region = "Northeast" | "Mid-Atlantic" | "South" | "Southeast" | "Southwest" | "Midwest" | "West" | "Other";

export interface AthleteProfile {
  gpa: number;
  satScore?: number;
  actScore?: number;
  clubLevel: "pro-academy" | "mls-next-ecnl" | "national" | "regional" | "local";
  playingTime: "impact" | "starter" | "rotational" | "substitute" | "developmental";
  preferredDivisions: Division[];
  preferredRegions: Region[];
}

export interface School {
  id: number;
  ncaaOrgId?: number;
  name: string;
  location: string;
  state?: string;
  region?: Region;
  avgGPA: number;
  avgSAT: number;
  avgACT: number;
  division: Division;
  conference: string;
  hasMensSoccer: boolean;
  hasWomensSoccer: boolean;
  mensUrl: string | null;
  womensUrl: string | null;
  schoolUrl?: string | null;
  athleticUrl?: string | null;
  acceptanceRate: number;
  tuition: string;
  internationalPercentage: number;
  tier: "elite" | "high" | "mid" | "accessible";
  private?: boolean;
  hbcu?: boolean;
  source?: string;
  notes: string;
}

export interface MatchResult extends School {
  matchScore: number;
  reasons: string[];
  athleticFit: "Strong fit" | "Target" | "Reach" | "Safety" | "Long shot";
  scoreBreakdown: {
    athletic: number;
    academic: number;
    preference: number;
    roster: number;
  };
}

const clubLevelScore: Record<AthleteProfile["clubLevel"], number> = {
  "pro-academy": 98,
  "mls-next-ecnl": 88,
  national: 74,
  regional: 58,
  local: 42,
};

const playingTimeScore: Record<AthleteProfile["playingTime"], number> = {
  impact: 96,
  starter: 86,
  rotational: 70,
  substitute: 52,
  developmental: 34,
};

const divisionDemand: Record<Division, Record<School["tier"], number>> = {
  D1: { elite: 94, high: 86, mid: 76, accessible: 68 },
  D2: { elite: 78, high: 72, mid: 62, accessible: 54 },
  D3: { elite: 76, high: 68, mid: 56, accessible: 46 },
};

const academicWeightByTier: Record<School["tier"], number> = {
  elite: 0.34,
  high: 0.28,
  mid: 0.22,
  accessible: 0.18,
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function testScore(profile: AthleteProfile) {
  if (profile.satScore) return profile.satScore;
  if (profile.actScore) return Math.round((profile.actScore / 36) * 1600);
  return null;
}

function academicScore(profile: AthleteProfile, school: School) {
  const gpaScore = clamp(78 + (profile.gpa - school.avgGPA) * 28);
  const score = testScore(profile);
  const testMatch = score ? clamp(78 + ((score - school.avgSAT) / 160) * 12) : 82;
  return Math.round(gpaScore * 0.62 + testMatch * 0.38);
}

function athleticScore(profile: AthleteProfile, school: School) {
  const playerLevel = clubLevelScore[profile.clubLevel] * 0.68 + playingTimeScore[profile.playingTime] * 0.32;
  const demand = divisionDemand[school.division][school.tier];
  const gap = playerLevel - demand;
  const score = gap >= 0 ? 100 - gap * 0.45 : 100 + gap * 1.35;
  return Math.round(clamp(score));
}

function preferenceScore(profile: AthleteProfile, school: School) {
  const divisionFit = profile.preferredDivisions.length === 0 || profile.preferredDivisions.includes(school.division) ? 100 : 74;
  const regionFit = profile.preferredRegions.length === 0 || (school.region && profile.preferredRegions.includes(school.region)) ? 100 : 82;
  return Math.round(divisionFit * 0.6 + regionFit * 0.4);
}

function rosterScore(profile: AthleteProfile, school: School) {
  const playerLevel = clubLevelScore[profile.clubLevel];
  if (school.internationalPercentage >= 35 && playerLevel < 74) return 70;
  if (school.internationalPercentage >= 25 && playerLevel < 58) return 76;
  return 92;
}

function hardConstraint(profile: AthleteProfile, school: School) {
  const score = testScore(profile);
  const playerLevel = clubLevelScore[profile.clubLevel];

  if (school.tier === "elite" && playerLevel < 74) {
    return "Elite programs usually need a national-level club profile";
  }

  if (school.division === "D1" && school.tier !== "accessible" && playerLevel < 58) {
    return "Most competitive D1 programs are a stretch from a local-only profile";
  }

  if (school.tier === "elite" && profile.gpa < 3.55) {
    return "Academic profile is below the usual range for this school";
  }

  if (school.tier === "elite" && score && score < 1320) {
    return "Test score is below the usual range for this school";
  }

  return null;
}

function fitLabel(score: number): MatchResult["athleticFit"] {
  if (score >= 88) return "Strong fit";
  if (score >= 78) return "Target";
  if (score >= 67) return "Reach";
  if (score >= 58) return "Long shot";
  return "Safety";
}

function reasonsFor(profile: AthleteProfile, school: School, breakdown: MatchResult["scoreBreakdown"]) {
  const reasons: string[] = [];

  if (breakdown.athletic >= 86) reasons.push("Soccer level lines up well");
  else if (breakdown.athletic >= 72) reasons.push("Athletic profile is in range");
  else reasons.push("Athletic fit is a reach");

  if (breakdown.academic >= 88) reasons.push("Strong academic match");
  else if (breakdown.academic < 68) reasons.push("Academic reach");

  if (profile.preferredDivisions.length < 3 && profile.preferredDivisions.includes(school.division)) reasons.push(`${school.division} preference`);
  if (school.region && profile.preferredRegions.includes(school.region)) reasons.push(`${school.region} region`);
  if (school.hasMensSoccer && school.hasWomensSoccer) reasons.push("Men's and women's programs");
  if (school.hbcu) reasons.push("HBCU");

  return reasons.slice(0, 4);
}

export function calculateMatches(profile: AthleteProfile, gender: Gender = "mens"): MatchResult[] {
  const eligibleSchools = (schools as School[]).filter((school) =>
    gender === "mens" ? school.hasMensSoccer : school.hasWomensSoccer
  );

  return eligibleSchools
    .map((school) => {
      const constraint = hardConstraint(profile, school);
      if (constraint) {
        return {
          ...school,
          matchScore: 0,
          reasons: [constraint],
          athleticFit: "Long shot" as const,
          scoreBreakdown: { athletic: 0, academic: 0, preference: 0, roster: 0 },
        };
      }

      const breakdown = {
        athletic: athleticScore(profile, school),
        academic: academicScore(profile, school),
        preference: preferenceScore(profile, school),
        roster: rosterScore(profile, school),
      };

      const academicWeight = academicWeightByTier[school.tier];
      const score = Math.round(clamp(
        breakdown.athletic * 0.46 +
          breakdown.academic * academicWeight +
          breakdown.preference * 0.16 +
          breakdown.roster * (0.38 - academicWeight)
      ));

      return {
        ...school,
        matchScore: score,
        reasons: reasonsFor(profile, school, breakdown),
        athleticFit: fitLabel(score),
        scoreBreakdown: breakdown,
      };
    })
    .filter((match) => match.matchScore >= 54)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      return a.name.localeCompare(b.name);
    });
}

export function filterByThreshold(matches: MatchResult[], threshold = 54): MatchResult[] {
  return matches.filter((match) => match.matchScore >= threshold);
}
