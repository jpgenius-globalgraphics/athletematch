"use client";

export const runtime = "edge";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, FileText, Filter, GraduationCap, Search, SlidersHorizontal, Trophy } from "lucide-react";
import { UserButton, useUser } from "@clerk/nextjs";
import ResultCard from "@/components/ResultCard";
import {
  calculateMatches,
  filterByThreshold,
  MAX_RESULTS,
  MIN_MATCH_SCORE,
  type AreaOfStudy,
  type AthleteProfile,
  type Division,
  type EnrollmentPreference,
  type FinancialAidPriority,
  type Gender,
  type MatchResult,
  type Region,
} from "@/lib/matchingEngine";

const DIVISIONS: Division[] = ["D1", "D2", "D3"];
const REGIONS: Region[] = ["Northeast", "Mid-Atlantic", "South", "Southwest", "Midwest", "West"];

const ENROLLMENT_OPTIONS: Array<{ value: EnrollmentPreference; label: string }> = [
  { value: "small", label: "Small (under 5k)" },
  { value: "medium", label: "Medium (5k–15k)" },
  { value: "large", label: "Large (15k+)" },
  { value: "any", label: "No preference" },
];

const AREA_OPTIONS: Array<{ value: AreaOfStudy; label: string }> = [
  { value: "stem", label: "STEM" },
  { value: "business", label: "Business" },
  { value: "liberal-arts", label: "Liberal Arts" },
  { value: "pre-med", label: "Pre-med" },
  { value: "arts", label: "Arts" },
  { value: "undecided", label: "Undecided" },
];

const AID_OPTIONS: Array<{ value: FinancialAidPriority; label: string }> = [
  { value: "athletic", label: "Athletic scholarship" },
  { value: "need-based", label: "Need-based aid" },
  { value: "academic-merit", label: "Academic merit" },
  { value: "none", label: "Not a priority" },
];

const CLUB_OPTIONS: Array<{ value: AthleteProfile["clubLevel"]; label: string; detail: string }> = [
  { value: "pro-academy", label: "Pro academy", detail: "MLS academy, NWSL academy, or equivalent" },
  { value: "mls-next-ecnl", label: "MLS Next or ECNL", detail: "Top national club environment" },
  { value: "national", label: "National platform", detail: "GA, ECNL RL, E64, national league" },
  { value: "regional", label: "Regional starter", detail: "Strong state or regional competition" },
  { value: "local", label: "Local club", detail: "High school plus local club soccer" },
];

const PLAYING_TIME: Array<{ value: AthleteProfile["playingTime"]; label: string }> = [
  { value: "impact", label: "Impact player" },
  { value: "starter", label: "Starter" },
  { value: "rotational", label: "Rotational player" },
  { value: "substitute", label: "Substitute" },
  { value: "developmental", label: "Developmental player" },
];

