import fs from "node:fs";
import path from "node:path";

const OUT = path.join(process.cwd(), "data", "schools.json");
const EXISTING = JSON.parse(fs.readFileSync(OUT, "utf8"));

const PROGRAMS = [
  { division: "I", label: "D1", sportCode: "MSO", gender: "mens" },
  { division: "I", label: "D1", sportCode: "WSO", gender: "womens" },
  { division: "II", label: "D2", sportCode: "MSO", gender: "mens" },
  { division: "II", label: "D2", sportCode: "WSO", gender: "womens" },
  { division: "III", label: "D3", sportCode: "MSO", gender: "mens" },
  { division: "III", label: "D3", sportCode: "WSO", gender: "womens" },
];

const STATE_REGIONS = {
  CT: "Northeast", ME: "Northeast", MA: "Northeast", NH: "Northeast", RI: "Northeast", VT: "Northeast",
  NJ: "Mid-Atlantic", NY: "Mid-Atlantic", PA: "Mid-Atlantic", DE: "Mid-Atlantic", MD: "Mid-Atlantic", DC: "Mid-Atlantic",
  AL: "South", AR: "South", FL: "South", GA: "South", KY: "South", LA: "South", MS: "South", NC: "South", SC: "South", TN: "South", VA: "South", WV: "South",
  IL: "Midwest", IN: "Midwest", IA: "Midwest", KS: "Midwest", MI: "Midwest", MN: "Midwest", MO: "Midwest", NE: "Midwest", ND: "Midwest", OH: "Midwest", SD: "Midwest", WI: "Midwest",
  AZ: "West", CA: "West", CO: "West", ID: "West", MT: "West", NV: "West", NM: "West", OR: "West", UT: "West", WA: "West", WY: "West",
  AK: "West", HI: "West", OK: "Southwest", TX: "Southwest",
};

const EXISTING_BY_NAME = new Map(
  EXISTING.map((school) => [normalizeName(school.name), school])
);

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/^the /, "")
    .replace(/university of /g, "")
    .replace(/ at /g, " ")
    .replace(/[^\w]+/g, " ")
    .trim();
}

function withProtocol(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : `https://${url}`;
}

function sportPath(athleticUrl, gender) {
  const base = withProtocol(athleticUrl);
  if (!base) return null;
  const clean = base.replace(/\/landing\/index\/?$/, "").replace(/\/$/, "");
  return `${clean}/sports/${gender === "mens" ? "mens" : "womens"}-soccer`;
}

function searchUrl(name, gender) {
  const label = gender === "mens" ? "men's soccer roster" : "women's soccer roster";
  return `https://www.google.com/search?q=${encodeURIComponent(`${name} ${label}`)}`;
}

function tierFor(row, division) {
  const name = row.nameOfficial;
  const conference = row.conferenceName || "";
  const eliteNames = [
    "Stanford", "Harvard", "Yale", "Princeton", "Dartmouth", "Brown", "Columbia", "Cornell",
    "University of Pennsylvania", "Duke", "North Carolina", "Virginia", "UCLA", "Notre Dame",
    "Georgetown", "Wake Forest", "Michigan", "Northwestern", "Amherst", "Williams", "Tufts",
    "Middlebury", "Bowdoin", "Johns Hopkins", "Chicago", "Emory", "Washington University",
  ];
  const highConferences = [
    "Atlantic Coast", "Big Ten", "Big 12", "Big East", "Ivy", "Southeastern", "West Coast",
    "New England Small College", "University Athletic Association", "Centennial", "Southern California Intercollegiate",
  ];

  if (eliteNames.some((item) => name.includes(item))) return "elite";
  if (highConferences.some((item) => conference.includes(item))) return "high";
  if (division === "D1") return row.privateFlag === "Y" ? "high" : "mid";
  if (division === "D2") return "mid";
  return row.privateFlag === "Y" ? "mid" : "accessible";
}

function academicDefaults(tier, division, isPrivate) {
  if (tier === "elite") return { avgGPA: 3.85, avgSAT: 1480, avgACT: 34, acceptanceRate: 9 };
  if (tier === "high") return { avgGPA: 3.65, avgSAT: 1340, avgACT: 30, acceptanceRate: 28 };
  if (tier === "mid") return { avgGPA: division === "D1" ? 3.35 : 3.25, avgSAT: division === "D1" ? 1210 : 1130, avgACT: division === "D1" ? 26 : 24, acceptanceRate: isPrivate ? 62 : 72 };
  return { avgGPA: 3.05, avgSAT: 1050, avgACT: 21, acceptanceRate: 82 };
}

function intlDefault(division, tier) {
  if (tier === "elite") return division === "D1" ? 22 : 14;
  if (division === "D2") return 24;
  if (division === "D1") return 16;
  return 10;
}

