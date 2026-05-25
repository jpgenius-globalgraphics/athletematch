import schools from "@/data/schools.json";

export type Gender = "mens" | "womens";
export type Division = "D1" | "D2" | "D3";
export type Region =
  | "Northeast"
  | "Mid-Atlantic"
  | "South"
  | "Southeast"
  | "Southwest"
  | "Midwest"
  | "West"
  | "Other";
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

export interface ScoreBreakdown {
  athleticFit: number;
  academicFit: number;
  campusFit: number;
  financialFit: number;
}

export interface MatchResult extends School {
  matchScore: number;
  reasons: string[];
  fitLabel: "Strong fit" | "Target" | "Reach" | "Long shot" | "Stretch";
  scoreBreakdown: ScoreBreakdown;
}

export const MIN_MATCH_SCORE = 60;
export const MAX_RESULTS = 15;

// =====================================================================
// Architecture
// =====================================================================
// calculateMatches() runs five layers in order:
//
//   1. Eligibility       — must sponsor the requested gender's soccer.
//   2. Hard filtering    — division/region restrictions, NCAA aid rules,
//                          enrollment extremes, athletic overreach.
//   3. Dimension scoring — four independent 0-100 floats, NOT rounded.
//   4. Composite + drag  — weighted sum minus a penalty for any low dim.
//   5. Diversity rerank  — greedy MMR penalizing same-conference repeats.
//
// Each layer is self-contained so it can be tuned or replaced without
// rippling through the others. Sorting always uses the unrounded float.
// =====================================================================

// ---------- Constants ----------

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

// ---------- Helpers ----------

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function testScoreOf(profile: AthleteProfile): number | null {
  if (profile.satScore) return profile.satScore;
  if (profile.actScore) return Math.round((profile.actScore / 36) * 1600);
  return null;
}

function playerLevel(profile: AthleteProfile): number {
  return clubLevelScore[profile.clubLevel] * 0.68 + playingTimeScore[profile.playingTime] * 0.32;
}

function enrollmentBandFromHeuristic(school: School): "small" | "medium" | "large" {
  if (school.division === "D3" && school.private) return "small";
  if (school.private && (school.tier === "elite" || school.tier === "high")) return "small";
  if (school.private) return "medium";
  if (school.tier === "elite" || school.tier === "high") return "large";
  return "medium";
}

function enrollmentBand(school: School): "small" | "medium" | "large" {
  if (typeof school.enrollment === "number") {
    if (school.enrollment < 5000) return "small";
    if (school.enrollment < 15000) return "medium";
    return "large";
  }
  return enrollmentBandFromHeuristic(school);
}

// Programmatic strength for an area of study. Without per-school program data
// this is heuristic — name patterns (STEM/Arts), tier (Pre-med), and identity
// (private liberal-arts D3 colleges) carry most signal.
function areaStrength(school: School, area: AreaOfStudy | undefined): "strong" | "moderate" | "weak" {
  if (!area || area === "undecided") return "moderate";
  const name = school.name;
  switch (area) {
    case "stem":
      if (/(Institute of Technology|Polytechnic|\bTech\b|Technological)/.test(name)) return "strong";
      if (school.tier === "elite" || school.tier === "high") return "moderate";
      return "weak";
    case "business":
      if (school.tier === "elite" || school.tier === "high") return "strong";
      return "moderate";
    case "liberal-arts": {
      const collegeNamed = /^[^,]*\bCollege\b/.test(name);
      if (school.private && school.division === "D3" && collegeNamed) return "strong";
      if (school.private && (school.tier === "elite" || school.tier === "high")) return "strong";
      if (school.private && school.tier === "mid") return "moderate";
      return "weak";
    }
    case "pre-med":
      if (school.tier === "elite") return "strong";
      if (school.tier === "high") return "moderate";
      return "weak";
    case "arts":
      if (/(Conservatory|School of (the )?Arts|Art Institute)/i.test(name)) return "strong";
      if (school.private && school.tier !== "accessible") return "moderate";
      return "weak";
    default:
      return "moderate";
  }
}

// ---------- Layer 2: Hard filtering ----------

