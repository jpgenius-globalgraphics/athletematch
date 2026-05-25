import schools from "@/data/schools.json";

export type Gender = "mens" | "womens";
export type Division = "D1" | "D2" | "D3";
export type Region = "Northeast" | "Mid-Atlantic" | "South" | "Southeast" | "Southwest" | "Midwest" | "West" | "Other";
export type EnrollmentPreference = "small" | "medium" | "large" | "any";
export type AreaOfStudy = "stem" | "business" | "liberal-arts" | "pre-med" | "arts" | "undecided";
export type FinancialAidPriority = "athletic" | "need-based" | "academic-merit" | "none";

export interface AthleteProfile {
  gpa: number;
  satScore?: number;
  actScore?: number;
  clubLevel: "pro-academy" | "mls-next-ecnl" | "national" | "regional" | "local";
  playingTime: "impact" | "starter" | "rotational" | "substitute" | "developmental";
  preferredDivisions: Division[];
  preferredRegions: Region[];
  enrollmentPreference?: EnrollmentPreference;
  areaOfStudy?: AreaOfStudy;
  financialAidPriority?: FinancialAidPriority;
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
  enrollment?: number;
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

// Enrollment now comes from College Scorecard for ~911/1037 schools (see
// scripts/backfill_schools.py). The remaining ~126 fall back to the heuristic
// below. Programs and aid-type are still proxied from name/conference/tier
// patterns — affects ranking but not authoritative.

function enrollmentBandFromHeuristic(school: School): "small" | "medium" | "large" {
  if (school.division === "D3" && school.private) return "small";
  if (school.private && (school.tier === "elite" || school.tier === "high")) return "small";
  if (school.private) return "medium";
  if (school.tier === "elite" || school.tier === "high") return "large";
  return "medium";
}

function estimatedEnrollmentBand(school: School): "small" | "medium" | "large" {
  if (typeof school.enrollment === "number") {
    if (school.enrollment < 5000) return "small";
    if (school.enrollment < 15000) return "medium";
    return "large";
  }
  return enrollmentBandFromHeuristic(school);
}

function enrollmentDelta(school: School, preference: EnrollmentPreference | undefined): number {
  if (!preference || preference === "any") return 0;
  const band = estimatedEnrollmentBand(school);
  if (band === preference) return 4;
  if ((preference === "small" && band === "large") || (preference === "large" && band === "small")) return -6;
  return -2;
}

function areaOfStudyDelta(school: School, area: AreaOfStudy | undefined): number {
  if (!area || area === "undecided") return 0;
  const name = school.name;
  switch (area) {
    case "stem":
      if (/(Institute of Technology|Polytechnic|\bTech\b|Technological)/.test(name)) return 8;
      if (school.tier === "elite" || school.tier === "high") return 3;
      return 0;
    case "business":
      if (school.tier === "elite") return 3;
      if (school.tier === "high") return 2;
      return 1;
    case "liberal-arts": {
      const isCollegeNamed = /^[^,]*\bCollege\b/.test(school.name);
      if (school.private && school.division === "D3" && isCollegeNamed) return 8;
      if (school.private && (school.tier === "elite" || school.tier === "high")) return 4;
      return 0;
    }
    case "pre-med":
      if (school.tier === "elite") return 5;
      if (school.tier === "high") return 2;
      return 0;
    case "arts":
      if (/(Conservatory|School of (the )?Arts|Art Institute)/i.test(name)) return 8;
      if (school.private && school.tier !== "accessible") return 2;
      return 0;
    default:
      return 0;
  }
}

// Returns { delta } for soft adjustments, or { exclude } when NCAA rules make
// the aid type unavailable. Athletic scholarships: D3 prohibits (bylaw 15.01.3),
// Ivy League D1 also does not offer them by conference policy.
function financialAidEffect(
  school: School,
  priority: FinancialAidPriority | undefined
): { delta: number; exclude?: string; reason?: string } {
  if (!priority || priority === "none") return { delta: 0 };
  switch (priority) {
    case "athletic":
      if (school.division === "D3") return { delta: 0, exclude: "NCAA D3 schools cannot offer athletic scholarships" };
      if (school.conference === "The Ivy League") return { delta: 0, exclude: "Ivy League programs do not offer athletic scholarships" };
      if (school.division === "D1") return { delta: 4, reason: "D1 athletic aid available" };
      return { delta: 2, reason: "D2 athletic aid available" };
    case "need-based":
      if (school.private && (school.tier === "elite" || school.tier === "high")) return { delta: 5, reason: "Strong need-based aid" };
      if (school.private) return { delta: 2 };
      return { delta: 0 };
    case "academic-merit":
      if (school.tier === "elite") return { delta: -3 };
      if (school.private && (school.tier === "high" || school.tier === "mid")) return { delta: 5, reason: "Merit aid common at this school" };
      if (school.tier === "high") return { delta: 3 };
      if (school.tier === "mid") return { delta: 2 };
      return { delta: 0 };
  }
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

function reasonsFor(
  profile: AthleteProfile,
  school: School,
  breakdown: MatchResult["scoreBreakdown"],
  aidReason?: string
) {
  const reasons: string[] = [];

  if (breakdown.athletic >= 86) reasons.push("Soccer level lines up well");
  else if (breakdown.athletic >= 72) reasons.push("Athletic profile is in range");
  else reasons.push("Athletic fit is a reach");

  if (breakdown.academic >= 88) reasons.push("Strong academic match");
  else if (breakdown.academic < 68) reasons.push("Academic reach");

  if (profile.preferredDivisions.length < 3 && profile.preferredDivisions.includes(school.division)) reasons.push(`${school.division} preference`);
  if (school.region && profile.preferredRegions.includes(school.region)) reasons.push(`${school.region} region`);

  if (profile.enrollmentPreference && profile.enrollmentPreference !== "any") {
    if (estimatedEnrollmentBand(school) === profile.enrollmentPreference) {
      reasons.push(`${profile.enrollmentPreference[0].toUpperCase()}${profile.enrollmentPreference.slice(1)} campus`);
    }
  }
  if (profile.areaOfStudy && profile.areaOfStudy !== "undecided" && areaOfStudyDelta(school, profile.areaOfStudy) >= 5) {
    reasons.push("Aligned with your major");
  }
  if (aidReason) reasons.push(aidReason);

  if (school.hasMensSoccer && school.hasWomensSoccer) reasons.push("Men's and women's programs");
  if (school.hbcu) reasons.push("HBCU");

  return reasons.slice(0, 4);
}

export const MIN_MATCH_SCORE = 60;
export const MAX_RESULTS = 15;

type RankedMatch = MatchResult & { _precise: number };

export function calculateMatches(profile: AthleteProfile, gender: Gender = "mens"): MatchResult[] {
  const eligibleSchools = (schools as School[]).filter((school) =>
    gender === "mens" ? school.hasMensSoccer : school.hasWomensSoccer
  );

  const ranked: RankedMatch[] = [];

  for (const school of eligibleSchools) {
    const constraint = hardConstraint(profile, school);
    if (constraint) continue;

    const aid = financialAidEffect(school, profile.financialAidPriority);
    if (aid.exclude) continue;

    const breakdown = {
      athletic: athleticScore(profile, school),
      academic: academicScore(profile, school),
      preference: preferenceScore(profile, school),
      roster: rosterScore(profile, school),
    };

    const academicWeight = academicWeightByTier[school.tier];
    const baseScore =
      breakdown.athletic * 0.46 +
      breakdown.academic * academicWeight +
      breakdown.preference * 0.16 +
      breakdown.roster * (0.38 - academicWeight);

    // Per-school adjustments — these break ties left by the discrete (division, tier)
    // bins above by injecting real per-school signal.
    const precise = clamp(
      baseScore +
        enrollmentDelta(school, profile.enrollmentPreference) +
        areaOfStudyDelta(school, profile.areaOfStudy) +
        aid.delta
    );
    const matchScore = Math.round(precise);
    if (matchScore < MIN_MATCH_SCORE) continue;

    ranked.push({
      ...school,
      matchScore,
      reasons: reasonsFor(profile, school, breakdown, aid.reason),
      athleticFit: fitLabel(matchScore),
      scoreBreakdown: breakdown,
      _precise: precise,
    });
  }

  // Sort on the unrounded float so schools that round to the same integer still
  // rank by their true score gap; localeCompare is a final deterministic fallback.
  ranked.sort((a, b) => {
    if (b._precise !== a._precise) return b._precise - a._precise;
    return a.name.localeCompare(b.name);
  });

  return ranked.slice(0, MAX_RESULTS).map(({ _precise, ...rest }) => rest);
}

export function filterByThreshold(matches: MatchResult[], threshold = MIN_MATCH_SCORE): MatchResult[] {
  return matches.filter((match) => match.matchScore >= threshold);
}
