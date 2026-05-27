export const runtime = "edge";

import Link from "next/link";
import { CheckCircle2, Trophy } from "lucide-react";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-2xl">
        <nav className="mb-12 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black">
            <Trophy className="h-6 w-6 text-[var(--green)]" />
            AthleteMatch
          </Link>
        </nav>

        <div className="panel p-8 text-center">
          <CheckCircle2 className="mx-auto mb-5 h-14 w-14 text-[var(--green)]" />
          <h1 className="text-3xl font-black tracking-tight">Your report request was received.</h1>
          <p className="mt-4 text-lg text-[var(--muted)]">
            Expect your personalized PDF within 48 hours
            {email ? (
              <>
                {" "}at <strong className="text-[var(--text)]">{decodeURIComponent(email)}</strong>
              </>
            ) : null}
            .
          </p>
          <div className="mt-8">
            <Link href="/match" className="button-secondary inline-flex items-center gap-2">
              Back to match tool
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
