"use client";
export const runtime = 'edge';
import { useState } from "react";
import { calculateMatches, filterByThreshold, type AthleteProfile, type MatchResult } from "@/lib/matchingEngine";
import ResultCard from "@/components/ResultCard";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

type Gender = "mens" | "womens";

export default function MatchPage() {
  const [results, setResults] = useState<MatchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState<Gender>("mens");
  const [profile, setProfile] = useState<AthleteProfile>({
    gpa: 3.5,
    satScore: 1200,
    clubLevel: "mls-next-club",
    playingTime: "regular",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      const matches = calculateMatches(profile, gender);
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
            <div className="flex items-center gap-4 mb-4">
              <h1 className="text-4xl font-bold">Your College Soccer Matches</h1>
              <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                gender === "mens"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "bg-pink-500/20 text-pink-300 border border-pink-500/40"
              }`}>
                {gender === "mens" ? "⚽ Men's" : "⚽ Women's"}
              </span>
            </div>
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
              <ResultCard key={school.id} school={school} gender={gender} />
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

        <div className="mb-10">
          <h1 className="text-4xl font-bold mb-2">Find Your College Soccer Match</h1>
          <p className="text-gray-400">Answer a few questions about your academic and soccer profile</p>
        </div>

        {/* Gender Tab */}
        <div className="glass rounded-xl p-2 flex gap-2 mb-8">
          <button
            type="button"
            onClick={() => setGender("mens")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
              gender === "mens"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            ⚽ Men's Soccer
          </button>
          <button
            type="button"
            onClick={() => setGender("womens")}
            className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
              gender === "womens"
                ? "bg-pink-600 text-white shadow-lg shadow-pink-600/30"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
          >
            ⚽ Women's Soccer
          </button>
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
                    onChange={(e) =>
                      setProfile({ ...profile, satScore: e.target.value ? parseInt(e.target.value) : undefined })
                    }
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
                    onChange={(e) =>
                      setProfile({ ...profile, actScore: e.target.value ? parseInt(e.target.value) : undefined })
                    }
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
                <label className="block text-sm font-semibold mb-3">
                  Club Level <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: "mls-next-academy", label: "MLS Next Academy", desc: "Elite level — MLS pathway" },
                    { value: "mls-next-club", label: "MLS Next Club / Top ECNL", desc: "Very competitive — national level" },
                    { value: "lower-ecnl", label: "Lower ECNL / Top ECRL", desc: "Competitive regional level" },
                    { value: "ea-usys", label: "EA / E64 / USYS", desc: "Recreational to local competitive" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setProfile({ ...profile, clubLevel: option.value as AthleteProfile["clubLevel"] })}
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
                <label className="block text-sm font-semibold mb-3">
                  Playing Time <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {[
                    { value: "90mins", label: "90 mins every game" },
                    { value: "regular", label: "Regular starter" },
                    { value: "sometimes", label: "Sometimes starts" },
                    { value: "substitute", label: "Substitute" },
                    { value: "reserve", label: "Reserve player" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-white/5"
                    >
                      <input
                        type="radio"
                        name="playingTime"
                        value={option.value}
                        checked={profile.playingTime === option.value}
                        onChange={(e) =>
                          setProfile({ ...profile, playingTime: e.target.value as AthleteProfile["playingTime"] })
                        }
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
            className={`w-full px-8 py-4 rounded-lg text-white font-semibold transition-all disabled:opacity-50 ${
              gender === "mens"
                ? "bg-blue-600 hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/40"
                : "bg-pink-600 hover:bg-pink-500 hover:shadow-lg hover:shadow-pink-500/40"
            }`}
          >
            {loading
              ? "Finding Matches..."
              : `Find My ${gender === "mens" ? "Men's" : "Women's"} College Matches`}
          </button>
        </form>
      </div>
    </div>
  );
}
