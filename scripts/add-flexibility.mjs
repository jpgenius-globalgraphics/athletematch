import fs from "node:fs";
import path from "node:path";

// Migration: add `athleticAdmissionsFlexibility` to every school in
// data/schools.json. Maps real-world recruiting reality — elite D1
// programs admit athletes meaningfully below their published averages.
//
// Idempotent: re-running this overwrites the field with the same value.
//
// Rule order (first match wins):
//   1. Named "low" exceptions (e.g. MIT, Caltech) regardless of conference
//   2. Conference in HIGH_CONFERENCES → high
//   3. Conference in MEDIUM_CONFERENCES → medium
//   4. D1 fallback → medium (D1 mid-major default)
//   5. D2/D3 fallback → low

const OUT = path.join(process.cwd(), "data", "schools.json");

// Schools whose academic standards do not flex for athletic recruiting,
// regardless of conference. Match by case-insensitive substring on name.
const LOW_OVERRIDE_NAME_PATTERNS = [
  "Massachusetts Institute of Technology",
  "California Institute of Technology",
  "University of Chicago",
  "Harvey Mudd",
  "Olin College",
  "Franklin W. Olin",
];

// "High" flexibility: Ivies, power-five-ish D1, plus the strong-academic D1
// conferences the user named (Patriot, WCC, A-10, CAA).
const HIGH_CONFERENCES = new Set([
  "The Ivy League",
  "Atlantic Coast Conference",
  "Big Ten Conference",
  "Southeastern Conference",
  "Big 12 Conference",
  "West Coast Conference",
  "Patriot League",
  "Atlantic 10 Conference",
  "Coastal Athletic Association",
]);

// "Medium" flexibility: D1 mid-majors the user named explicitly.
const MEDIUM_CONFERENCES = new Set([
  "Big West Conference",
  "Mid-American Conference",
  "Sun Belt Conference",
  "Conference USA",
  "Mountain West Conference",
]);

function flexibilityFor(school) {
  const name = school.name || "";
  const lowName = LOW_OVERRIDE_NAME_PATTERNS.some((pat) =>
    name.toLowerCase().includes(pat.toLowerCase()),
  );
  if (lowName) return "low";

  const conf = school.conference || "";
  if (HIGH_CONFERENCES.has(conf)) return "high";
  if (MEDIUM_CONFERENCES.has(conf)) return "medium";

  // D2/D3 default → low. D1 default → medium (mid-major).
  if (school.division === "D2" || school.division === "D3") return "low";
  if (school.division === "D1") return "medium";
  return "low";
}

const schools = JSON.parse(fs.readFileSync(OUT, "utf8"));
const counts = { high: 0, medium: 0, low: 0 };
for (const school of schools) {
  school.athleticAdmissionsFlexibility = flexibilityFor(school);
  counts[school.athleticAdmissionsFlexibility]++;
}
fs.writeFileSync(OUT, JSON.stringify(schools, null, 2) + "\n");

console.log(`Updated ${schools.length} schools`);
console.log(`  high:   ${counts.high}`);
console.log(`  medium: ${counts.medium}`);
console.log(`  low:    ${counts.low}`);