function notesFor(row, division, tier) {
  const type = row.private ? "private" : "public";
  const conference = row.conference || "independent";
  const soccerLevel = tier === "elite" ? "very selective" : tier === "high" ? "competitive" : tier === "mid" ? "realistic for a broad set of recruited players" : "more accessible";
  return `${division} ${type} program in the ${conference}. Recruiting fit is estimated from division, conference, school type, and academic selectivity.`;
}

async function fetchProgram({ division, sportCode }) {
  const url = `https://web3.ncaa.org/directory/api/directory/memberList?type=12&division=${division}&sportCode=${sportCode}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

const byOrg = new Map();

for (const program of PROGRAMS) {
  const rows = await fetchProgram(program);
  console.log(`${program.label} ${program.gender}: ${rows.length}`);

  for (const row of rows) {
    const existing = byOrg.get(row.orgId) || {
      ncaaOrgId: row.orgId,
      name: row.nameOfficial,
      state: row.memberOrgAddress?.state || "",
      division: program.label,
      conference: row.conferenceName || "Independent",
      sportRegion: row.sportRegion || null,
      schoolUrl: withProtocol(row.webSiteUrl),
      athleticUrl: withProtocol(row.athleticWebUrl),
      hasMensSoccer: false,
      hasWomensSoccer: false,
      mensUrl: null,
      womensUrl: null,
      private: row.privateFlag === "Y",
      hbcu: row.historicallyBlackFlag === "Y",
      source: "NCAA Directory 2026 sport sponsorship",
    };

    existing.division = program.label;
    existing.conference = row.conferenceName || existing.conference || "Independent";
    existing.state = row.memberOrgAddress?.state || existing.state || "";
    existing.sportRegion = row.sportRegion || existing.sportRegion;
    existing.athleticUrl = withProtocol(row.athleticWebUrl) || existing.athleticUrl;
    existing.schoolUrl = withProtocol(row.webSiteUrl) || existing.schoolUrl;

    if (program.gender === "mens") {
      existing.hasMensSoccer = true;
      existing.mensUrl = sportPath(row.athleticWebUrl, "mens") || searchUrl(row.nameOfficial, "mens");
    } else {
      existing.hasWomensSoccer = true;
      existing.womensUrl = sportPath(row.athleticWebUrl, "womens") || searchUrl(row.nameOfficial, "womens");
    }

    byOrg.set(row.orgId, existing);
  }
}

const generated = [...byOrg.values()]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((school, index) => {
    const prior = EXISTING_BY_NAME.get(normalizeName(school.name));
    const tier = prior?.tier || tierFor({
      nameOfficial: school.name,
      conferenceName: school.conference,
      privateFlag: school.private ? "Y" : "N",
    }, school.division);
    const academics = academicDefaults(tier, school.division, school.private);

    return {
      id: index + 1,
      ncaaOrgId: school.ncaaOrgId,
      name: school.name,
      location: prior?.location || `${school.state || "US"}${STATE_REGIONS[school.state] ? `, ${STATE_REGIONS[school.state]}` : ""}`,
      state: school.state,
      region: STATE_REGIONS[school.state] || "Other",
      avgGPA: prior?.avgGPA ?? academics.avgGPA,
      avgSAT: prior?.avgSAT ?? academics.avgSAT,
      avgACT: prior?.avgACT ?? academics.avgACT,
      division: school.division,
      conference: school.conference,
      hasMensSoccer: school.hasMensSoccer,
      hasWomensSoccer: school.hasWomensSoccer,
      mensUrl: prior?.mensUrl || school.mensUrl || null,
      womensUrl: prior?.womensUrl || school.womensUrl || null,
      schoolUrl: school.schoolUrl,
      athleticUrl: school.athleticUrl,
      acceptanceRate: prior?.acceptanceRate ?? academics.acceptanceRate,
      tuition: prior?.tuition || (school.private ? "Private school tuition varies by aid package" : "Public school tuition varies by residency"),
      internationalPercentage: prior?.internationalPercentage ?? intlDefault(school.division, tier),
      tier,
      private: school.private,
      hbcu: school.hbcu,
      sportRegion: school.sportRegion,
      source: school.source,
      notes: prior?.notes || notesFor(school, school.division, tier),
    };
  });

fs.writeFileSync(OUT, `${JSON.stringify(generated, null, 2)}\n`);
console.log(`Wrote ${generated.length} schools to ${OUT}`);
console.log({
  total: generated.length,
  mens: generated.filter((school) => school.hasMensSoccer).length,
  womens: generated.filter((school) => school.hasWomensSoccer).length,
  d1: generated.filter((school) => school.division === "D1").length,
  d2: generated.filter((school) => school.division === "D2").length,
  d3: generated.filter((school) => school.division === "D3").length,
});
