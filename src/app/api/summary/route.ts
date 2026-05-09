import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { AuditResult } from "@/types/audit";

// ─── Anthropic Client (lazy, server-only) ─────────────────────────────────────

let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (_anthropic) return _anthropic;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set.");
  _anthropic = new Anthropic({ apiKey: key });
  return _anthropic;
}

// ─── Request Shape ─────────────────────────────────────────────────────────────

interface SummaryPayload {
  results: AuditResult[];
  totalMonthlySavings: number;
}

// ─── Fallback Template ────────────────────────────────────────────────────────

/**
 * Deterministic fallback used whenever the Anthropic call fails (429, timeout,
 * missing key, network error, etc.).  Never crashes the user's flow.
 */
function buildFallbackSummary(
  results: AuditResult[],
  totalMonthlySavings: number
): string {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  const toolCount = results.length;
  const savingsTools = results.filter((r) => r.monthlySavings > 0);
  const topTool = savingsTools.sort((a, b) => b.monthlySavings - a.monthlySavings)[0];

  if (totalMonthlySavings === 0) {
    return `Your team is running a lean AI stack across ${toolCount} tool${
      toolCount !== 1 ? "s" : ""
    }. Based on current public pricing, every active subscription is on the most cost-effective plan for your team size and use case. Keep an eye on vendor pricing changes — this landscape shifts quickly.`;
  }

  const topToolNote = topTool
    ? ` The biggest win is on ${topTool.toolName}, where a plan change could free up ${fmt(topTool.monthlySavings)}/mo alone.`
    : "";

  return `Across your ${toolCount} AI tool${
    toolCount !== 1 ? "s" : ""
  }, our analysis has identified ${fmt(totalMonthlySavings)}/mo — or ${fmt(
    totalMonthlySavings * 12
  )}/yr — in verifiable savings based on current public pricing.${topToolNote} These numbers reflect real plan differences, not estimates. Acting on these recommendations requires no new tools, just smarter licensing decisions.`;
}

// ─── Prompt Builder ───────────────────────────────────────────────────────────

function buildPrompt(results: AuditResult[], totalMonthlySavings: number): string {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  const toolLines = results
    .map(
      (r) =>
        `- ${r.toolName}: ${fmt(r.currentSpend ?? 0)}/mo current, action=${r.recommendedAction}, savings=${fmt(r.monthlySavings)}/mo. Reason: ${r.reasoning ?? r.reason ?? "N/A"}`
    )
    .join("\n");

  return `You are a terse, data-driven financial analyst specialising in SaaS procurement for software teams.

A team's AI spend audit produced these results:
${toolLines}

Total monthly savings identified: ${fmt(totalMonthlySavings)}

Write a personalised, confident summary of their AI stack efficiency in EXACTLY 80–110 words. Rules:
- Start with a strong, specific opening that references their total savings figure.
- Mention 1–2 specific tools and their recommended action by name.
- End with one sentence about the business impact of acting on this.
- Do NOT use bullet points, headers, or markdown.
- Write in second person ("your stack", "you are").
- Plain prose only.`;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1. Parse body ────────────────────────────────────────────────────────────
  let body: SummaryPayload;
  try {
    body = (await req.json()) as SummaryPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { results, totalMonthlySavings } = body;

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: "results must be a non-empty array." }, { status: 422 });
  }

  // ── 2. Call Anthropic with full error isolation ───────────────────────────────
  try {
    const client = getAnthropic();

    const message = await client.messages.create(
      {
        model: "claude-3-5-haiku-20241022", // fast + cheap for ~100 word output
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: buildPrompt(results, totalMonthlySavings),
          },
        ],
      },
      {
        // Abort if Anthropic takes more than 8 seconds — keep p99 latency
        // within Next.js's default serverless function window.
        timeout: 8_000,
      }
    );

    const block = message.content[0];
    if (block.type !== "text") {
      throw new Error("Unexpected content block type from Anthropic.");
    }

    return NextResponse.json({ summary: block.text.trim() });
  } catch (err: unknown) {
    // Log the real error server-side but NEVER crash the client.
    // This covers: missing API key, 429 rate-limit, network timeout, SDK errors.
    const isRateLimit =
      err instanceof Anthropic.RateLimitError ||
      (err instanceof Anthropic.APIError && err.status === 429);

    console.warn(
      `[summary] Anthropic call failed (${isRateLimit ? "rate-limited" : "error"}) — serving fallback.`,
      err instanceof Error ? err.message : err
    );

    const fallback = buildFallbackSummary(results, totalMonthlySavings);
    return NextResponse.json({ summary: fallback, fallback: true });
  }
}
