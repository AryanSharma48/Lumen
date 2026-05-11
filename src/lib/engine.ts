/**
 * Audit Engine — src/lib/engine.ts
 *
 * All pricing constants are isolated at the top so they can be swapped for
 * updated market data (see PRICING_DATA.md) without touching rule logic.
 * Prices are per-seat / month for subscription tools.
 * API tools (Anthropic API, OpenAI API) are usage-based; monthlySpend IS the cost.
 *
 * NO AI or external calls are made here. Every recommendation is derived
 * from deterministic arithmetic.
 */

import type {
  ActionType,
  AuditReport,
  AuditResult,
  FormState,
  PlanName,
  TeamData,
  ToolName,
  ToolState,
} from "@/types/audit";

// ─── Verified Pricing Table (PRICING_DATA.md · 2026-05-08) ───────────────────
// null = custom / negotiated — we cannot compute savings for these tiers.

export const TOOL_PRICING: Record<string, Record<string, number | null>> = {
  "Cursor":         { "Hobby": 0,  "Pro": 20, "Business": 40, "Enterprise": null },
  "GitHub Copilot": { "Individual": 10, "Business": 19, "Enterprise": 39 },
  "Claude":         { "Free": 0,   "Pro": 20, "Team (Standard Seat)": 25, "Team (Premium Seat)": 125, "Enterprise": null, "API Direct": 0 },
  "ChatGPT":        { "Plus": 20, "Team": 30, "Enterprise": null, "API Direct": 0 },
  "Windsurf":       { "Free": 0,   "Pro": 20, "Max": 200, "Teams": 40, "Enterprise": null },
  // API tools — pricing recorded for reference; engine uses monthlySpend directly.
  "Anthropic API":  { "API Direct": 0 },
  "OpenAI API":     { "API Direct": 0 },
  "Gemini":         { "Free": 0,   "Plus": 7.99, "Pro": 19.99, "Ultra": 249.99, "API Direct": 0 },
};

// ─── Rule Thresholds ─────────────────────────────────────────────────────────

/** Teams smaller than this don't justify a custom Enterprise contract. */
const ENTERPRISE_SEAT_THRESHOLD = 50;

/** API spend above this triggers an efficiency suggestion (Rule 4). */
const API_EFFICIENCY_THRESHOLD = 100;

/** Conservative savings estimate for switching to a cheaper API model (Rule 4). */
const API_EFFICIENCY_SAVINGS_RATE = 0.5;

// ─── Normalisation Helpers ───────────────────────────────────────────────────
// The type system allows both the legacy (toolName/planName/useCase) and the
// new (name/plan/primaryUseCase) field names. These helpers resolve either.

function resolveName(tool: ToolState): ToolName {
  return tool.name ?? tool.toolName!;
}

function resolvePlan(tool: ToolState): PlanName {
  return tool.plan ?? tool.planName!;
}

