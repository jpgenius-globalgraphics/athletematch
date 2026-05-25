#!/usr/bin/env python3
"""
Backfill data/schools.json with real per-school data from the U.S. Department of
Education's College Scorecard API.

Fields added per school (when found):
    enrollment   - undergraduate student body size (int)
    avgSAT       - latest reported average SAT (int)
    avgACT       - latest reported midpoint ACT (int)
    programs     - top program areas by % of degrees awarded (list[str])

Caveat: College Scorecard does not publish GPA. Existing `avgGPA` values in
schools.json are left untouched. If you want real per-school GPA you'll need
a different source (e.g., CommonApp data or scraping each school's CDS).

Usage:
    export COLLEGE_SCORECARD_API_KEY="your-key-here"
    python3 scripts/backfill_schools.py

Outputs (under data/):
    schools.backfilled.json     - new dataset; review then mv over schools.json
    unmatched-schools.log       - tab-separated list of schools that didn't match
    .backfill-checkpoint.json   - resume file; safe to delete after success

The script is resumable: if interrupted, re-run and it picks up from the
checkpoint. It paces requests politely and backs off on 429/5xx.
"""

import json
import logging
import os
import re
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

REPO_ROOT = Path(__file__).resolve().parent.parent
INPUT_PATH = REPO_ROOT / "data" / "schools.json"
OUTPUT_PATH = REPO_ROOT / "data" / "schools.backfilled.json"
UNMATCHED_LOG = REPO_ROOT / "data" / "unmatched-schools.log"
CHECKPOINT_PATH = REPO_ROOT / "data" / ".backfill-checkpoint.json"

API_BASE = "https://api.data.gov/ed/collegescorecard/v1/schools"
REQUEST_PACING_SECONDS = 0.05
CHECKPOINT_EVERY = 25
MIN_NAME_MATCH_RATIO = 0.6
TOP_PROGRAMS_N = 8
TOP_PROGRAMS_MIN_PCT = 0.02  # ignore programs that are <2% of degrees

# College Scorecard `program_percentage` CIP-2 keys → human labels.
CIP_LABELS = {
    "agriculture": "Agriculture",
    "natural_resources": "Natural Resources",
    "architecture": "Architecture",
    "ethnic_cultural_gender": "Ethnic & Cultural Studies",
    "communication": "Communication",
    "communications_technology": "Communications Tech",
    "computer": "Computer Science",
    "personal_culinary": "Personal & Culinary Services",
    "education": "Education",
    "engineering": "Engineering",
    "engineering_technology": "Engineering Technology",
    "language": "Languages",
    "family_consumer_science": "Family & Consumer Science",
    "legal": "Legal Studies",
    "english": "English",
    "humanities": "Humanities",
    "library": "Library Science",
    "biological": "Biological Sciences",
    "mathematics": "Mathematics",
    "military": "Military Science",
    "multidiscipline": "Multidisciplinary Studies",
    "parks_recreation_fitness": "Parks & Recreation",
    "philosophy_religious": "Philosophy & Religion",
    "theology_religious_vocation": "Theology",
    "physical_science": "Physical Sciences",
    "science_technology": "Science Technology",
    "psychology": "Psychology",
    "security_law_enforcement": "Security & Law Enforcement",
    "public_administration_social_service": "Public Administration",
    "social_science": "Social Sciences",
    "construction": "Construction",
    "mechanic_repair_technology": "Mechanical Repair",
    "precision_production": "Precision Production",
    "transportation": "Transportation",
    "visual_performing": "Visual & Performing Arts",
    "health": "Health Sciences",
    "business_marketing": "Business & Marketing",
    "history": "History",
}

logging.basicConfig(format="%(asctime)s  %(levelname)s  %(message)s", level=logging.INFO)
log = logging.getLogger("backfill")


def normalize_name(name: str) -> str:
    name = re.sub(r"\s*\([^)]*\)\s*$", "", name).strip()
    if name.lower().startswith("the "):
        name = name[4:]
    return name


def name_match_ratio(a: str, b: str) -> float:
    a, b = a.lower(), b.lower()
    if a == b:
        return 1.0
    if a in b or b in a:
        return min(len(a), len(b)) / max(len(a), len(b))
    a_tokens = set(re.findall(r"\w+", a))
    b_tokens = set(re.findall(r"\w+", b))
    if not a_tokens or not b_tokens:
        return 0.0
    return len(a_tokens & b_tokens) / len(a_tokens | b_tokens)


def api_request(params: Dict[str, Any], api_key: str, retries: int = 4) -> Optional[Dict[str, Any]]:
    params = {**params, "api_key": api_key}
    url = f"{API_BASE}?{urlencode(params)}"
    backoff = 2.0
    for _ in range(retries):
        try:
            req = Request(url, headers={"User-Agent": "athletematch-backfill"})
            with urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except HTTPError as exc:
            if exc.code == 429 or exc.code >= 500:
                log.warning("HTTP %d; sleeping %.1fs", exc.code, backoff)
                time.sleep(backoff)
                backoff *= 2
                continue
            if exc.code == 403:
                log.error("HTTP 403 — check that COLLEGE_SCORECARD_API_KEY is valid")
                return None
            log.warning("HTTP %d for %s", exc.code, params.get("school.name"))
            return None
        except URLError as exc:
            log.warning("network error %s; retrying", exc.reason)
            time.sleep(backoff)
            backoff *= 2
    return None