function hardFilterReason(profile: AthleteProfile, school: School): string | null {
  const player = clubLevelScore[profile.clubLevel];
  const ts = testScoreOf(profile);

  // Athletic overreach
  if (school.tier === "elite" && player < 74) return "Elite programs need a national-level club profile";
  if (school.division === "D1" && school.tier !== "accessible" && player < 58) {
    return "Most D1 programs are a stretch from a local-only profile";
  }
  if (school.tier === "elite" && profile.gpa < 3.55) return "GPA below typical range for elite programs";
  if (school.tier === "elite" && ts !== null && ts < 1320) return "Test score below elite-program range";

  // Division restriction: user picked 1-2 divisions, school must match
  if (profile.preferredDivisions.length > 0 && profile.preferredDivisions.length < 3) {
    if (!profile.preferredDivisions.includes(school.division)) return "Outside preferred divisions";
  }

  // Region restriction: any picked regions become a hard filter
  if (profile.preferredRegions.length > 0) {
    if (!school.region || !profile.preferredRegions.includes(school.region)) return "Outside preferred regions";
  }

  // Athletic scholarship: NCAA D3 + Ivy League prohibit
  if (profile.financialAidPriority === "athletic") {
    if (school.division === "D3") return "NCAA D3 cannot offer athletic scholarships";
    if (school.conference === "The Ivy League") return "Ivy League does not offer athletic scholarships";
  }

  // Enrollment extremes (only when we have real numbers)
  if (typeof school.enrollment === "number") {
    if (profile.enrollmentPreference === "small" && school.enrollment > 20000) {
      return "Too large for small-campus preference";
    }
    if (profile.enrollmentPreference === "large" && school.enrollment < 2000) {
      return "Too small for large-campus preference";
    }
  }

  return null;
}

// ---------- Layer 3: Dimension scoring ----------
// Each returns an unrounded 0-100 float.

function athleticFitDim(profile: AthleteProfile, school: School): number {
  const player = playerLevel(profile);
  const demand = divisionDemand[school.division][school.tier];
  const gap = player - demand;
  // Curve: at demand → 80; sweet spot +6 → 88 (peak); overqualified declines
  // because the athlete would be underutilized. Below demand drops steeply.
  let base: number;
  if (gap < -15) base = 55 + (gap + 15) * 2.8;
  else if (gap < 0) base = 80 + gap * 1.67;
  else if (gap <= 6) base = 80 + gap * 1.33;
  else if (gap <= 16) base = 88 - (gap - 6) * 0.5;
  else base = 83 - (gap - 16) * 0.8;
  // Roster realism: high international intake at a level the athlete cannot reach
  if (school.internationalPercentage >= 35 && player < 74) base -= 6;
  else if (school.internationalPercentage >= 25 && player < 58) base -= 4;
  return clamp(base);
}

function academicFitDim(profile: AthleteProfile, school: School): number {
  // At parity → 80; comfortably above → 90+ (academic safety); below → drops steeply.
  const gpaGap = profile.gpa - school.avgGPA;
  let gpaPart: number;
  if (gpaGap >= 0) gpaPart = 80 + Math.min(gpaGap * 30, 12);
  else if (gpaGap >= -0.4) gpaPart = 80 + gpaGap * 50;
  else gpaPart = 60 + (gpaGap + 0.4) * 45;

  const ts = testScoreOf(profile);
  let testPart: number;
  if (ts === null) {
    testPart = 65;
  } else {
    const testGap = ts - school.avgSAT;
    if (testGap >= 0) testPart = 80 + Math.min(testGap / 25, 12);
    else if (testGap >= -150) testPart = 80 + (testGap / 150) * 25;
    else testPart = 55 + ((testGap + 150) / 100) * 20;
  }
  return clamp(gpaPart * 0.55 + testPart * 0.45);
}

