export const runtime = "edge";

import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Show, UserButton } from "@clerk/nextjs";
import { ArrowLeft, ArrowRight, Clock, FileText, Trophy, UserCheck } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  "already-submitted":
    "That payment has already been used to submit a report. If you have not received your PDF yet, please email us — do not pay again.",
  "session-lookup-failed":
    "We could not verify your payment. Please try again, or contact us if the charge already went through.",
};

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { userId } = await auth();
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] : undefined;

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black">
            <Trophy className="h-6 w-6 text-[var(--green)]" />
            PitchPath
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/match"
              className="inline-flex items-center gap-1 text-sm font-bold text-[var(--blue)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Match tool
            </Link>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </div>
        </nav>

        {errorMessage && (
          <div className="panel mb-8 border-[var(--red)] bg-[#f9e7e3] p-4 text-sm font-bold text-[var(--red)]">
            {errorMessage}
          </div>
        )}

        <div className="mb-10">
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--green)]">
            Personalized recruiting report
          </p>
          <h1 className="text-4xl font-black tracking-tight md:text-5xl">
            Get a personalized breakdown from a human reviewer.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">
            Our team reviews your full academic profile, soccer film, and recruiting context — then
            delivers a tailored PDF with realistic college targets, fit notes, and outreach
            suggestions within 48 hours.
          </p>
        </div>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <Item
            icon={<UserCheck className="h-5 w-5 text-[var(--green)]" />}
            title="Real human review"
            body="Not an algorithm. A reviewer reads your film and your statement before writing."
          />
          <Item
            icon={<FileText className="h-5 w-5 text-[var(--green)]" />}
            title="PDF delivered to you"
            body="Full report with school list, fit reasoning, and next-step suggestions."
          />
          <Item
            icon={<Clock className="h-5 w-5 text-[var(--green)]" />}
            title="Within 48 hours"
            body="Submit the form today, get your report back within two business days."
          />
        </section>

        <div className="panel p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="text-2xl font-black">Get Your Full Recruiting Report</div>
              <p className="mt-1 text-[var(--muted)]">One-time $10. No subscription.</p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                After payment you will fill out a short profile form so we can personalize your report.
              </p>
            </div>
            {userId ? (
              <form action="/report/checkout" method="post">
                <button
                  type="submit"
                  className="button-primary inline-flex items-center gap-2"
                >
                  Start
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            ) : (
              <Link
                href="/sign-up?redirect_url=/report"
                className="button-primary inline-flex items-center gap-2"
              >
                Sign up to start
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
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
