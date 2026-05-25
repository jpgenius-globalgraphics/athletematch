export const runtime = "edge";

import Link from "next/link";
import { ArrowRight, Database, GraduationCap, Map, ShieldCheck, Trophy } from "lucide-react";
import schools from "@/data/schools.json";

export default function Home() {
  const mens = schools.filter((school) => school.hasMensSoccer).length;
  const womens = schools.filter((school) => school.hasWomensSoccer).length;

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-2 font-black">
            <Trophy className="h-6 w-6 text-[var(--green)]" />
            AthleteMatch
          </div>
          <Link href="/match" className="button-primary inline-flex items-center gap-2">
            Start
            <ArrowRight className="h-4 w-4" />
          </Link>
        </nav>

        <section className="grid min-h-[72vh] gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="mb-4 text-sm font-black uppercase tracking-wide text-[var(--green)]">
              College soccer search
            </p>
            <h1 className="max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
              Find NCAA programs that fit the player, not just the dream list.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--muted)]">
              Compare schools by soccer level, academic range, division, region, and gender-specific program availability.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/match" className="button-primary inline-flex items-center justify-center gap-2">
                Build my list
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#database" className="button-secondary inline-flex items-center justify-center gap-2">
                View database
                <Database className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div id="database" className="panel p-5">
            <h2 className="mb-4 text-xl font-black">Database Snapshot</h2>
            <div className="grid gap-3">
              <Stat icon={<Database className="h-5 w-5" />} label="NCAA schools" value={schools.length} />
              <Stat icon={<Trophy className="h-5 w-5" />} label="Men's programs" value={mens} />
              <Stat icon={<ShieldCheck className="h-5 w-5" />} label="Women's programs" value={womens} />
              <Stat icon={<GraduationCap className="h-5 w-5" />} label="Divisions" value="D1, D2, D3" />
              <Stat icon={<Map className="h-5 w-5" />} label="Regions" value="National" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--line)] bg-[var(--surface-muted)] p-4">
      <div className="flex items-center gap-3 text-[var(--muted)]">
        {icon}
        <span className="font-bold">{label}</span>
      </div>
      <span className="font-black">{value}</span>
    </div>
  );
}
