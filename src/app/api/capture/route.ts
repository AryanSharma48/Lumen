import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabase, toLeadRow } from "@/lib/supabase";
import type { AuditResult } from "@/types/audit";

// ─── Resend Client ─────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Request Body Shape ────────────────────────────────────────────────────────

interface CapturePayload {
  /** Primary contact email. */
  email: string;
  /** Optional company name. */
  companyName?: string;
  /** Optional user role. */
  role?: string;
  /** Total headcount from the spend form. */
  teamSize: number;
  /** Aggregated monthly savings from the audit engine. */
  totalMonthlySavings: number;
  /** Per-tool audit results to persist for later AI enrichment. */
  auditData: AuditResult[];
  /**
   * Honeypot field — intentionally invisible to real users.
   * If this field is non-empty the request originates from a bot.
   */
  _hp?: string;
}

// ─── POST Handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // ── 1. Parse body ────────────────────────────────────────────────────────────
    let body: CapturePayload;
    try {
      body = (await req.json()) as CapturePayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // ── 2. Honeypot check ────────────────────────────────────────────────────────
    if (body._hp) {
      return NextResponse.json({ ok: true });
    }

    // ── 3. Basic validation ──────────────────────────────────────────────────────
    const { email, companyName, role, teamSize, totalMonthlySavings, auditData } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 422 });
    }
    if (typeof teamSize !== "number" || teamSize < 1) {
      return NextResponse.json({ error: "teamSize must be a positive integer." }, { status: 422 });
    }
    if (!Array.isArray(auditData) || auditData.length === 0) {
      return NextResponse.json({ error: "auditData must be a non-empty array." }, { status: 422 });
    }

    // ── 4. Persist to Supabase ───────────────────────────────────────────────────
    const { data, error: dbError } = await getSupabase()
      .from("leads")
      .insert([
        toLeadRow({
          email,
          companyName: companyName ?? null,
          role: role ?? null,
          teamSize,
          totalMonthlySavings,
          auditData,
        }),
      ])
      .select("id")
      .single();

    if (dbError || !data) {
      console.error("[capture] Supabase insert error:", dbError);
      return NextResponse.json(
        { 
          error: "Failed to save your audit. Please try again.",
          details: process.env.NODE_ENV === 'development' ? dbError : undefined
        },
        { status: 500 }
      );
    }

    const leadId: string = data.id as string;

    // ── 5. Send confirmation email via Resend ────────────────────────────────────
    const formattedSavings = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(totalMonthlySavings);

    try {
      const { error: emailError } = await resend.emails.send({
        from: "Lumen <audit@aryansharma.dev>",
        to: [email],
        subject: `Your AI Spend Audit is saved — ${formattedSavings}/mo in potential savings`,
        html: buildEmailHtml({
          email,
          companyName: companyName ?? null,
          formattedSavings,
          willBeContacted: totalMonthlySavings > 500,
          leadId,
        }),
      });

      if (emailError) {
        console.warn("[capture] Resend email error:", emailError);
      }
    } catch (e) {
      console.error("[capture] Resend critical error:", e);
    }

    // ── 6. Return the lead id for viral-share links ──────────────────────────────
    return NextResponse.json({ ok: true, id: leadId }, { status: 201 });
  } catch (globalError) {
    console.error("[capture] Global crash:", globalError);
    return NextResponse.json(
      { 
        error: "Internal server error.",
        message: globalError instanceof Error ? globalError.message : String(globalError)
      }, 
      { status: 500 }
    );
  }
}

// ─── Email Template ────────────────────────────────────────────────────────────

interface EmailTemplateProps {
  email: string;
  companyName: string | null;
  formattedSavings: string;
  willBeContacted: boolean;
  leadId: string;
}

function buildEmailHtml({
  companyName,
  formattedSavings,
  willBeContacted,
  leadId,
}: EmailTemplateProps): string {
  const greeting = companyName ? `Hi ${companyName} team,` : "Hi there,";
  const outreachNote = willBeContacted
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;color:#166534;">
        <strong>🎉 Great news:</strong> Your projected savings exceed <strong>${formattedSavings}/mo</strong>.
        A Credex expert will reach out shortly to walk you through a tailored consolidation plan.
      </p>`
    : "";

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Lumen Audit is Saved</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:40px auto;background:#1a1a1a;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#6366f1,#a855f7);padding:32px 40px;">
        <h1 style="margin:0;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Lumen</h1>
        <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;">AI Spend Intelligence by Credex</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${greeting}</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#a3a3a3;">
          Your AI spend audit has been saved. Here's what we found:
        </p>
        <!-- Savings callout -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#111827;border-radius:8px;border:1px solid #374151;overflow:hidden;">
          <tr>
            <td style="padding:20px 24px;">
              <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#6b7280;">Potential Monthly Savings</p>
              <p style="margin:8px 0 0;font-size:36px;font-weight:700;color:#a78bfa;">${formattedSavings}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">That's <strong style="color:#d1d5db;">${
                // annualise inline so we don't need to pass it
                formattedSavings.replace(/[^0-9.]/g, "")
                  ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
                      .format(Number(formattedSavings.replace(/[^0-9.]/g, "")) * 12)
                  : "$0"
              }/yr</strong> saved across your team.</p>
            </td>
          </tr>
        </table>
        ${outreachNote}
        <p style="margin:24px 0 8px;font-size:15px;line-height:1.6;color:#a3a3a3;">
          Your audit report is ready to share. Use the link below:
        </p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/r/${leadId}"
           style="display:inline-block;margin:8px 0 24px;padding:12px 24px;background:linear-gradient(135deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
          View Your Report →
        </a>
        <p style="margin:0;font-size:13px;color:#4b5563;line-height:1.6;">
          Questions? Reply to this email and we'll get back to you within one business day.
        </p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:20px 40px;border-top:1px solid #2a2a2a;">
        <p style="margin:0;font-size:12px;color:#4b5563;line-height:1.6;">
          © ${new Date().getFullYear()} Lumen by Credex.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
