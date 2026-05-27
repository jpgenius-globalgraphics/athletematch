import { Resend } from "resend";

export interface ReportSubmission {
  userEmail: string;
  gpa: string;
  courseRigor: string;
  satScore?: string;
  actScore?: string;
  position: string;
  clubTeam: string;
  ageGroup: string;
  graduationYear: string;
  league: string;
  schoolsInContact?: string;
  filmLink: string;
  personalStatement: string;
}

function row(label: string, value: string | undefined): string {
  if (!value) return "";
  const safe = String(value).replace(/[<>]/g, (c) => (c === "<" ? "&lt;" : "&gt;"));
  return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:600;color:#647067;vertical-align:top;width:160px">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;white-space:pre-wrap">${safe}</td></tr>`;
}

export async function sendSubmissionEmail(data: ReportSubmission): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  const recipient = process.env.REPORT_RECIPIENT_EMAIL;
  if (!recipient) throw new Error("REPORT_RECIPIENT_EMAIL is not set");
  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  const resend = new Resend(apiKey);

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;color:#17201b;max-width:640px;margin:0 auto">
  <h2 style="margin:0 0 16px">New PitchPath report request</h2>
  <p style="color:#647067;margin:0 0 24px">Reply to <strong>${data.userEmail}</strong> with the personalized PDF.</p>
  <table style="border-collapse:collapse;width:100%;border:1px solid #d9dfd8;border-radius:6px">
    ${row("Reply-to email", data.userEmail)}
    ${row("GPA", data.gpa)}
    ${row("Course rigor", data.courseRigor)}
    ${row("SAT score", data.satScore)}
    ${row("ACT score", data.actScore)}
    ${row("Position", data.position)}
    ${row("Club team", data.clubTeam)}
    ${row("Age group", data.ageGroup)}
    ${row("Graduation year", data.graduationYear)}
    ${row("League", data.league)}
    ${row("Schools in contact", data.schoolsInContact)}
    ${row("Film link", data.filmLink)}
    ${row("Personal statement", data.personalStatement)}
  </table>
</div>`;

  const { error } = await resend.emails.send({
    from,
    to: recipient,
    replyTo: data.userEmail,
    subject: `Report request — ${data.userEmail}`,
    html,
  });
  if (error) throw new Error(`Resend send failed: ${error.message}`);
}