export default function MatchPage() {
  const { isSignedIn } = useUser();
  const [gender, setGender] = useState<Gender>("mens");
  const [threshold, setThreshold] = useState(MIN_MATCH_SCORE);
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [profile, setProfile] = useState<AthleteProfile>({
    gpa: 3.5,
    satScore: 1250,
    clubLevel: "mls-next-ecnl",
    playingTime: "starter",
    preferredDivisions: ["D1", "D2", "D3"],
    preferredRegions: [],
    enrollmentPreference: "any",
    areaOfStudy: "undecided",
    financialAidPriority: "none",
  });

  const shownResults = useMemo(
    () => (results ? filterByThreshold(results, threshold).slice(0, MAX_RESULTS) : []),
    [results, threshold]
  );

  const toggleDivision = (division: Division) => {
    const next = profile.preferredDivisions.includes(division)
      ? profile.preferredDivisions.filter((item) => item !== division)
      : [...profile.preferredDivisions, division];
    setProfile({ ...profile, preferredDivisions: next.length ? next : DIVISIONS });
  };

  const toggleRegion = (region: Region) => {
    const next = profile.preferredRegions.includes(region)
      ? profile.preferredRegions.filter((item) => item !== region)
      : [...profile.preferredRegions, region];
    setProfile({ ...profile, preferredRegions: next });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setResults(calculateMatches(profile, gender));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (results) {
    return (
      <main className="min-h-screen px-5 py-8 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <Link href="/match" onClick={() => setResults(null)} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)]">
                <ArrowLeft className="h-4 w-4" />
                Edit profile
              </Link>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">College soccer matches</h1>
              <p className="mt-2 max-w-2xl text-[var(--muted)]">
                Top {shownResults.length} {gender === "mens" ? "men's" : "women's"} programs (capped at {MAX_RESULTS}, minimum {MIN_MATCH_SCORE}% fit).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="panel flex flex-col gap-2 p-4 sm:min-w-[280px]">
                <label className="flex items-center gap-2 text-sm font-bold text-[var(--muted)]">
                  <SlidersHorizontal className="h-4 w-4" />
                  Minimum fit score: {threshold}
                </label>
                <input
                  type="range"
                  min={MIN_MATCH_SCORE}
                  max="95"
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                  className="w-full"
                />
              </div>
              {isSignedIn && <UserButton />}
            </div>
          </div>

          <div className="grid gap-4">
            {shownResults.map((school) => (
              <ResultCard key={`${school.id}-${gender}`} school={school} gender={gender} />
            ))}
          </div>

          {shownResults.length === 0 && (
            <div className="panel p-10 text-center">
              <p className="font-bold">No programs meet that score.</p>
              <p className="mt-2 text-sm text-[var(--muted)]">Lower the minimum fit score or broaden the division and region filters.</p>
            </div>
          )}

          <div className="panel mt-8 flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <FileText className="mt-1 h-5 w-5 text-[var(--green)]" />
              <div>
                <div className="font-bold">Want a human review of your profile?</div>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Our team writes a personalized recruiting report based on your film and academics.
                  Delivered within 48 hours. One-time $10.
                </p>
              </div>
            </div>
            <Link href="/report" className="button-primary inline-flex items-center gap-2 whitespace-nowrap">
              Get Your Full Recruiting Report
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--blue)]">
            <ArrowLeft className="h-4 w-4" />
            AthleteMatch
          </Link>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <UserButton />
            ) : (
              <Link href="/sign-in" className="text-sm font-bold text-[var(--blue)]">
                Sign in
              </Link>
            )}
          </div>
        </div>

        <div className="mb-8 grid gap-5 md:grid-cols-[1fr_360px] md:items-end">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--green)]">NCAA soccer fit tool</p>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight md:text-5xl">
              Build a college list that matches your player profile.
            </h1>
          </div>
          <div className="panel p-4 text-sm leading-6 text-[var(--muted)]">
            Database: 1,037 NCAA schools, separated by men&apos;s and women&apos;s soccer sponsorship.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <section className="panel p-5">
            <div className="mb-5 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-[var(--green)]" />
              <h2 className="text-xl font-black">Academic Profile</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--muted)]">GPA</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={profile.gpa}
                  onChange={(event) => setProfile({ ...profile, gpa: Number(event.target.value) })}
                  className="field"
                  required
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--muted)]">SAT</span>
                <input
                  type="number"
                  min="400"
                  max="1600"
                  value={profile.satScore || ""}
                  onChange={(event) => setProfile({ ...profile, satScore: event.target.value ? Number(event.target.value) : undefined })}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--muted)]">ACT</span>
                <input
                  type="number"
                  min="1"
                  max="36"
                  value={profile.actScore || ""}
                  onChange={(event) => setProfile({ ...profile, actScore: event.target.value ? Number(event.target.value) : undefined })}
                  className="field"
                />
              </label>
            </div>
          </section>

          <section className="panel p-5">
            <div className="mb-5 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-[var(--green)]" />
              <h2 className="text-xl font-black">Soccer Profile</h2>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setGender("mens")} className={`chip ${gender === "mens" ? "chip-active" : ""}`}>
                Men&apos;s soccer
              </button>
              <button type="button" onClick={() => setGender("womens")} className={`chip ${gender === "womens" ? "chip-active" : ""}`}>
                Women&apos;s soccer
              </button>
            </div>

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Club level</span>
                <select
                  value={profile.clubLevel}
                  onChange={(event) => setProfile({ ...profile, clubLevel: event.target.value as AthleteProfile["clubLevel"] })}
                  className="field"
                >
                  {CLUB_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-bold text-[var(--muted)]">Playing time</span>
                <select
                  value={profile.playingTime}
                  onChange={(event) => setProfile({ ...profile, playingTime: event.target.value as AthleteProfile["playingTime"] })}
                  className="field"
                >
                  {PLAYING_TIME.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="panel p-5 lg:col-span-2">
            <div className="mb-5 flex items-center gap-2">
              <Filter className="h-5 w-5 text-[var(--green)]" />
              <h2 className="text-xl font-black">List Preferences</h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--muted)]">Divisions</h3>
                <div className="flex flex-wrap gap-2">
                  {DIVISIONS.map((division) => (
                    <button
                      key={division}
                      type="button"
                      onClick={() => toggleDivision(division)}
                      className={`chip ${profile.preferredDivisions.includes(division) ? "chip-active" : ""}`}
                    >
                      {division}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--muted)]">Regions</h3>
                <div className="flex flex-wrap gap-2">
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => toggleRegion(region)}
                      className={`chip ${profile.preferredRegions.includes(region) ? "chip-active" : ""}`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--muted)]">Enrollment size</h3>
                <div className="flex flex-wrap gap-2">
                  {ENROLLMENT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProfile({ ...profile, enrollmentPreference: option.value })}
                      className={`chip ${profile.enrollmentPreference === option.value ? "chip-active" : ""}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--muted)]">Area of study</h3>
                <div className="flex flex-wrap gap-2">
                  {AREA_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProfile({ ...profile, areaOfStudy: option.value })}
                      className={`chip ${profile.areaOfStudy === option.value ? "chip-active" : ""}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold text-[var(--muted)]">Financial aid priority</h3>
                <div className="flex flex-wrap gap-2">
                  {AID_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProfile({ ...profile, financialAidPriority: option.value })}
                      className={`chip ${profile.financialAidPriority === option.value ? "chip-active" : ""}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <button type="submit" className="button-primary inline-flex items-center justify-center gap-2 lg:col-span-2">
            <Search className="h-4 w-4" />
            Run match
          </button>
        </form>
      </div>
    </main>
  );
}
