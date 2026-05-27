export const runtime = "edge";

import { auth, currentUser } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, REPORT_PRICE_USD_CENTS } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const HOUR_MS = 60 * 60 * 1000;
const CHECKOUT_LIMIT_PER_HOUR = 5;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`checkout:${ip}`, CHECKOUT_LIMIT_PER_HOUR, HOUR_MS);
  if (!rl.ok) {
    const mins = Math.ceil(rl.retryAfterSec / 60);
    return new NextResponse(
      `Too many checkout attempts. Please try again in ${mins} minute${mins === 1 ? "" : "s"}.`,
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

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
      return new NextResponse("Something went wrong", { status: 500 });
    }

    const stripe = getStripe();
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
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
                  "Human-reviewed PDF with personalized college targets and fit notes, delivered within 48 hours. You will fill out your recruiting profile on the next page after payment.",
              },
            },
          },
        ],
        success_url: `${appUrl}/report/submit?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/report`,
      });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeError) {
        console.error("[checkout] Stripe error creating session", {
          type: err.type,
          code: err.code,
          statusCode: err.statusCode,
          message: err.message,
          requestId: err.requestId,
        });
      } else {
        console.error("[checkout] Unexpected error creating session", err);
      }
      return new NextResponse("Something went wrong", { status: 500 });
    }

    if (!session.url) {
      console.error("[checkout] Stripe returned no url", { sessionId: session.id });
      return new NextResponse("Something went wrong", { status: 500 });
    }
    return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    console.error("[checkout] Unhandled error", err);
    return new NextResponse("Something went wrong", { status: 500 });
  }
}
