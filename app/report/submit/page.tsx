export const runtime = "edge";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, Trophy } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { getStripe } from "@/lib/stripe";
import ReportForm from "@/components/ReportForm";

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/report");

  const { session_id } = await searchParams;
  if (!session_id) redirect("/report");

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(session_id);
  if (session.payment_status !== "paid" || session.metadata?.userId !== userId) {
    redirect("/report");
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress ?? "";

  return (
    <main className="min-h-screen px-5 py-8 md:px-8">
      <div className="mx-auto max-w-3xl">
        <nav className="mb-10 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-black">
            <Trophy className="h-6 w-6 text-[var(--green)]" />
            AthleteMatch
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/report"
              className="inline-flex items-center gap-1 text-sm font-bold text-[var(--blue)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Report
            </Link>
            <UserButton />
          </div>
        </nav>

        <div className="mb-8">
          <p className="mb-3 text-sm font-black uppercase tracking-wide text-[var(--green)]">
            Step 2 of 2
          </p>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">
            Tell us about your profile.
          </h1>
          <p className="mt-3 max-w-2xl text-[var(--muted)]">
            We&apos;ll review everything and send your personalized report to{" "}
            <strong className="text-[var(--text)]">{userEmail}</strong> within 48 hours.
          </p>
        </div>

        <ReportForm sessionId={session_id} userEmail={userEmail} />
      </div>
    </main>
  );
}
