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

export type CursorPlan    = "Hobby" | "Pro" | "Business" | "Enterprise";
export type CopilotPlan   = "Individual" | "Business" | "Enterprise";
export type ClaudePlan    = "Free" | "Pro" | "Team (Standard Seat)" | "Team (Premium Seat)" | "Enterprise" | "API Direct";
export type ChatGPTPlan   = "Plus" | "Team" | "Enterprise" | "API Direct";
export type AnthropicApiPlan = "API Direct";
export type OpenAiApiPlan    = "API Direct";
export type GeminiPlan    = "Free" | "Plus" | "Pro" | "Ultra" | "API Direct";
export type WindsurfPlan  = "Free" | "Pro" | "Max" | "Teams" | "Enterprise";

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
  /**
   * Primary workflow the team uses AI for.
   * Aliased as `primaryUseCase` per spec; internally we also expose `useCase`
   * for backwards-compat with existing form/test code.
   */
  primaryUseCase: UseCase;
  /** @deprecated Use `primaryUseCase`. Kept for backwards-compat with existing tests. */
  useCase?: UseCase;
}

/** State for a single AI tool row in the spend form. */
export interface ToolState {
  /** Stable ID for React list key. */
  id: string;
  /**
   * Display name of the tool.
   * Aliased as `name` per spec; `toolName` preserved for backwards-compat.
   */
  name: ToolName;
  /** @deprecated Use `name`. Kept for backwards-compat with existing tests. */
  toolName?: ToolName;
  /**
   * Active billing plan.
   * Aliased as `plan` per spec; `planName` preserved for backwards-compat.
   */
  plan: PlanName;
  /** @deprecated Use `plan`. Kept for backwards-compat with existing tests. */
  planName?: PlanName;
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
  | "API_EFFICIENCY"       // Cheaper API model available for bulk processing
  | "OPTIMAL";             // Current setup is already the best option

/** One recommendation per evaluated tool entry. */
export interface AuditResult {
  /** Which ToolState this result corresponds to. */
  toolId: string;
  /** Display name — mirrors ToolState.name for convenience. */
  toolName: ToolName;
  currentSpend: number;
  /** @deprecated Use `currentSpend`. Kept for backwards-compat with existing tests. */
  currentMonthlySpend?: number;
  /** Short action token (e.g. "DOWNGRADE_PLAN"). */
  recommendedAction: ActionType;
  /** Human-readable, one-sentence reason shown in the UI. */
  reasoning: string;
  /** @deprecated Use `reasoning`. Kept for backwards-compat with existing tests. */
  reason?: string;
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
  team: TeamData;
  results: AuditResult[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
}
