/**
 * Audit Engine — src/lib/engine.ts
 *
 * All pricing constants are intentionally isolated at the top so they can be
 * swapped for real market data (see PRICING_DATA.md) without touching logic.
 * Prices are per-seat/month unless marked as flat.
 *
 * NO AI or external calls are made here. Every recommendation is derived
 * from deterministic comparisons.
 */

import type {
  AuditReport,
  AuditResult,
  ActionType,
  FormState,
  PlanName,
  ToolName,
  ToolState,
  UseCase,
} from "@/types/audit";

// ─── Placeholder Pricing Constants ────────────────────────────────────────────
// TODO: Replace with finalized numbers from PRICING_DATA.md

const PRICE: Record<ToolName, Partial<Record<PlanName, number>>> = {
  Cursor: {
    Hobby: 0,
    Pro: 20,
    Business: 40,
    Enterprise: 60, // placeholder — negotiated, varies
  },
  "GitHub Copilot": {
    Individual: 10,
    Business: 19,
    Enterprise: 39,
  },
  Claude: {
    Free: 0,
    Pro: 20,
    Team: 25,   // per seat
    Enterprise: 60, // placeholder
  },
  ChatGPT: {
    Free: 0,
    Plus: 20,
    Team: 30,   // per seat
    Enterprise: 60, // placeholder
  },
  "Anthropic API": {
    "Pay-as-you-go": 0, // cost is usage-based; monthlySpend IS the cost
  },
  "OpenAI API": {
    "Pay-as-you-go": 0, // same — we use monthlySpend directly
  },
  Gemini: {
    Free: 0,
    Advanced: 20,
    Business: 24,
    Enterprise: 30, // placeholder
  },
  Windsurf: {
    Free: 0,
    Pro: 15,
    Teams: 22,
    Enterprise: 45, // placeholder
  },
};

/** Max team size where a per-seat plan is still the cheapest per-seat tier. */
const ENTERPRISE_JUSTIFIED_SEAT_THRESHOLD = 50;

/**
 * For "coding" use-cases, Cursor / Windsurf / Copilot are more appropriate
 * than general-purpose chat tools billed at a high per-seat rate.
 */
const CODING_PREFERRED_TOOLS: ToolName[] = ["Cursor", "GitHub Copilot", "Windsurf"];

/**
 * For "writing" / "research" use-cases, Claude and ChatGPT are better value
 * than code-specific IDEs.
 */
