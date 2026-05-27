import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtected = createRouteMatcher([
  "/report/submit(.*)",
  "/report/checkout(.*)",
  "/report/success(.*)",
  "/api/submit-report(.*)",
]);

// If we later add a Clerk webhook (e.g. /api/webhooks/clerk for user.created
// fan-out), verify the svix signature before doing any work. Clerk signs
// each webhook with the SIGNING_SECRET from dashboard.clerk.com → Webhooks.
// Implementation goes inside that route handler — NOT middleware — so the
// raw request body stays intact for signature verification:
//
//   import { Webhook } from "svix";
//   const wh = new Webhook(process.env.CLERK_WEBHOOK_SIGNING_SECRET!);
//   const evt = wh.verify(rawBody, {
//     "svix-id": req.headers.get("svix-id")!,
//     "svix-timestamp": req.headers.get("svix-timestamp")!,
//     "svix-signature": req.headers.get("svix-signature")!,
//   });
//
// If the webhook path is added to isProtected above it would 401 before
// reaching the handler, so leave webhook routes OUT of the matcher.

const isDev = process.env.NODE_ENV === "development";

// Restrict scripts to first-party + Clerk + Stripe. 'unsafe-inline' is
// required because Next.js inlines small hydration/runtime scripts; a
// nonce-based policy would be stricter but is incompatible with our current
// edge SSR setup. 'unsafe-eval' is added in dev only for React Fast Refresh.
const CSP = [
  "default-src 'self'",
  [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    isDev ? "'unsafe-eval'" : "",
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://challenges.cloudflare.com",
    "https://js.stripe.com",
  ]
    .filter(Boolean)
    .join(" "),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
  "font-src 'self' data:",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com https://api.stripe.com",
  "frame-src https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "worker-src 'self' blob:",
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) {
    await auth.protect();
  }
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Content-Security-Policy", CSP);
  return res;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
