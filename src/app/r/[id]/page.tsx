import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { getSupabase } from "@/lib/supabase";
import AuditResults from "@/components/AuditResults";
import type { AuditResult } from "@/types/audit";

interface PageProps {
  params: Promise<{ id: string }>;
}

// ─── Fetch Helper ────────────────────────────────────────────────────────────

/**
 * Fetches the lead data.
 * DATA STRIPPING: Only selects the aggregate savings and the audit payload.
 * Email, company name, and timestamps are explicitly omitted from the query
 * so no PII ever crosses the server-client boundary on this public route.
 */
async function getPublicAuditData(id: string) {
  const { data, error } = await getSupabase()
    .from("leads")
    .select("total_monthly_savings, audit_data, team_size")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return {
    team: { teamSize: data.team_size as number, primaryUseCase: "coding" as const },
    totalMonthlySavings: data.total_monthly_savings as number,
    auditData: data.audit_data as AuditResult[],
  };
}

// ─── Open Graph Metadata ──────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const lead = await getPublicAuditData(id);

  if (!lead) {
    return { title: "Audit Not Found - Lumen" };
  }

  const formattedSavings = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(lead.totalMonthlySavings);

  const title = `I just found ${formattedSavings}/mo in AI tool savings`;
  const description = "Check out my AI spend audit and see how much your team could save by optimizing your stack.";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ─── Server Component ────────────────────────────────────────────────────────

export default async function SharedReportPage({ params }: PageProps) {
  const { id } = await params;
  const lead = await getPublicAuditData(id);

  if (!lead) {
    notFound();
  }

  // Server action to restart the flow from the shared page
  async function handleReset() {
    "use server";
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-zinc-50 pb-12">
      <div className="mx-auto max-w-3xl px-4 pt-8 text-center sm:px-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-violet-800 shadow-sm">
          <span className="flex h-2 w-2 rounded-full bg-violet-500"></span>
          Shared Audit Report
        </div>
      </div>
      <AuditResults
        team={lead.team}
        results={lead.auditData}
        totalMonthlySavings={lead.totalMonthlySavings}
        onReset={handleReset}
      />
    </main>
  );
}