function campusFitDim(profile: AthleteProfile, school: School): number {
  // Lower neutral baselines so explicit preferences create a real spread.
  let enrollPart: number;
  if (!profile.enrollmentPreference || profile.enrollmentPreference === "any") {
    enrollPart = 65;
  } else {
    const band = enrollmentBand(school);
    if (band === profile.enrollmentPreference) enrollPart = 95;
    else if (
      (profile.enrollmentPreference === "small" && band === "large") ||
      (profile.enrollmentPreference === "large" && band === "small")
    ) {
      enrollPart = 30;
    } else {
      enrollPart = 55;
    }
  }
  const regionPart = profile.preferredRegions.length === 0 ? 65 : 92;
  const divisionPart = profile.preferredDivisions.length === 3 ? 65 : 92;

  const strength = areaStrength(school, profile.areaOfStudy);
  const areaPart = strength === "strong" ? 95 : strength === "moderate" ? 65 : 38;

  return clamp(enrollPart * 0.35 + regionPart * 0.2 + divisionPart * 0.15 + areaPart * 0.3);
}

function financialFitDim(profile: AthleteProfile, school: School): number {
  const priority = profile.financialAidPriority;
  if (!priority || priority === "none") return 65;
  switch (priority) {
    case "athletic":
      // D3/Ivy already hard-filtered
      if (school.division === "D1") return 92;
      if (school.division === "D2") return 75;
      return 55;
    case "need-based":
      if (school.private && school.tier === "elite") return 92;
      if (school.private && school.tier === "high") return 82;
      if (school.private && school.tier === "mid") return 68;
      if (school.tier === "elite" || school.tier === "high") return 55;
      return 40;
    case "academic-merit":
      if (school.tier === "elite") return 30; // top elites typically don't offer merit-only aid
      if (school.private && (school.tier === "high" || school.tier === "mid")) return 90;
      if (school.tier === "high") return 72;
      if (school.tier === "mid") return 68;
      return 55;
  }
}

// ---------- Layer 4: Composite + drag ----------

function dragPenalty(d: ScoreBreakdown): number {
  let p = 0;
  if (d.athleticFit < 60) p += (60 - d.athleticFit) * 0.5;
  if (d.academicFit < 55) p += (55 - d.academicFit) * 0.4;
  if (d.campusFit < 45) p += (45 - d.campusFit) * 0.35;
  if (d.financialFit < 45) p += (45 - d.financialFit) * 0.3;
  return p;
}

function composite(d: ScoreBreakdown): number {
  const weighted = d.athleticFit * 0.42 + d.academicFit * 0.25 + d.campusFit * 0.18 + d.financialFit * 0.15;
  return clamp(weighted - dragPenalty(d));
}

function fitLabelFor(score: number): MatchResult["fitLabel"] {
  if (score >= 88) return "Strong fit";
  if (score >= 78) return "Target";
  if (score >= 68) return "Reach";
  if (score >= 60) return "Long shot";
  return "Stretch";
}

// ---------- Explanations ----------
// Each reason references a specific user choice when one drove the match.

function explanationsFor(profile: AthleteProfile, school: School, dims: ScoreBreakdown): string[] {
  const out: string[] = [];

  // Athletic
  if (dims.athleticFit >= 88) out.push("Athletic level aligns well with program demand");
  else if (dims.athleticFit >= 72) out.push("Athletic profile is in range");
  else if (dims.athleticFit < 60) out.push("Athletic fit is a stretch");

  // Academic
  if (dims.academicFit >= 85) {
    const ts = testScoreOf(profile);
    if (ts !== null) out.push(`Academic profile near ${school.avgSAT} SAT / ${school.avgGPA.toFixed(2)} GPA range`);
    else out.push(`GPA in range for ${school.avgGPA.toFixed(2)} average`);
  } else if (dims.academicFit < 60) {
    out.push("Academics are a reach");
  }

  // Enrollment preference
  if (profile.enrollmentPreference && profile.enrollmentPreference !== "any") {
    if (enrollmentBand(school) === profile.enrollmentPreference) {
      const real = school.enrollment;
      const detail = typeof real === "number" ? ` (~${real.toLocaleString()} students)` : "";
      out.push(`Matches your ${profile.enrollmentPreference}-campus preference${detail}`);
    }
  }

  // Area of study (strong signal only)
  if (profile.areaOfStudy && profile.areaOfStudy !== "undecided") {
    const strength = areaStrength(school, profile.areaOfStudy);
    if (strength === "strong") {
      const label =
        profile.areaOfStudy === "stem"
          ? "STEM"
          : profile.areaOfStudy === "liberal-arts"
            ? "liberal arts"
            : profile.areaOfStudy === "pre-med"
              ? "pre-med"
              : profile.areaOfStudy;
      out.push(`Strong ${label} offerings for your interest`);
    }
  }

  // Financial aid
  if (profile.financialAidPriority === "athletic" && school.division !== "D3") {
    out.push(`${school.division} athletic scholarship opportunity`);
  } else if (
    profile.financialAidPriority === "need-based" &&
    school.private &&
    (school.tier === "elite" || school.tier === "high")
  ) {
    out.push("Strong institutional need-based aid");
  } else if (profile.financialAidPriority === "academic-merit" && school.private && school.tier !== "elite") {
    out.push("Merit aid commonly offered here");
  }

  // Explicit region / division pref
  if (school.region && profile.preferredRegions.includes(school.region)) {
    out.push(`${school.region} region match`);
  }
  if (profile.preferredDivisions.length < 3 && profile.preferredDivisions.includes(school.division)) {
    out.push(`${school.division} program`);
  }

  if (school.hbcu) out.push("HBCU");

  return out.slice(0, 4);
}

