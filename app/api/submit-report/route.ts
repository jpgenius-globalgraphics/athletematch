export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { sendSubmissionEmail, type ReportSubmission } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isSessionUsed, markSessionUsed } from "@/lib/sessionGuard";

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBMIT_LIMIT_PER_DAY = 3;

const ALLOWED_GRAD_YEARS = new Set(["2025", "2026", "2027", "2028", "2029"]);
const PERSONAL_STATEMENT_MAX = 6000;

interface Body {
  sessionId?: string;
  gpa?: string;
  courseRigor?: string;
  satScore?: string;
  actScore?: string;
  position?: string;
  clubTeam?: string;
  ageGroup?: string;
  graduationYear?: string;
  league?: string;
  schoolsInContact?: string;
  filmLink?: string;
  personalStatement?: string;
}

class ValidationError extends Error {}

function requireString(value: unknown, name: string, max = 5000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError(`${name} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${name} is too long (max ${max})`);
  return trimmed;
}

function optionalString(value: unknown, name: string, max = 5000): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${name} is too long (max ${max})`);
  return trimmed;
}

function validateGpa(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError("GPA is required");
  }
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 4.0) {
    throw new ValidationError("GPA must be a number between 0 and 4.0");
  }
  return value.trim();
}

function validateUrl(value: unknown, name: string): string {
  const s = requireString(value, name, 500);
  let parsed: URL;
  try {
    parsed = new URL(s);
  } catch {
    throw new ValidationError(`${name} must be a valid URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ValidationError(`${name} must be an http or https URL`);
  }
  return s;
}

function validateGradYear(value: unknown): string {
  const s = requireString(value, "Graduation year", 4);
  if (!ALLOWED_GRAD_YEARS.has(s)) {
    const allowed = [...ALLOWED_GRAD_YEARS].join(", ");
    throw new ValidationError(`Graduation year must be one of: ${allowed}`);
  }
  return s;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = checkRateLimit(`submit:${ip}`, SUBMIT_LIMIT_PER_DAY, DAY_MS);
  if (!rl.ok) {
    return new NextResponse(
      "Too many submissions from this IP. Please try again tomorrow.",
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const sessionId = body.sessionId;
  if (!sessionId) return new NextResponse("Missing sessionId", { status: 400 });

  if (isSessionUsed(sessionId)) {
    return new NextResponse("This payment has already been used to submit a report.", {
      status: 409,
    });
  }

  // Re-verify payment server-side
  const stripe = getStripe();
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch (err) {
    if (err instanceof Stripe.errors.StripeError) {
      console.error("[submit-report] Stripe retrieve failed", {
        type: err.type,
        code: err.code,
        statusCode: err.statusCode,
        message: err.message,
        requestId: err.requestId,
      });
    } else {
      console.error("[submit-report] Unexpected error retrieving session", err);
    }
    return new NextResponse("Something went wrong", { status: 500 });
  }

  if (session.payment_status !== "paid" || session.metadata?.userId !== userId) {
    return new NextResponse("Payment not verified", { status: 402 });
  }

  const user = await currentUser();
  const userEmail = user?.emailAddresses?.[0]?.emailAddress;
  if (!userEmail) return new NextResponse("Account has no email", { status: 400 });

  let submission: ReportSubmission;
  try {
    submission = {
      userEmail,
      gpa: validateGpa(body.gpa),
      courseRigor: requireString(body.courseRigor, "Course rigor", 40),
      satScore: optionalString(body.satScore, "SAT score", 10),
      actScore: optionalString(body.actScore, "ACT score", 10),
      position: requireString(body.position, "Position", 80),
      clubTeam: requireString(body.clubTeam, "Club team", 120),
      ageGroup: requireString(body.ageGroup, "Age group", 10),
      graduationYear: validateGradYear(body.graduationYear),
      league: requireString(body.league, "League", 40),
      schoolsInContact: optionalString(body.schoolsInContact, "Schools in contact", 2000),
      filmLink: validateUrl(body.filmLink, "Film link"),
      personalStatement: requireString(
        body.personalStatement,
        "Personal statement",
        PERSONAL_STATEMENT_MAX,
      ),
    };
  } catch (err) {
    if (err instanceof ValidationError) {
      return new NextResponse(err.message, { status: 400 });
    }
    console.error("[submit-report] Unexpected validation failure", err);
    return new NextResponse("Invalid input", { status: 400 });
  }

  try {
    await sendSubmissionEmail(submission);
  } catch (err) {
    console.error("[submit-report] Resend send failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return new NextResponse("Something went wrong", { status: 500 });
  }

  markSessionUsed(sessionId);
  return NextResponse.json({ ok: true });
}
