"use client";

import { MatchResult, type Gender } from "@/lib/matchingEngine";
import { ChevronDown, ExternalLink, GraduationCap, MapPin, Percent, Trophy } from "lucide-react";
import { useState } from "react";

interface ResultCardProps {
  school: MatchResult;
  gender: Gender;
}

function scoreTone(score: number) {
  if (score >= 88) return "text-[var(--green)] bg-[#e7f1ea] border-[#b7d5c2]";
  if (score >= 78) return "text-[var(--blue)] bg-[#e8f0f5] border-[#b8cddd]";
  if (score >= 67) return "text-[var(--gold)] bg-[#fff4dc] border-[#ecd39e]";
  return "text-[var(--red)] bg-[#f9e7e3] border-[#e3b9b0]";
}

export default function ResultCard({ school, gender }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);
  const programUrl = gender === "mens" ? school.mensUrl : school.womensUrl;
  const programLabel = gender === "mens" ? "Men's program" : "Women's program";

  return (
    <article className="panel overflow-hidden">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="grid w-full gap-5 p-5 text-left md:grid-cols-[1fr_auto] md:items-start"
        aria-expanded={expanded}
      >
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-bold leading-tight">{school.name}</h3>
            <span className="rounded-full border border-[var(--line)] bg-[var(--surface-muted)] px-2.5 py-1 text-xs font-bold text-[var(--muted)]">
              {school.division}
            </span>
            <span className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--muted)]">
              {school.tier}
            </span>
          </div>

          <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {school.location}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-4 w-4" />
              {school.conference}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {school.reasons.map((reason) => (
              <span key={reason} className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
                {reason}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
          <div className={`min-w-[96px] rounded-lg border px-4 py-3 text-center ${scoreTone(school.matchScore)}`}>
            <div className="text-xs font-bold uppercase tracking-wide">Fit</div>
            <div className="text-3xl font-black leading-none">{school.matchScore}</div>
            <div className="mt-1 text-xs font-bold">{school.fitLabel}</div>
          </div>
          <ChevronDown className={`h-5 w-5 text-[var(--muted)] transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--line)] p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric icon={<Trophy className="h-4 w-4" />} label="Athletic" value={school.scoreBreakdown.athleticFit} />
            <Metric icon={<GraduationCap className="h-4 w-4" />} label="Academic" value={school.scoreBreakdown.academicFit} />
            <Metric icon={<MapPin className="h-4 w-4" />} label="Campus" value={school.scoreBreakdown.campusFit} />
            <Metric icon={<Percent className="h-4 w-4" />} label="Financial" value={school.scoreBreakdown.financialFit} />
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-bold text-[var(--muted)]">Admissions Range</h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <Info label="Avg GPA" value={school.avgGPA} />
                <Info label="Avg SAT" value={school.avgSAT} />
                <Info label="Avg ACT" value={school.avgACT} />
                <Info label="Acceptance" value={`${school.acceptanceRate}%`} />
              </dl>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-bold text-[var(--muted)]">Program</h4>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <Info label="Roster" value={`${school.internationalPercentage}% estimated international`} />
                <Info label="Cost" value={school.tuition} />
                <Info label="Source" value={school.source || "School database"} />
              </dl>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-[var(--muted)]">{school.notes}</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {programUrl && (
              <a href={programUrl} target="_blank" rel="noopener noreferrer" className="button-primary inline-flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                {programLabel}
              </a>
            )}
            {school.schoolUrl && (
              <a href={school.schoolUrl} target="_blank" rel="noopener noreferrer" className="button-secondary inline-flex items-center justify-center gap-2">
                <ExternalLink className="h-4 w-4" />
                School site
              </a>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
        {icon}
        {label}
      </div>
      <div className="text-2xl font-black">{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-[var(--line)] bg-white p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}
