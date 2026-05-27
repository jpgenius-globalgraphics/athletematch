export const runtime = "edge";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe";
import { sendSubmissionEmail, type ReportSubmission } from "@/lib/email";

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

function requireString(value: unknown, name: string, max = 5000): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  if (value.length > max) throw new Error(`${name} is too long`);
  return value.trim();
}

function optionalString(value: unknown, max = 5000): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  if (value.length > max) throw new Error("Field is too long");
  return value.trim();
}

export async function POST(req: NextRequest) {
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

  // Re-verify payment server-side
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
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
      gpa: requireString(body.gpa, "GPA", 10),
      courseRigor: requireString(body.courseRigor, "Course rigor", 40),
      satScore: optionalString(body.satScore, 10),
      actScore: optionalString(body.actScore, 10),
      position: requireString(body.position, "Position", 80),
      clubTeam: requireString(body.clubTeam, "Club team", 120),
      ageGroup: requireString(body.ageGroup, "Age group", 10),
      graduationYear: requireString(body.graduationYear, "Graduation year", 4),
      league: requireString(body.league, "League", 40),
      schoolsInContact: optionalString(body.schoolsInContact, 2000),
      filmLink: requireString(body.filmLink, "Film link", 500),
      personalStatement: requireString(body.personalStatement, "Personal statement", 6000),
    };
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : "Validation failed", {
      status: 400,
    });
  }

  try {
    await sendSubmissionEmail(submission);
  } catch (err) {
    return new NextResponse(err instanceof Error ? err.message : "Email failed", { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
