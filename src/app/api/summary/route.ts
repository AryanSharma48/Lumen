import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import type { AuditResult } from "@/types/audit";

// ─── Gemini Client (lazy, server-only) ────────────────────────────────────────

let _gemini: GoogleGenAI | null = null;

function getGemini(): GoogleGenAI {
  if (_gemini) return _gemini;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  _gemini = new GoogleGenAI({ apiKey: key });
  return _gemini;
}

// ─── Request Shape ─────────────────────────────────────────────────────────────

interface SummaryPayload {
  results: AuditResult[];
  totalMonthlySavings: number;
}

// ─── Fallback Template ────────────────────────────────────────────────────────

/**
 * Deterministic fallback used whenever the Gemini call fails (429, timeout,
 * missing key, network error, etc.). Never crashes the user's flow.
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

  // ── 2. Call Gemini with full error isolation ─────────────────────────────────
  try {
    const ai = getGemini();

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Fast and cheap for ~100 word output
      contents: buildPrompt(results, totalMonthlySavings),
      config: {
        maxOutputTokens: 200,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Unexpected empty response from Gemini.");
    }

    return NextResponse.json({ summary: text.trim() });
  } catch (err: unknown) {
    // Log the real error server-side but NEVER crash the client.
    console.warn(
      `[summary] Gemini call failed — serving fallback.`,
      err instanceof Error ? err.message : err
    );

    const fallback = buildFallbackSummary(results, totalMonthlySavings);
    return NextResponse.json({ summary: fallback, fallback: true });
  }
}
