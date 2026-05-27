export const runtime = "edge";

import Link from "next/link";
import { ArrowRight, Clock, FileText, GraduationCap, Database, Map, ShieldCheck, Trophy, UserCheck } from "lucide-react";
import { Show, UserButton } from "@clerk/nextjs";
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
            PitchPath
          </div>
          <div className="flex items-center gap-3">
            <Show when="signed-out">
              <Link href="/sign-in" className="text-sm font-bold text-[var(--blue)]">
                Sign in
              </Link>
            </Show>
            <Link href="/about" className="text-sm font-bold text-[var(--muted)]">
              About
            </Link>
            <Link href="/report" className="button-primary inline-flex items-center gap-2">
              Get a Report
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
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
              <Link href="/report" className="button-primary inline-flex items-center justify-center gap-2">
                Get a custom report
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/match" className="button-secondary inline-flex items-center justify-center gap-2">
                Build my list
                <ArrowRight className="h-4 w-4" />
              </Link>
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

        <section id="report" className="mt-20 mb-12">
          <div className="mb-6">
            <p className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--green)]">
              Personalized recruiting report
            </p>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight md:text-4xl">
              Want a full breakdown?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-7 text-[var(--muted)]">
              Our team reviews your profile, film, and academic record and delivers a personalized
              recruiting report within 48 hours. One-time $10.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Item
              icon={<UserCheck className="h-5 w-5 text-[var(--green)]" />}
              title="Real human review"
              body="A reviewer reads your film and statement before writing."
            />
            <Item
              icon={<FileText className="h-5 w-5 text-[var(--green)]" />}
              title="PDF delivered to you"
              body="Full report with school list, fit notes, and next-step suggestions."
            />
            <Item
              icon={<Clock className="h-5 w-5 text-[var(--green)]" />}
              title="Within 48 hours"
              body="Submit today, get your report back within two business days."
            />
          </div>
          <div className="mt-6">
            <Link href="/report" className="button-primary inline-flex items-center gap-2">
              Get Your Full Recruiting Report
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function Item({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="panel p-5">
      <div className="mb-3">{icon}</div>
      <div className="font-bold">{title}</div>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
    </div>
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
