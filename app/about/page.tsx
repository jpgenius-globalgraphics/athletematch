export const runtime = "edge";

import Link from "next/link";
import { Trophy, ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | PitchPath",
  description: "PitchPath was built by a committed D1 soccer player who lived the recruiting process firsthand.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">

        {/* Nav */}
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black">
            <Trophy className="h-6 w-6 text-[var(--green)]" />
            PitchPath
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm font-bold text-[var(--blue)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </nav>

        {/* Mission */}
        <section className="mb-16">
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--green)]">
            Our mission
          </p>
          <h1 className="mb-6 text-4xl font-black tracking-tight md:text-5xl">
            Every athlete deserves a fair shot at finding the right fit.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
            The college recruiting process is confusing, opaque, and often unfair to athletes
            who do not have the right connections or resources. PitchPath exists to change that.
            We give every student-athlete the tools and personalized guidance to find programs
            where they can actually succeed, both on the field and in the classroom.
          </p>
        </section>

        <hr className="mb-16 border-[var(--border)]" />

        {/* About the creator */}
        <section className="mb-16">
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--green)]">
            About the creator
          </p>
          <h2 className="mb-2 text-2xl font-black tracking-tight">John Skiermont</h2>
          <p className="mb-8 text-sm font-bold text-[var(--muted)]">Founder & Chief Reviewer</p>

          <div className="flex max-w-2xl flex-col gap-5 text-[var(--muted)] leading-8">
            <p>
              I built PitchPath because I lived the recruiting process firsthand. As a player
              committed to play Division 1 soccer at Brown University, I know exactly how
              stressful and uncertain recruiting can be. The late nights researching programs,
              the anxiety of not knowing if you are aiming at the right schools, the feeling
              that everyone else seems to have a clearer path than you do.
            </p>
            <p>
              Most recruiting tools give you a list of schools and leave you to figure out
              the rest. PitchPath is different. The matching tool narrows down 1,037 NCAA
              programs to the ones that actually fit your academic profile, athletic level,
              and personal priorities. And when you want a real human perspective, our team
              reviews your film, your profile, and your goals and delivers a report that tells
              you exactly where you stand and which programs to target.
            </p>
          </div>
        </section>

        <hr className="mb-16 border-[var(--border)]" />

        {/* CTA */}
        <section className="mb-8">
          <div className="panel p-8 md:p-10">
            <h3 className="mb-3 text-2xl font-black tracking-tight">
              Ready to find your fit?
            </h3>
            <p className="mb-6 max-w-lg text-[var(--muted)] leading-7">
              Start with the free matching tool, or get a full personalized report
              reviewed by someone who has been through the process.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/report" className="button-primary inline-flex items-center gap-2">
                Get a report
              </Link>
              <Link href="/match" className="button-secondary inline-flex items-center gap-2">
                Build my list
              </Link>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
