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
  // How much an athletic recruit's profile can sit below the school's
  // published academic averages and still be admissible. Driven mostly by
  // conference (Ivy/ACC/Big Ten → high; mid-major D1 → medium; D2/D3 and
  // STEM-elite exceptions like MIT/Caltech → low).
  athleticAdmissionsFlexibility: "high" | "medium" | "low";
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

export const MIN_MATCH_SCORE = 62;
export const MAX_RESULTS = 20;

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

// Lowered for D1 elite/high/mid: ECNL impact players are the realistic core
// recruiting pool for elite D1, not just pro-academy kids. Old D1 elite=94
// meant an 88-rated ECNL impact player was penalized into the 70s; the new
// 86 lets that profile peak in the 88-92 range, which matches how Ivy/ACC
// coaches actually evaluate.
const divisionDemand: Record<Division, Record<School["tier"], number>> = {
  D1: { elite: 86, high: 80, mid: 70, accessible: 68 },
  D2: { elite: 78, high: 72, mid: 62, accessible: 54 },
  D3: { elite: 76, high: 68, mid: 56, accessible: 46 },
};

// SAT floors per flexibility band for the elite-tier hard filter. Replaces
// the old single 1320 floor that locked legitimate Ivy recruits out.
const ELITE_SAT_FLOOR: Record<School["athleticAdmissionsFlexibility"], number> = {
  high: 1150,
  medium: 1200,
  low: 1320,
};

// Conference families used for the explanation layer. Names match the
// literal `conference` strings in schools.json.
const POWER_CONFERENCES = new Set([
  "Atlantic Coast Conference",
  "Big Ten Conference",
  "Southeastern Conference",
  "Big 12 Conference",
]);

const STRONG_ACADEMIC_CONFERENCES = new Set([
  "Patriot League",
  "West Coast Conference",
  "Atlantic 10 Conference",
]);

const IVY_CONFERENCE = "The Ivy League";

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
  if (school.tier === "elite" && ts !== null && ts < ELITE_SAT_FLOOR[school.athleticAdmissionsFlexibility]) {
    return "Test score below elite-program range";
  }

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
  // At demand → 85; sweet spot +6 → 92 (peak). An athlete who matches or
  // slightly exceeds program demand should score very well, reflecting how
  // coaches actually evaluate recruits. Overqualified declines slowly
  // (underutilization), underqualified drops faster.
  let base: number;
  if (gap >= 6) base = 92 - (gap - 6) * 0.5;
  else if (gap >= 0) base = 85 + (gap / 6) * 7;
  else if (gap >= -6) base = 85 + gap * 1.67; // 85 → 75 across -6
  else if (gap >= -15) base = 75 + (gap + 6) * 1.5; // 75 → 61.5 across -9
  else base = 61.5 + (gap + 15) * 2.8;
  // Overqualified far past sweet spot tapers harder
  if (gap > 16) base = 87 - (gap - 16) * 0.8;
  // Roster realism: high international intake at a level the athlete cannot reach
  if (school.internationalPercentage >= 35 && player < 74) base -= 6;
  else if (school.internationalPercentage >= 25 && player < 58) base -= 4;
  return clamp(base);
}

// Effective academic thresholds for an athletic recruit. Elite D1 programs
// regularly admit athletes 150-250 SAT / 0.3-0.5 GPA below their published
// average; the matching engine has to account for that or it filters out
// legitimately recruitable kids (the original bug).
const ACADEMIC_FLEX: Record<
  School["athleticAdmissionsFlexibility"],
  { satShift: number; gpaShift: number }
> = {
  high: { satShift: 250, gpaShift: 0.5 },
  medium: { satShift: 120, gpaShift: 0.3 },
  low: { satShift: 0, gpaShift: 0 },
};

function academicFitDim(profile: AthleteProfile, school: School): number {
  const { satShift, gpaShift } = ACADEMIC_FLEX[school.athleticAdmissionsFlexibility];
  const effectiveGPA = school.avgGPA - gpaShift;
  const effectiveSAT = school.avgSAT - satShift;

  // GPA curve relative to the effective threshold:
  //   parity → 80, +0.5 above → 92, -0.3 below → ~65, more than -0.5 → <60.
  const gpaGap = profile.gpa - effectiveGPA;
  let gpaPart: number;
  if (gpaGap >= 0) gpaPart = 80 + Math.min(gpaGap / 0.5, 1) * 12;
  else if (gpaGap >= -0.3) gpaPart = 80 + (gpaGap / 0.3) * 15;
  else if (gpaGap >= -0.5) gpaPart = 65 + ((gpaGap + 0.3) / 0.2) * 5;
  else gpaPart = 60 + (gpaGap + 0.5) * 30;

  // SAT curve relative to the effective threshold:
  //   parity → 80, +150 above → 92, -150 below → ~65, more than -150 → <60.
  const ts = testScoreOf(profile);
  let testPart: number;
  if (ts === null) {
    testPart = 65;
  } else {
    const testGap = ts - effectiveSAT;
    if (testGap >= 0) testPart = 80 + Math.min(testGap / 150, 1) * 12;
    else if (testGap >= -150) testPart = 65 + ((testGap + 150) / 150) * 15;
    else testPart = 60 + ((testGap + 150) / 100) * 10;
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
  // Athletic fit dominates because this is a recruiting tool, not a
  // general college search. Academic is the second axis because Ivy/elite
  // programs still need an admissible profile.
  const weighted = d.athleticFit * 0.45 + d.academicFit * 0.28 + d.campusFit * 0.15 + d.financialFit * 0.12;
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

  // Conference prestige signal
  if (school.conference === IVY_CONFERENCE) {
    out.push("Ivy League program — meets 100% of demonstrated financial need");
  } else if (POWER_CONFERENCES.has(school.conference)) {
    out.push("Power conference program");
  } else if (STRONG_ACADEMIC_CONFERENCES.has(school.conference)) {
    out.push("Strong academic conference");
  }

  // Athletic-admissions context — only surface when the athlete sits below
  // the school's published academic averages but the school has real
  // recruiting flexibility (Ivy/ACC/Big Ten/Patriot/etc.).
  if (school.athleticAdmissionsFlexibility === "high") {
    const ts = testScoreOf(profile);
    const belowAvg =
      profile.gpa < school.avgGPA || (ts !== null && ts < school.avgSAT);
    if (belowAvg) {
      out.push("Athletic admits typically reviewed separately from general admission");
    }
  }

  if (school.hbcu) out.push("HBCU");

  return out.slice(0, 5);
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