def search_school(name: str, state: Optional[str], api_key: str) -> Optional[Dict[str, Any]]:
    fields = ",".join([
        "id",
        "school.name",
        "school.state",
        "school.alias",
        "latest.student.size",
        "latest.admissions.sat_scores.average.overall",
        "latest.admissions.act_scores.midpoint.cumulative",
        "latest.academics.program_percentage",
    ])

    norm = normalize_name(name)
    queries = [norm]
    short = re.sub(r"\b(University|College)\b", "", norm).strip()
    if short and short != norm:
        queries.append(short)

    target_norm = norm.lower()
    for query in queries:
        params: Dict[str, Any] = {
            "school.name": query,
            "school.operating": 1,
            "fields": fields,
            "per_page": 10,
        }
        if state:
            params["school.state"] = state
        data = api_request(params, api_key)
        if not data:
            continue
        results = data.get("results") or []
        best = None
        best_score = 0.0
        for r in results:
            cand_name = (r.get("school.name") or "")
            score = name_match_ratio(target_norm, cand_name)
            if score > best_score:
                best_score, best = score, r
        if best and best_score >= MIN_NAME_MATCH_RATIO:
            return best
    return None


def top_programs(program_pct: Optional[Dict[str, float]]) -> List[str]:
    if not program_pct:
        return []
    items: List[tuple] = []
    for code, pct in program_pct.items():
        if pct is None or pct <= TOP_PROGRAMS_MIN_PCT:
            continue
        label = CIP_LABELS.get(code)
        if not label:
            continue
        items.append((label, pct))
    items.sort(key=lambda x: x[1], reverse=True)
    return [label for label, _ in items[:TOP_PROGRAMS_N]]


def merge_record(school: Dict[str, Any], api_data: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(school)
    enrollment = api_data.get("latest.student.size")
    sat = api_data.get("latest.admissions.sat_scores.average.overall")
    act = api_data.get("latest.admissions.act_scores.midpoint.cumulative")
    programs = top_programs(api_data.get("latest.academics.program_percentage"))

    if enrollment is not None:
        out["enrollment"] = int(enrollment)
    if sat is not None:
        out["avgSAT"] = int(round(sat))
    if act is not None:
        out["avgACT"] = int(round(act))
    if programs:
        out["programs"] = programs
    return out


def load_checkpoint() -> Dict[str, Dict[str, Any]]:
    if not CHECKPOINT_PATH.exists():
        return {}
    with CHECKPOINT_PATH.open() as f:
        return json.load(f)


def save_checkpoint(checkpoint: Dict[str, Dict[str, Any]]) -> None:
    tmp = CHECKPOINT_PATH.with_suffix(".tmp")
    with tmp.open("w") as f:
        json.dump(checkpoint, f)
    tmp.replace(CHECKPOINT_PATH)


def main() -> int:
    api_key = os.environ.get("COLLEGE_SCORECARD_API_KEY")
    if not api_key:
        log.error("Set COLLEGE_SCORECARD_API_KEY in your environment, e.g.:")
        log.error('    export COLLEGE_SCORECARD_API_KEY="your-key-here"')
        log.error("Get a free key at https://api.data.gov/signup/")
        return 1

    with INPUT_PATH.open() as f:
        schools: List[Dict[str, Any]] = json.load(f)
    log.info("loaded %d schools from %s", len(schools), INPUT_PATH.name)

    checkpoint = load_checkpoint()
    if checkpoint:
        log.info("resuming with %d schools already processed", len(checkpoint))

    matched = sum(1 for v in checkpoint.values() if v.get("matched"))
    for idx, school in enumerate(schools):
        key = str(school["id"])
        if key in checkpoint:
            continue
        log.info("[%4d/%d] %s", idx + 1, len(schools), school["name"])
        api_data = search_school(school["name"], school.get("state"), api_key)
        if api_data:
            checkpoint[key] = {"matched": True, "school": merge_record(school, api_data)}
            matched += 1
        else:
            checkpoint[key] = {"matched": False, "school": school}
        if (idx + 1) % CHECKPOINT_EVERY == 0:
            save_checkpoint(checkpoint)
        time.sleep(REQUEST_PACING_SECONDS)

    save_checkpoint(checkpoint)

    out_schools = [checkpoint[str(s["id"])]["school"] for s in schools]
    with OUTPUT_PATH.open("w") as f:
        json.dump(out_schools, f, indent=2)
    log.info("wrote %s", OUTPUT_PATH)

    unmatched = [v["school"] for v in checkpoint.values() if not v.get("matched")]
    with UNMATCHED_LOG.open("w") as f:
        f.write(f"# {len(unmatched)} unmatched of {len(schools)} ({100 * len(unmatched) / len(schools):.1f}%)\n")
        f.write("# id\tname\tstate\tdivision\n")
        for s in sorted(unmatched, key=lambda x: x["name"]):
            f.write(f"{s['id']}\t{s['name']}\t{s.get('state','')}\t{s['division']}\n")
    log.info("wrote %s (%d unmatched)", UNMATCHED_LOG, len(unmatched))
    log.info("matched %d/%d (%.1f%%)", matched, len(schools), 100 * matched / len(schools))
    return 0


if __name__ == "__main__":
    sys.exit(main())
