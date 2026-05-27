import { calculateMatches, type AthleteProfile } from "../lib/matchingEngine";

const profile: AthleteProfile = {
  gpa: 3.9,
  satScore: 1380,
  clubLevel: "mls-next-ecnl",
  playingTime: "impact",
  preferredDivisions: ["D1"],
  preferredRegions: ["Northeast"],
  enrollmentPreference: "medium",
  areaOfStudy: "liberal-arts",
  financialAidPriority: "none",
};

console.log("Profile:");
console.log("  3.9 GPA / 1380 SAT, ECNL impact, D1 only, Northeast, medium, liberal-arts, no aid\n");

for (const gender of ["mens", "womens"] as const) {
  const matches = calculateMatches(profile, gender);
  console.log(`=== ${gender.toUpperCase()} (${matches.length} results) ===`);
  matches.forEach((m, i) => {
    const b = m.scoreBreakdown;
    console.log(
      `${(i + 1).toString().padStart(2)}. ${m.matchScore} ${m.name.padEnd(45)} ` +
        `${m.conference.padEnd(34)} ` +
        `[A${b.athleticFit} Ac${b.academicFit} C${b.campusFit} F${b.financialFit}]`,
    );
  });

  const watchlist = ["Brown University", "Yale University", "College of the Holy Cross"];
  console.log("\n  Watchlist:");
  for (const name of watchlist) {
    const idx = matches.findIndex((m) => m.name === name);
    if (idx === -1) console.log(`    ${name.padEnd(35)} NOT IN RESULTS`);
    else console.log(`    ${name.padEnd(35)} rank ${idx + 1} (score ${matches[idx]!.matchScore})`);
  }
  console.log();
}
