"use client";

import { useState } from "react";
import { calculateMatches, filterByThreshold, type AthleteProfile, type MatchResult } from "@/lib/matchingEngine";
import ResultCard from "@/components/ResultCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function MatchPage() {
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<AthleteProfile>({
    gpa: 3.5,
    satScore: 1200,
    clubLevel: "mls-next-club",
    playingTime: "regular",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      const matches = calculateMatches(profile);
      const filtered = filterByThreshold(matches, 50);
      setResults(filtered);
      setLoading(false);
    }, 500);
  };

  if (results) {
    return (
      <div className="min-h-screen bg-black pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8"
          >
            <ArrowLeft className="w-5 h-5" /> Back to Home
          </Link>

          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">Your College Soccer Matches</h1>
            <p className="text-gray-400 mb-6">
              Found <span className="text-blue-400 font-semibold">{results.length}</span> schools that match your profile
            </p>
            <button
              onClick={() => setResults(null)}
              className="px-6 py-2 rounded-lg border border-blue-500 text-blue-400 hover:bg-blue-500/10 transition-all"
            >
              Search Again
            </button>
          </div>

          <div className="grid gap-6">
            {results.map((school) => (
              <ResultCard key={school.id} school={school} />
            ))}
          </div>

          {results.length === 0 && (
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg">No matches found. Try adjusting your profile.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pt-32 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <Link href="/" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-8">
          <ArrowLeft className="w-5 h-5" /> Back to Home
        </Link>

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Find Your College Soccer Match</h1>
          <p className="text-gray-400">Answer a few questions about your academic and soccer profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Academic Section */}
          <div className="glass rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-blue-500">📚</span> Academic Profile
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  GPA <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  value={profile.gpa}
                  onChange={(e) => setProfile({ ...profile, gpa: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 outline-none transition-colors"
                  placeholder="3.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">SAT Score (optional)</label>
                  <input
                    type="number"
                    min="400"
                    max="1600"
                    value={profile.satScore || ""}
                    onChange={(e) => setProfile({ ...profile, satScore: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 outline-none transition-colors"
                    placeholder="1200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">ACT Score (optional)</label>
                  <input
                    type="number"
                    min="1"
                    max="36"
                    value={profile.actScore || ""}
                    onChange={(e) => setProfile({ ...profile, actScore: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 focus:border-blue-500 outline-none transition-colors"
                    placeholder="33"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Soccer Profile Section */}
          <div className="glass rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-green-500">⚽</span> Soccer Profile
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3">Club Level <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: "mls-next-academy", label: "MLS Next Academy", desc: "Elite level - MLS pathway" },
                    { value: "mls-next-club", label: "MLS Next Club / Top ECNL", desc: "Very competitive - national level" },
                    { value: "lower-ecnl", label: "Lower ECNL / Top ECRL", desc: "Competitive regional level" },
                    { value: "ea-usys", label: "EA / E64 / USYS", desc: "Recreational to local competitive" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProfile({ ...profile, clubLevel: option.value as any })}
                      className={`p-4 rounded-lg text-left transition-all ${
                        profile.clubLevel === option.value
                          ? "gradient-primary text-white ring-2 ring-blue-400"
                          : "glass hover:bg-white/10"
                      }`}
                    >
                      <div className="font-semibold">{option.label}</div>
                      <div className="text-xs text-gray-400 mt-1">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Playing Time <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {[
                    { value: "90mins", label: "90 mins every game" },
                    { value: "regular", label: "Regular starter" },
                    { value: "sometimes", label: "Sometimes starts" },
                    { value: "substitute", label: "Substitute" },
                    { value: "reserve", label: "Reserve player" },
                  ].map((option) => (
                    <label key={option.value} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                      <input
                        type="radio"
                        name="playingTime"
                        value={option.value}
                        checked={profile.playingTime === option.value}
                        onChange={(e) => setProfile({ ...profile, playingTime: e.target.value as any })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-4 rounded-lg gradient-primary text-white font-semibold hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50"
          >
            {loading ? "Finding Matches..." : "Find My College Matches"}
          </button>
        </form>
      </div>
    </div>
  );
}