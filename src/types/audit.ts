// ─── Tool Catalogue ──────────────────────────────────────────────────────────

export type ToolName =
  | "Cursor"
  | "GitHub Copilot"
  | "Claude"
  | "ChatGPT"
  | "Anthropic API"
  | "OpenAI API"
  | "Gemini"
  | "Windsurf";

export type UseCase =
  | "coding"
  | "writing"
  | "data"
  | "research"
  | "mixed";

// ─── Plan Definitions ─────────────────────────────────────────────────────────

/**
 * Each tool has a fixed set of plans. Using a discriminated union approach
 * keeps plan names and their pricing strictly associated with the right tool.
 */

export type CursorPlan = "Hobby" | "Pro" | "Business" | "Enterprise";
export type CopilotPlan = "Individual" | "Business" | "Enterprise";
export type ClaudePlan = "Free" | "Pro" | "Team" | "Enterprise";
export type ChatGPTPlan = "Free" | "Plus" | "Team" | "Enterprise";
export type AnthropicApiPlan = "Pay-as-you-go";
export type OpenAiApiPlan = "Pay-as-you-go";
export type GeminiPlan = "Free" | "Advanced" | "Business" | "Enterprise";
export type WindsurfPlan = "Free" | "Pro" | "Teams" | "Enterprise";

export type PlanName =
  | CursorPlan
  | CopilotPlan
  | ClaudePlan
  | ChatGPTPlan
  | AnthropicApiPlan
  | OpenAiApiPlan
  | GeminiPlan
  | WindsurfPlan;

// ─── Core State Models ────────────────────────────────────────────────────────

/** Top-level team context captured from the form. */
export interface TeamData {
  /** Total headcount across the team. */
  teamSize: number;
  /** Primary workflow the team uses AI for. */
  useCase: UseCase;
}

/** State for a single AI tool row in the spend form. */
export interface ToolState {
  /** Stable ID for React list key. */
  id: string;
  toolName: ToolName;
  planName: PlanName;
  /** Actual monthly dollars currently being paid (can include negotiated rates). */
  monthlySpend: number;
  /** Number of paid seats / licenses for this tool. */
  seats: number;
}

/** The complete form state that is persisted to localStorage. */
export interface FormState {
  team: TeamData;
  tools: ToolState[];
}

// ─── Audit Result ─────────────────────────────────────────────────────────────

export type ActionType =
  | "DOWNGRADE_PLAN"       // User is on an oversized plan within same vendor
  | "UPGRADE_PLAN"         // User would save money by consolidating seats on a higher tier
  | "SWITCH_TOOL"          // A competing tool is materially cheaper for their use case
  | "REMOVE_REDUNDANCY"    // Two tools overlap heavily; one can be dropped
  | "OPTIMAL";             // Current setup is already the best option

/** One recommendation per evaluated tool entry. */
export interface AuditResult {
  /** Which ToolState this result corresponds to. */
  toolId: string;
  toolName: ToolName;
  currentMonthlySpend: number;
  recommendedAction: ActionType;
  /** Human-readable, one-sentence reason shown in the UI. */
  reason: string;
  /** The recommended plan name (null when OPTIMAL or SWITCH_TOOL). */
  recommendedPlan: PlanName | null;
  /** The alternative tool to switch to (null unless SWITCH_TOOL). */
  recommendedTool: ToolName | null;
  /** How much cheaper the recommendation is per month (0 when OPTIMAL). */
  monthlySavings: number;
  annualSavings: number;
}

/** Aggregate output returned by the audit engine. */
export interface AuditReport {
  results: AuditResult[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
}
