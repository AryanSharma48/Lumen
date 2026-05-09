import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuditResult } from "@/types/audit";

// ─── Lazy Client Singleton (server-only, uses service role) ───────────────────
//
// We intentionally defer env-var validation to the first *call* of getSupabase()
// rather than throwing at module load time.  Next.js evaluates route modules
// during the build's page-data collection step — throwing at that point would
// break `npm run build` in any environment that doesn't inject secrets (CI, etc.)
//
// NEVER export or call this from browser code.

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
    );
  }

  _client = createClient(url, key, {
    auth: {
      // Service-role clients don't need session persistence.
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

// ─── Database Types ────────────────────────────────────────────────────────────

/**
 * Shape of a row in the `leads` table.
 *
 * SQL reference:
 *   id                uuid        PRIMARY KEY DEFAULT gen_random_uuid()
 *   email             text        NOT NULL
 *   company_name      text
 *   team_size         integer     NOT NULL
 *   total_monthly_savings numeric NOT NULL
 *   audit_data        jsonb       NOT NULL
 *   created_at        timestamptz NOT NULL DEFAULT now()
 */
export interface Lead {
  /** UUID primary key — set by Postgres on insert. */
  id: string;
  email: string;
  /** Optional company / org name provided by the user. */
  companyName: string | null;
  /** Total headcount entered in the spend form. */
  teamSize: number;
  /** Sum of all per-tool monthly savings from the audit engine. */
  totalMonthlySavings: number;
  /** The full array of AuditResult objects produced by the engine. */
  auditData: AuditResult[];
  /** ISO-8601 timestamp set by Postgres. */
  createdAt: string;
}

/**
 * Payload used when inserting a new lead.
 * `id` and `createdAt` are omitted — they are generated server-side.
 */
export type NewLead = Omit<Lead, "id" | "createdAt">;

// ─── Column Map (camelCase ↔ snake_case) ─────────────────────────────────────

/**
 * Converts a `NewLead` (camelCase) into the snake_case column names
 * expected by the Supabase/PostgreSQL `leads` table.
 */
export function toLeadRow(lead: NewLead): Record<string, unknown> {
  return {
    email: lead.email,
    company_name: lead.companyName,
    team_size: lead.teamSize,
    total_monthly_savings: lead.totalMonthlySavings,
    audit_data: lead.auditData,
  };
}
