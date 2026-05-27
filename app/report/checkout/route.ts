export const runtime = "edge";

import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, REPORT_PRICE_USD_CENTS } from "@/lib/stripe";

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return new NextResponse("Account has no email", { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("[checkout] NEXT_PUBLIC_APP_URL not configured");
      return new NextResponse("NEXT_PUBLIC_APP_URL not configured", { status: 500 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      metadata: { userId },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: REPORT_PRICE_USD_CENTS,
            product_data: {
              name: "PitchPath personalized recruiting report",
              description:
                "Human-reviewed PDF with personalized college targets and fit notes, delivered within 48 hours.",
            },
          },
        },
      ],
      success_url: `${appUrl}/report/submit?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/report`,
    });

    if (!session.url) {
      console.error("[checkout] Stripe returned no url", { sessionId: session.id });
      return new NextResponse("Stripe did not return a checkout URL", { status: 500 });
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error("[checkout] Stripe error", {
        type: err.type,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        requestId: err.requestId,
      });
      return new NextResponse(`Stripe ${err.type}: ${err.message}`, {
        status: err.statusCode ?? 500,
      });
    }
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[checkout] Unexpected error", { message, stack });
    return new NextResponse(`Checkout failed: ${message}`, { status: 500 });
  }
}