function resolveUseCase(team: TeamData) {
  return team.primaryUseCase ?? team.useCase!;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Looks up the per-seat price for a tool+plan combination.
 * Returns null when the price is custom/unknown.
 */
function perSeatPrice(toolName: string, plan: string): number | null {
  return TOOL_PRICING[toolName]?.[plan] ?? null;
}

/**
 * Builds a fully-populated AuditResult.
 * Populates both the new (spec) field names and the legacy aliases.
 */
function buildResult(
  tool: ToolState,
  action: ActionType,
  reasoning: string,
  recommendedPlan: PlanName | null,
  recommendedTool: ToolName | null,
  monthlySavings: number
): AuditResult {
  const annualSavings = +(monthlySavings * 12).toFixed(2);
  const ms = +monthlySavings.toFixed(2);
  return {
    toolId:              tool.id,
    toolName:            resolveName(tool),
    currentSpend:        tool.monthlySpend,
    currentMonthlySpend: tool.monthlySpend, // legacy alias
    recommendedAction:   action,
    reasoning,
    reason:              reasoning,          // legacy alias
    recommendedPlan,
    recommendedTool,
    monthlySavings:      ms,
    annualSavings,
  };
}

function optimal(tool: ToolState, reasoning: string): AuditResult {
  return buildResult(tool, "OPTIMAL", reasoning, null, null, 0);
}

// ─── Rule Implementations ────────────────────────────────────────────────────

/**
 * Rule 1 — The Solo Overkill.
 * Solo user on a Team-priced plan (ChatGPT Team $30 or Claude Team $30)
 * should downgrade to the individual tier.
 */
function ruleSoloOverkill(tool: ToolState): AuditResult | null {
  const name = resolveName(tool);
  const plan = resolvePlan(tool);
  if (tool.seats !== 1) return null;

  const teamTierTools: Record<string, { teamPlan: string; cheaperPlan: PlanName; cheaperPrice: number }> = {
    "ChatGPT": { teamPlan: "Team", cheaperPlan: "Plus", cheaperPrice: 20 },
    "Claude":  { teamPlan: "Team (Standard Seat)", cheaperPlan: "Pro",  cheaperPrice: 20 },
  };

  const match = teamTierTools[name];
  if (!match || plan !== match.teamPlan) return null;

  const teamPrice = perSeatPrice(name, plan);
  if (teamPrice === null) return null;

  const savings = teamPrice - match.cheaperPrice; // 30 − 20 = 10
  if (savings <= 0) return null;

  return buildResult(
    tool,
    "DOWNGRADE_PLAN",
    `You have 1 seat on ${name} ${plan} ($${teamPrice}/mo), which requires a minimum team. Downgrading to ${match.cheaperPlan} ($${match.cheaperPrice}/mo) saves $${savings}/mo — same frontier model access for a solo user.`,
    match.cheaperPlan,
    null,
    savings
  );
}

/**
 * Rule 2 — Enterprise Downgrade.
 * If the team has < 50 people and their cost-per-seat exceeds the standard
 * Business/Team tier, recommend moving to centralized billing.
 */
function ruleEnterpriseDowngrade(tool: ToolState, team: TeamData): AuditResult | null {
  const name = resolveName(tool);
  const plan = resolvePlan(tool);

  if (plan !== "Enterprise") return null;
  if (team.teamSize >= ENTERPRISE_SEAT_THRESHOLD) return null;

  const costPerSeat = tool.monthlySpend / Math.max(tool.seats, 1);

  // Determine the best non-Enterprise tier for this tool
  const tiers = TOOL_PRICING[name];
  if (!tiers) return null;

  let bestPlan: string | null = null;
  let bestPrice: number | null = null;

  for (const [tierName, tierPrice] of Object.entries(tiers)) {
    if (tierName === "Enterprise" || tierPrice === null || tierPrice === 0) continue;
    if (bestPrice === null || tierPrice < bestPrice) {
      bestPrice = tierPrice;
      bestPlan = tierName;
    }
  }

  if (bestPlan === null || bestPrice === null) return null;
  if (costPerSeat <= bestPrice) return null; // already paying less

  const savings = (costPerSeat - bestPrice) * tool.seats;
  if (savings <= 0) return null;

  return buildResult(
    tool,
    "DOWNGRADE_PLAN",
    `Your ${name} Enterprise contract costs $${costPerSeat.toFixed(2)}/seat/mo. A team of ${team.teamSize} qualifies for centralized ${bestPlan} billing at $${bestPrice}/seat/mo — saving $${savings.toFixed(0)}/mo.`,
    bestPlan as PlanName,
    null,
    savings
  );
}

/**
 * Rule 3 — Copilot + Premium LLM Redundancy.
 * Coding teams paying for both GitHub Copilot AND a paid ChatGPT/Claude
 * subscription can consolidate into a single tool (Cursor Business or
 * Windsurf Teams, $40/user) that bundles IDE completion + frontier chat.
 *
 * This rule is applied at the report level (needs the full tool list) and
 * emits a result for the *more expensive* of the two overlapping tools.
 */
function ruleCopilotRedundancy(
  tools: ToolState[],
  team: TeamData
): AuditResult | null {
  if (resolveUseCase(team) !== "coding") return null;

  const copilot = tools.find((t) => {
    const n = resolveName(t);
    const p = resolvePlan(t);
    return n === "GitHub Copilot" && p !== "Free";
  });
  if (!copilot) return null;

  const premiumLLM = tools.find((t) => {
    const n = resolveName(t);
    const p = resolvePlan(t);
    return (
      (n === "ChatGPT" && (p === "Plus" || p === "Team" || p === "Enterprise")) ||
      (n === "Claude"  && (p === "Pro"  || p === "Team (Standard Seat)" || p === "Team (Premium Seat)" || p === "Enterprise"))
    );
  });
  if (!premiumLLM) return null;

  // The tool flagged is whichever costs more
  const primaryTool = copilot.monthlySpend >= premiumLLM.monthlySpend ? copilot : premiumLLM;
  const seats = Math.max(primaryTool.seats, 1);

  // Recommend consolidating to Cursor Business ($40/user)
  const consolidatedPrice = 40; // Cursor Business
  const consolidatedTotal = consolidatedPrice * seats;
  const combinedCurrentSpend = copilot.monthlySpend + premiumLLM.monthlySpend;
  const savings = combinedCurrentSpend - consolidatedTotal;
  if (savings <= 0) return null;

  return buildResult(
    primaryTool,
    "REMOVE_REDUNDANCY",
    `Your coding team is paying for both GitHub Copilot and ${resolveName(premiumLLM)} — overlapping tools for a combined $${combinedCurrentSpend}/mo. Consolidating to Cursor Business ($${consolidatedPrice}/seat) covers IDE completion + frontier models for $${consolidatedTotal}/mo, saving $${savings.toFixed(0)}/mo.`,
    "Business" as PlanName,
    "Cursor",
    savings
  );
}

/**
 * Rule 4 — API Efficiency.
 * Teams spending > $100/mo on OpenAI API or Anthropic API for data/research
 * workflows can cut token costs ~50% by switching to Haiku or Gemini Flash.
 */
function ruleApiEfficiency(tool: ToolState, team: TeamData): AuditResult | null {
  const name = resolveName(tool);
  if (name !== "OpenAI API" && name !== "Anthropic API") return null;

  const uc = resolveUseCase(team);
  if (uc !== "data" && uc !== "research") return null;

  if (tool.monthlySpend <= API_EFFICIENCY_THRESHOLD) return null;

  const savings = tool.monthlySpend * API_EFFICIENCY_SAVINGS_RATE;
  const cheapModel = name === "OpenAI API" ? "GPT-4o-mini" : "Claude 3 Haiku";
  const altModel   = "Gemini 1.5 Flash";

  return buildResult(
    tool,
    "API_EFFICIENCY",
    `Your ${name} spend of $${tool.monthlySpend}/mo is dominated by bulk ${uc} processing. Routing non-critical requests through ${cheapModel} or ${altModel} (up to 95% cheaper per token) can conservatively cut costs by 50% — an estimated $${savings.toFixed(0)}/mo saving.`,
    null,
    null,
    savings
  );
}

// ─── Per-Tool Fallback Evaluation ────────────────────────────────────────────
// Runs after global rules so it only fires on tools not already flagged.

function evaluateTool(tool: ToolState): AuditResult {
  const seats = tool.seats;
  const spend  = tool.monthlySpend;

  if (seats === 0)  return optimal(tool, "No seats allocated — nothing to optimise.");
  if (spend  === 0) return optimal(tool, "You are on a free plan — no spend to reduce.");

  // Per-tool same-vendor cheaper plan scan
  const name = resolveName(tool);
  const plan = resolvePlan(tool);
  const tiers = TOOL_PRICING[name];
  if (!tiers) return optimal(tool, `Your ${name} ${plan} plan is appropriately sized. Keep current plan.`);

  const currentPerSeat = spend / seats;
  let bestPlan: string | null = null;
  let bestPrice: number | null = null;

  for (const [tierName, tierPrice] of Object.entries(tiers)) {
    if (tierName === plan || tierPrice === null || tierPrice === 0) continue;
    if (tierPrice < currentPerSeat && (bestPrice === null || tierPrice < bestPrice)) {
      bestPrice = tierPrice;
      bestPlan  = tierName;
    }
  }

  if (bestPlan !== null && bestPrice !== null) {
    const savings = (currentPerSeat - bestPrice) * seats;
    if (savings > 0) {
      return buildResult(
        tool,
        "DOWNGRADE_PLAN",
        `Switching from ${name} ${plan} ($${currentPerSeat}/seat) to ${bestPlan} ($${bestPrice}/seat) saves $${savings.toFixed(0)}/mo.`,
        bestPlan as PlanName,
        null,
        savings
      );
    }
  }

  return optimal(tool, `Optimized. Keep current plan.`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Runs the full audit for a team against their tool stack.
 *
 * Accepts either the explicit `(team, tools)` signature (per spec) or the
 * legacy `(FormState)` signature used by existing tests and the form component.
 *
 * Returns an AuditReport with per-tool results and aggregate totals.
 */
export function runAudit(teamOrForm: TeamData | FormState, toolsArg?: ToolState[]): AuditReport {
  let team: TeamData;
  let tools: ToolState[];

  if (toolsArg !== undefined) {
    // Spec signature: runAudit(team, tools)
    team  = teamOrForm as TeamData;
    tools = toolsArg;
  } else {
    // Legacy signature: runAudit(formState)
    const form = teamOrForm as FormState;
    team  = form.team;
    tools = form.tools;
  }

  if (tools.length === 0) {
    return { team, results: [], totalMonthlySavings: 0, totalAnnualSavings: 0 };
  }

  // Track which tool IDs have been handled by a global rule
  const handled = new Set<string>();
  const results: AuditResult[] = [];

  // ── Global Rule 3: Copilot + Premium LLM redundancy (cross-tool) ──────────
  const redundancyResult = ruleCopilotRedundancy(tools, team);
  if (redundancyResult) {
    results.push(redundancyResult);
    handled.add(redundancyResult.toolId);
  }

  // ── Per-tool rules ────────────────────────────────────────────────────────
  for (const tool of tools) {
    if (handled.has(tool.id)) continue;

    // Collect candidates from all applicable rules; pick highest savings.
    const candidates: AuditResult[] = [];

    const r1 = ruleSoloOverkill(tool);
    if (r1) candidates.push(r1);

    const r2 = ruleEnterpriseDowngrade(tool, team);
    if (r2) candidates.push(r2);

    const r4 = ruleApiEfficiency(tool, team);
    if (r4) candidates.push(r4);

    // Fallback: generic same-vendor scan
    const fallback = evaluateTool(tool);
    candidates.push(fallback);

    // Winner = highest savings (OPTIMAL has 0, so it only wins when no rule fires)
    const winner = candidates.reduce((best, c) =>
      c.monthlySavings > best.monthlySavings ? c : best
    );
    results.push(winner);
  }

  const totalMonthlySavings = +results.reduce((s, r) => s + r.monthlySavings, 0).toFixed(2);
  const totalAnnualSavings  = +(totalMonthlySavings * 12).toFixed(2);

  return { team, results, totalMonthlySavings, totalAnnualSavings };
}