// ---------- Layer 5: Diversity rerank ----------
// Greedy MMR-style pass. After each pick we add a penalty to remaining candidates
// that share its conference (-4 each) or (division, tier) bin (-1.5 each). The
// adjusted score chooses the next pick. Fully deterministic.

type RankedMatch = MatchResult & { _precise: number };

function diversityRerank(ranked: RankedMatch[], max: number): RankedMatch[] {
  const final: RankedMatch[] = [];
  const seenConf = new Map<string, number>();
  const seenBin = new Map<string, number>();
  const remaining = ranked.slice();

  while (final.length < max && remaining.length > 0) {
    let bestIdx = 0;
    let bestAdj = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      const confCount = seenConf.get(c.conference) ?? 0;
      const binCount = seenBin.get(`${c.division}/${c.tier}`) ?? 0;
      const adj = c._precise - (confCount * 4 + binCount * 1.5);
      if (adj > bestAdj) {
        bestAdj = adj;
        bestIdx = i;
      }
    }
    const [picked] = remaining.splice(bestIdx, 1);
    final.push(picked);
    seenConf.set(picked.conference, (seenConf.get(picked.conference) ?? 0) + 1);
    seenBin.set(`${picked.division}/${picked.tier}`, (seenBin.get(`${picked.division}/${picked.tier}`) ?? 0) + 1);
  }
  return final;
}

// ---------- Public API ----------

export function calculateMatches(profile: AthleteProfile, gender: Gender = "mens"): MatchResult[] {
  const eligible = (schools as School[]).filter((s) => (gender === "mens" ? s.hasMensSoccer : s.hasWomensSoccer));

  const ranked: RankedMatch[] = [];

  for (const school of eligible) {
    if (hardFilterReason(profile, school)) continue;

    const dims: ScoreBreakdown = {
      athleticFit: athleticFitDim(profile, school),
      academicFit: academicFitDim(profile, school),
      campusFit: campusFitDim(profile, school),
      financialFit: financialFitDim(profile, school),
    };

    const precise = composite(dims);
    const matchScore = Math.round(precise);
    if (matchScore < MIN_MATCH_SCORE) continue;

    ranked.push({
      ...school,
      matchScore,
      reasons: explanationsFor(profile, school, dims),
      fitLabel: fitLabelFor(matchScore),
      scoreBreakdown: {
        athleticFit: Math.round(dims.athleticFit),
        academicFit: Math.round(dims.academicFit),
        campusFit: Math.round(dims.campusFit),
        financialFit: Math.round(dims.financialFit),
      },
      _precise: precise,
    });
  }

  ranked.sort((a, b) => {
    if (b._precise !== a._precise) return b._precise - a._precise;
    return a.name.localeCompare(b.name);
  });

  const diversified = diversityRerank(ranked, MAX_RESULTS);
  return diversified.map(({ _precise, ...rest }) => rest);
}

export function filterByThreshold(matches: MatchResult[], threshold = MIN_MATCH_SCORE): MatchResult[] {
  return matches.filter((m) => m.matchScore >= threshold);
}