const WRITING_PREFERRED_TOOLS: ToolName[] = ["Claude", "ChatGPT", "Gemini"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function planPrice(tool: ToolName, plan: PlanName): number {
  return PRICE[tool]?.[plan] ?? 0;
}

/** Returns the monthly total for a tool at a given plan and seat count. */
function totalCost(pricePerSeat: number, seats: number): number {
  return pricePerSeat * seats;
}

/**
 * Finds the cheapest plan for a tool that is not the current plan.
 * Returns null if the current plan is already the cheapest (or only) option.
 */
function cheaperPlan(
  tool: ToolName,
  currentPlan: PlanName,
  seats: number,
  currentTotal: number
): { plan: PlanName; total: number } | null {
  const plans = PRICE[tool];
  if (!plans) return null;

  let best: { plan: PlanName; total: number } | null = null;

  for (const [plan, pricePerSeat] of Object.entries(plans) as [PlanName, number][]) {
    if (plan === currentPlan) continue;
    if (pricePerSeat === 0) continue; // free plans are separate logic
    const t = totalCost(pricePerSeat, seats);
    if (t < currentTotal && (best === null || t < best.total)) {
      best = { plan, total: t };
    }
  }

  return best;
}

/**
 * Checks whether the user is on an Enterprise/high tier with a very small
 * team where it is mathematically unjustified.
 */
function isOverkillPlan(tool: ToolState, teamSize: number): boolean {
  const isEnterpriseTier =
    tool.planName === "Enterprise" ||
    (tool.toolName === "GitHub Copilot" && tool.planName === "Enterprise");
  return isEnterpriseTier && teamSize < ENTERPRISE_JUSTIFIED_SEAT_THRESHOLD;
}

/**
 * For coding teams, suggests switching from a chat-only tool to a
 * purpose-built coding assistant if the per-seat cost is lower.
 */
function suggestCodingSwitch(
  tool: ToolState,
  useCase: UseCase
): { switchTo: ToolName; monthlyPrice: number } | null {
  if (useCase !== "coding" && useCase !== "mixed") return null;
  if (CODING_PREFERRED_TOOLS.includes(tool.toolName)) return null; // already optimal

  // Suggest Windsurf Pro as the cheapest well-known coding alternative
  const windsurfProPrice = PRICE["Windsurf"]["Pro"] ?? 15;
  const currentPerSeat = tool.monthlySpend / Math.max(tool.seats, 1);
  if (windsurfProPrice < currentPerSeat) {
    return { switchTo: "Windsurf", monthlyPrice: windsurfProPrice };
  }

  return null;
}

// ─── Core Evaluation ──────────────────────────────────────────────────────────

function evaluateTool(tool: ToolState, form: FormState): AuditResult {
  const { teamSize, useCase } = form.team;
  const seats = Math.max(tool.seats, 0);
  const currentTotal = tool.monthlySpend;

  // Guard: zero seats — nothing to optimize
  if (seats === 0) {
    return buildResult(tool, "OPTIMAL", "No seats are allocated; nothing to optimize.", null, null, 0);
  }

  // Guard: zero spend — might be free tier
  if (currentTotal === 0) {
    return buildResult(tool, "OPTIMAL", "You are on a free plan — no spend to reduce.", null, null, 0);
  }

  // Collect every valid recommendation, then pick the one with highest savings.
  const candidates: AuditResult[] = [];

  // 1. Overkill Enterprise plan — same-vendor downgrade
  if (isOverkillPlan(tool, teamSize)) {
    const better = cheaperPlan(tool.toolName, tool.planName, seats, currentTotal);
    if (better) {
      const savings = currentTotal - better.total;
      if (savings > 0) {
        candidates.push(buildResult(
          tool,
          "DOWNGRADE_PLAN",
          `Enterprise tier is oversized for a team of ${teamSize}; downgrading to ${better.plan} saves $${savings.toFixed(0)}/mo.`,
          better.plan,
          null,
          savings
        ));
      }
    }
  }

  // 2. Cheaper same-vendor plan (non-Enterprise context)
  const cheaper = cheaperPlan(tool.toolName, tool.planName, seats, currentTotal);
  if (cheaper) {
    const savings = currentTotal - cheaper.total;
    if (savings > 0) {
      candidates.push(buildResult(
        tool,
        "DOWNGRADE_PLAN",
        `Switching from ${tool.planName} to ${cheaper.plan} on ${tool.toolName} reduces your bill by $${savings.toFixed(0)}/mo.`,
        cheaper.plan,
        null,
        savings
      ));
    }
  }

  // 3. Cross-tool switch for coding teams
  const switchSuggestion = suggestCodingSwitch(tool, useCase);
  if (switchSuggestion) {
    const recommendedTotal = switchSuggestion.monthlyPrice * seats;
    const savings = currentTotal - recommendedTotal;
    if (savings > 0) {
      candidates.push(buildResult(
        tool,
        "SWITCH_TOOL",
        `For a coding-focused team, ${switchSuggestion.switchTo} Pro ($${switchSuggestion.monthlyPrice}/seat) is $${savings.toFixed(0)}/mo cheaper than your current ${tool.toolName} spend.`,
        null,
        switchSuggestion.switchTo,
        savings
      ));
    }
  }

  // 4. Writing/research teams on expensive coding tools
  if (
    (useCase === "writing" || useCase === "research") &&
    CODING_PREFERRED_TOOLS.includes(tool.toolName)
  ) {
    const geminiAdvancedPrice = PRICE["Gemini"]["Advanced"] ?? 20;
    const currentPerSeat = currentTotal / seats;
    if (geminiAdvancedPrice < currentPerSeat) {
      const recommendedTotal = geminiAdvancedPrice * seats;
      const savings = currentTotal - recommendedTotal;
      candidates.push(buildResult(
        tool,
        "SWITCH_TOOL",
        `For ${useCase} workflows, Gemini Advanced ($${geminiAdvancedPrice}/seat) is better suited and $${savings.toFixed(0)}/mo cheaper than a coding IDE subscription.`,
        null,
        "Gemini",
        savings
      ));
    }
  }

  // Return highest-savings recommendation, or OPTIMAL if none found
  if (candidates.length === 0) {
    return buildResult(
      tool,
      "OPTIMAL",
      `Your ${tool.toolName} ${tool.planName} plan is appropriately sized for your team.`,
      null,
      null,
      0
    );
  }

  return candidates.reduce((best, c) => (c.monthlySavings > best.monthlySavings ? c : best));
}

function buildResult(
  tool: ToolState,
  action: ActionType,
  reason: string,
  recommendedPlan: PlanName | null,
  recommendedTool: ToolName | null,
  monthlySavings: number
): AuditResult {
  const annualSavings = monthlySavings * 12;
  return {
    toolId: tool.id,
    toolName: tool.toolName,
    currentMonthlySpend: tool.monthlySpend,
    recommendedAction: action,
    reason,
    recommendedPlan,
    recommendedTool,
    monthlySavings,
    annualSavings,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs the full audit on the user's submitted form state.
 * Returns an AuditReport with per-tool results and totals.
 */
export function runAudit(form: FormState): AuditReport {
  const results = form.tools.map((tool) => evaluateTool(tool, form));

  const totalMonthlySavings = results.reduce(
    (sum, r) => sum + r.monthlySavings,
    0
  );
  const totalAnnualSavings = totalMonthlySavings * 12;

  return { results, totalMonthlySavings, totalAnnualSavings };
}
