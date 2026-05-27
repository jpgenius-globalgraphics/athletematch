export const runtime = "edge";

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, Trophy } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Stripe from "stripe";
import { getStripe, REPORT_PRICE_USD_CENTS } from "@/lib/stripe";
import { isSessionUsed } from "@/lib/sessionGuard";
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

  if (isSessionUsed(session_id)) {
    redirect("/report?error=already-submitted");
  }

  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error("[report/submit] Stripe retrieve failed", {
        type: err.type,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        requestId: err.requestId,
      });
    } else {
      console.error("[report/submit] Unexpected error retrieving session", err);
    }
    redirect("/report?error=session-lookup-failed");
  }
  if (
    session.payment_status !== "paid" ||
    session.metadata?.userId !== userId ||
    session.amount_total !== REPORT_PRICE_USD_CENTS
  ) {
    console.error("[report/submit] Session failed verification", {
      sessionId: session.id,
      paymentStatus: session.payment_status,
      metadataUserIdMatches: session.metadata?.userId === userId,
      amountTotal: session.amount_total,
      expectedAmount: REPORT_PRICE_USD_CENTS,
    });
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
            PitchPath
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
