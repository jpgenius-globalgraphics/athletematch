import Stripe from "stripe";

// Edge runtime requires a fetch-based HTTP client; the default node http
// client is not available on Cloudflare Workers.
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export const REPORT_PRICE_USD_CENTS = 1000;
