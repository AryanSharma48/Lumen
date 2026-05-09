import { createClient } from "@supabase/supabase-js";
import type { AuditResult } from "@/types/audit";

// ─── Environment Guards ────────────────────────────────────────────────────────

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Missing Supabase env vars: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
  );
}

// ─── Client Singleton (server-only, uses service role) ────────────────────────

/**
 * Server-side Supabase client using the service-role key.
 * NEVER expose this client to the browser — import only from API routes or
 * server components.
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    // Service-role clients don't need session persistence.
    persistSession: false,
    autoRefreshToken: false,
  },
});

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
