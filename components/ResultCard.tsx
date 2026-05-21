"use client";

import { MatchResult } from "@/lib/matchingEngine";
import { type Gender } from "@/lib/matchingEngine";
import { ChevronDown, ExternalLink } from "lucide-react";
import { useState } from "react";

interface ResultCardProps {
  school: MatchResult;
  gender: Gender;
}

export default function ResultCard({ school, gender }: ResultCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-400";
    if (score >= 75) return "text-blue-400";
    if (score >= 65) return "text-yellow-400";
    return "text-orange-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 85) return "bg-green-500/20 border-green-500/30";
    if (score >= 75) return "bg-blue-500/20 border-blue-500/30";
    if (score >= 65) return "bg-yellow-500/20 border-yellow-500/30";
    return "bg-orange-500/20 border-orange-500/30";
  };

  // Use the gender-specific URL if available, fall back to a Google search
  const programUrl =
    gender === "mens"
      ? school.mensUrl ??
        `https://www.google.com/search?q=${encodeURIComponent(school.name + " men's soccer")}`
      : school.womensUrl ??
        `https://www.google.com/search?q=${encodeURIComponent(school.name + " women's soccer")}`;

  const divisionBadgeColor =
    school.division === "D1"
      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
      : school.division === "D2"
      ? "bg-green-500/20 text-green-300 border-green-500/30"
      : "bg-purple-500/20 text-purple-300 border-purple-500/30";

  return (
    <div className="glass rounded-xl overflow-hidden hover:bg-white/10 transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-8 py-6 flex items-start justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <h3 className="text-2xl font-bold">{school.name}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${divisionBadgeColor}`}>
              {school.division}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-gray-300">
              {school.conference}
            </span>
          </div>
          <p className="text-gray-400 text-sm mb-3">{school.location}</p>

          <div className="flex flex-wrap gap-2 mb-3">
            {school.reasons.map((reason, i) => (
              <span key={i} className="text-xs bg-white/10 px-3 py-1 rounded-full text-gray-300">
                {reason}
              </span>
            ))}
          </div>

          <div className="text-sm text-gray-400">
            <span className="font-semibold text-blue-400">International: </span>
            {school.internationalPercentage}% of roster
          </div>
        </div>

        <div className="flex flex-col items-end gap-4 ml-4 shrink-0">
          <div
            className={`flex flex-col items-center p-4 rounded-lg border ${getScoreBg(
              school.matchScore
            )}`}
          >
            <span className="text-xs font-semibold text-gray-400 mb-1">Match</span>
            <span className={`text-3xl font-bold ${getScoreColor(school.matchScore)}`}>
              {school.matchScore}%
            </span>
            <span className="text-xs text-gray-300 mt-1">{school.athleticFit}</span>
          </div>
          <ChevronDown
            className={`w-5 h-5 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/10 px-8 py-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Academic Standards</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-400">Avg GPA:</span>{" "}
                  <span className="font-semibold">{school.avgGPA}</span>
                </p>
                <p>
                  <span className="text-gray-400">Avg SAT:</span>{" "}
                  <span className="font-semibold">{school.avgSAT}</span>
                </p>
                <p>
                  <span className="text-gray-400">Avg ACT:</span>{" "}
                  <span className="font-semibold">{school.avgACT}</span>
                </p>
                <p>
                  <span className="text-gray-400">Acceptance Rate:</span>{" "}
                  <span className="font-semibold">{school.acceptanceRate}%</span>
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-3">Program Details</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-gray-400">Tuition:</span>{" "}
                  <span className="font-semibold">{school.tuition}</span>
                </p>
                <p>
                  <span className="text-gray-400">Division:</span>{" "}
                  <span className="font-semibold">
                    {school.division} — {school.conference}
                  </span>
                </p>
                <p>
                  <span className="text-gray-400">International:</span>{" "}
                  <span className="font-semibold">{school.internationalPercentage}% of roster</span>
                </p>
                <p>
                  <span className="text-gray-400">Program:</span>{" "}
                  <span className="font-semibold">
                    {gender === "mens" ? "Men's Soccer" : "Women's Soccer"}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Program Notes</h4>
            <p className="text-sm text-gray-300">{school.notes}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <a
              href={programUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-all text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              {gender === "mens" ? "Men's Soccer Page" : "Women's Soccer Page"}
            </a>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(school.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all text-sm font-semibold"
            >
              <ExternalLink className="w-4 h-4" />
              Visit School
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
