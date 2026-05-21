"use client";

import { MatchResult } from "@/lib/matchingEngine";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface ResultCardProps {
  school: MatchResult;
}

export default function ResultCard({ school }: ResultCardProps) {
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

  return (
    <div className="glass rounded-xl overflow-hidden hover:bg-white/10 transition-all">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-8 py-6 flex items-start justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex-1 text-left">
          <div className="flex items-center gap-4 mb-3 flex-wrap">
            <h3 className="text-2xl font-bold">{school.name}</h3>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10">
              {school.division} - {school.conference}
            </span>
          </div>
          <p className="text-gray-400 mb-3">{school.location}</p>

          <div className="flex flex-wrap gap-3 mb-3">
            {school.reasons.map((reason, i) => (
              <span key={i} className="text-sm bg-white/10 px-3 py-1 rounded-full">
                {reason}
              </span>
            ))}
          </div>

          <div className="text-sm text-gray-400">
            <span className="font-semibold text-blue-400">International: </span>{school.internationalPercentage}%
          </div>
        </div>

        <div className="flex flex-col items-end gap-4">
          <div
            className={`flex flex-col items-center p-4 rounded-lg border ${
              getScoreBg(school.matchScore)
            }`}
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
                  <span className="font-semibold">{school.division} {school.conference}</span>
                </p>
                <p>
                  <span className="text-gray-400">International:</span>{" "}
                  <span className="font-semibold">{school.internationalPercentage}% of roster</span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-2">Program Notes</h4>
            <p className="text-sm text-gray-300">{school.notes}</p>
          </div>

          <div className="flex gap-3 pt-4">
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(
                school.name + " women's soccer"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 rounded-lg border border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-all text-sm font-semibold text-center"
            >
              Learn More
            </a>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(school.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2 rounded-lg gradient-primary text-white hover:shadow-lg hover:shadow-blue-500/50 transition-all text-sm font-semibold text-center"
            >
              Visit School
            </a>
          </div>
        </div>
      )}
    </div>
  );
}