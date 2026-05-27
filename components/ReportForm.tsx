"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

const COURSE_RIGOR = ["Standard", "Honors", "Some AP/Advanced", "Heavy AP/Advanced"];
const AGE_GROUPS = ["U14", "U15", "U16", "U17", "U18", "U19", "U23", "Other"];
const GRAD_YEARS = ["2025", "2026", "2027", "2028", "2029"];
const LEAGUES = ["ECNL", "MLS Next", "ECRL", "Elite Academies", "Regional League", "Other"];
const STATEMENT_WORD_LIMIT = 500;

function countWords(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

export default function ReportForm({
  sessionId,
  userEmail,
}: {
  sessionId: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Synchronous lock — React state updates are async, so a rapid double-click
  // could fire handleSubmit twice before `submitting` propagates to the
  // disabled prop. The ref short-circuits the second call.
  const submittingRef = useRef(false);

  const [gpa, setGpa] = useState("");
  const [courseRigor, setCourseRigor] = useState(COURSE_RIGOR[0]);
  const [satScore, setSatScore] = useState("");
  const [actScore, setActScore] = useState("");
  const [position, setPosition] = useState("");
  const [clubTeam, setClubTeam] = useState("");
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[3]);
  const [graduationYear, setGraduationYear] = useState(GRAD_YEARS[1]);
  const [league, setLeague] = useState(LEAGUES[0]);
  const [schoolsInContact, setSchoolsInContact] = useState("");
  const [filmLink, setFilmLink] = useState("");
  const [personalStatement, setPersonalStatement] = useState("");

  const wordCount = useMemo(() => countWords(personalStatement), [personalStatement]);
  const overLimit = wordCount > STATEMENT_WORD_LIMIT;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submittingRef.current) return;
    if (overLimit) {
      setError(`Personal statement is ${wordCount} words; limit is ${STATEMENT_WORD_LIMIT}.`);
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const payload = {
      sessionId,
      gpa,
      courseRigor,
      satScore: satScore || undefined,
      actScore: actScore || undefined,
      position,
      clubTeam,
      ageGroup,
      graduationYear,
      league,
      schoolsInContact: schoolsInContact || undefined,
      filmLink,
      personalStatement,
    };

    try {
      const res = await fetch("/api/submit-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Submission failed (${res.status})`);
      }
      router.push(`/report/success?email=${encodeURIComponent(userEmail)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <section className="panel p-5">
        <h2 className="mb-4 text-xl font-black">Academics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="GPA" required>
            <input
              className="field"
              type="number"
              step="0.01"
              min="0"
              max="4.5"
              value={gpa}
              onChange={(e) => setGpa(e.target.value)}
              required
            />
          </Field>
          <Field label="Course rigor" required>
            <select className="field" value={courseRigor} onChange={(e) => setCourseRigor(e.target.value)}>
              {COURSE_RIGOR.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="SAT score (optional)">
            <input
              className="field"
              type="number"
              min="400"
              max="1600"
              value={satScore}
              onChange={(e) => setSatScore(e.target.value)}
            />
          </Field>
          <Field label="ACT score (optional)">
            <input
              className="field"
              type="number"
              min="1"
              max="36"
              value={actScore}
              onChange={(e) => setActScore(e.target.value)}
            />
          </Field>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-xl font-black">Soccer profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Position" required>
            <input
              className="field"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              required
            />
          </Field>
          <Field label="Club team" required>
            <input
              className="field"
              type="text"
              value={clubTeam}
              onChange={(e) => setClubTeam(e.target.value)}
              required
            />
          </Field>
          <Field label="Age group" required>
            <select className="field" value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
              {AGE_GROUPS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Graduation year" required>
            <select
              className="field"
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value)}
            >
              {GRAD_YEARS.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="League" required>
            <select className="field" value={league} onChange={(e) => setLeague(e.target.value)}>
              {LEAGUES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="Film link (Hudl, YouTube, Veo)" required>
            <input
              className="field"
              type="url"
              placeholder="https://"
              value={filmLink}
              onChange={(e) => setFilmLink(e.target.value)}
              required
            />
          </Field>
        </div>
      </section>

      <section className="panel p-5">
        <h2 className="mb-4 text-xl font-black">Context</h2>
        <div className="grid gap-4">
          <Field label="Schools currently in contact with (optional)">
            <textarea
              className="field"
              rows={3}
              value={schoolsInContact}
              onChange={(e) => setSchoolsInContact(e.target.value)}
              placeholder="List any programs already recruiting you."
            />
          </Field>
          <Field label="Personal statement" required>
            <textarea
              className="field"
              rows={7}
              value={personalStatement}
              onChange={(e) => setPersonalStatement(e.target.value)}
              placeholder="Your goals, schools you're interested in, anything else we should know."
              required
            />
            <div
              className={`mt-2 text-xs font-bold ${overLimit ? "text-[var(--red)]" : "text-[var(--muted)]"}`}
            >
              {wordCount} / {STATEMENT_WORD_LIMIT} words
            </div>
          </Field>
        </div>
      </section>

      {error && (
        <div className="panel border-[var(--red)] bg-[#f9e7e3] p-4 text-sm font-bold text-[var(--red)]">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || overLimit}
        className="button-primary inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit request"}
        {!submitting && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--muted)]">
        {label}
        {required && <span className="text-[var(--red)]"> *</span>}
      </span>
      {children}
    </label>
  );
}
