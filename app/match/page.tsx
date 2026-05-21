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
    athleticLevel: "high",
    playingTime: "regular",
    clubLevel: "state",
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
            <h1 className="text-4xl font-bold mb-4">Your Matches</h1>
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
          <h1 className="text-4xl font-bold mb-2">Find Your Match</h1>
          <p className="text-gray-400">Answer a few questions about your academic and athletic profile</p>
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

          {/* Athletic Section */}
          <div className="glass rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="text-purple-500">⚽</span> Athletic Profile
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-3">Athletic Level <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {["elite", "high", "medium", "low"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setProfile({ ...profile, athleticLevel: level as any })}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        profile.athleticLevel === level
                          ? "gradient-primary text-white"
                          : "glass hover:bg-white/10"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Playing Time <span className="text-red-500">*</span></label>
                <div className="space-y-2">
                  {["90mins", "regular", "sometimes", "substitute", "reserve"].map((time) => (
                    <label key={time} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5">
                      <input
                        type="radio"
                        name="playingTime"
                        value={time}
                        checked={profile.playingTime === time}
                        onChange={(e) => setProfile({ ...profile, playingTime: e.target.value as any })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-medium">
                        {time === "90mins"
                          ? "90 mins every game"
                          : time === "regular"
                          ? "Regular starter"
                          : time === "sometimes"
                          ? "Sometimes starts"
                          : time === "substitute"
                          ? "Substitute"
                          : "Reserve player"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-3">Club Level <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {["national", "state", "regional", "local"].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setProfile({ ...profile, clubLevel: level as any })}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        profile.clubLevel === level
                          ? "gradient-primary text-white"
                          : "glass hover:bg-white/10"
                      }`}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
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
            {loading ? "Finding Matches..." : "Find My Matches"}
          </button>
        </form>
      </div>
    </div>
  );
}