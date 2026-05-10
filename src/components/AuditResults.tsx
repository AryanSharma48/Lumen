'use client'

import { useState, useEffect } from 'react'
import type { AuditResult, ActionType, TeamData } from '@/types/audit'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuditResultsProps {
  team?: TeamData
  results: AuditResult[]
  totalMonthlySavings: number
  onReset: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const ACTION_META: Record<ActionType, { label: string; colour: string }> = {
  DOWNGRADE_PLAN:    { label: 'Downgrade Plan',   colour: 'bg-amber-100 text-amber-800 border-amber-200' },
  UPGRADE_PLAN:      { label: 'Upgrade Plan',      colour: 'bg-blue-100 text-blue-800 border-blue-200' },
  SWITCH_TOOL:       { label: 'Switch Tool',       colour: 'bg-violet-100 text-violet-800 border-violet-200' },
  REMOVE_REDUNDANCY: { label: 'Remove Redundancy', colour: 'bg-rose-100 text-rose-800 border-rose-200' },
  API_EFFICIENCY:    { label: 'API Efficiency',    colour: 'bg-teal-100 text-teal-800 border-teal-200' },
  OPTIMAL:           { label: 'Optimized ✓',       colour: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmailCapture({
  id,
  label,
  placeholder,
  buttonText,
  buttonClass,
  results,
  totalMonthlySavings,
  team,
}: {
  id: string
  label: string
  placeholder: string
  buttonText: string
  buttonClass: string
  results: AuditResult[]
  totalMonthlySavings: number
  team?: TeamData
}) {
  const [email, setEmail] = useState('')
  const [hp, setHp] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || status === 'loading') return
    
    setStatus('loading')

    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          teamSize: team?.teamSize ?? 1,
          totalMonthlySavings,
          auditData: results,
          _hp: hp, // Honeypot
        }),
      })

      if (!res.ok) throw new Error('Capture failed')
      setStatus('success')
    } catch (err) {
      console.error('[capture] Error:', err)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex items-start gap-3 text-sm font-medium text-emerald-600 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] mt-0.5">✓</span>
        <p className="leading-snug">
          Got it — we&apos;ll be in touch at <span className="font-semibold break-all">{email}</span>.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:items-center"
      aria-label={label}
    >
      <label htmlFor={id} className="sr-only">{label}</label>
      <input
        id={id}
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        disabled={status === 'loading'}
        className="flex-1 rounded-lg border border-zinc-200 bg-white/80 backdrop-blur-sm px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
      />
      
      {/* Honeypot field - invisible to humans */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
      />

      <button
        type="submit"
        disabled={status === 'loading'}
        className={`rounded-lg px-6 py-2.5 text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${buttonClass}`}
      >
        {status === 'loading' ? 'Sending...' : buttonText}
      </button>
      {status === 'error' && (
        <p className="text-[10px] text-rose-500 mt-1 sm:absolute sm:mt-12">Failed to send. Please try again.</p>
      )}
    </form>
  )
}

function AISummaryPlaceholder() {
  return (
    <section aria-label="AI Personalized Summary" className="glass-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] text-white shadow-lg shadow-violet-500/20">✦</span>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">AI Analysis</h2>
      </div>
      <div className="space-y-3" aria-hidden="true">
        <div className="h-3 w-full animate-pulse rounded-full bg-zinc-100" />
        <div className="h-3 w-5/6 animate-pulse rounded-full bg-zinc-100" />
        <div className="h-3 w-4/6 animate-pulse rounded-full bg-zinc-100" />
      </div>
    </section>
  )
}

function AISummary({ results, totalMonthlySavings }: { results: AuditResult[], totalMonthlySavings: number }) {
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<boolean>(false)

  useEffect(() => {
    let ignore = false
    async function fetchSummary() {
      try {
        const res = await fetch('/api/summary', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results, totalMonthlySavings })
        })
        if (!res.ok) throw new Error('Failed to fetch summary')
        const data = await res.json()
        if (!ignore) setSummary(data.summary)
      } catch (err) {
        if (!ignore) setError(true)
      }
    }
    fetchSummary()
    return () => { ignore = true }
  }, [results, totalMonthlySavings])

  if (error) {
    return (
      <section aria-label="AI Personalized Summary" className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
        <p className="text-sm text-rose-700">Unable to generate summary at this time.</p>
      </section>
    )
  }

  if (!summary) {
    return <AISummaryPlaceholder />
  }

  return (
    <section aria-label="AI Personalized Summary" className="glass-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] text-white shadow-lg shadow-violet-500/20">✦</span>
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">AI Analysis</h2>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line selection:bg-violet-100">{summary}</p>
    </section>
  )
}

function ToolCard({ result }: { result: AuditResult }) {
  const meta = ACTION_META[result.recommendedAction]
  const isOptimal = result.recommendedAction === 'OPTIMAL'
  const reasoning = result.reasoning ?? result.reason ?? ''

  return (
    <article className="glass-panel p-5 transition-all hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-200/50 group">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-violet-500 transition-colors">
            {result.toolName}
          </p>
          <p className="mt-0.5 text-base font-semibold text-zinc-900">
            {fmt(result.currentSpend ?? result.currentMonthlySpend ?? 0)}
            <span className="ml-1 text-sm font-normal text-zinc-500">/mo current</span>
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.colour}`}>
          {meta.label}
        </span>
      </div>

      {/* Reasoning */}
      <p className="mt-3 text-sm leading-relaxed text-zinc-600">{reasoning}</p>

      {/* Savings footer */}
      {!isOptimal && result.monthlySavings > 0 && (
        <div className="mt-4 flex flex-wrap gap-4 rounded-xl bg-emerald-50 px-4 py-3">
          <div>
            <p className="text-xs text-emerald-600">Monthly saving</p>
            <p className="text-lg font-bold text-emerald-700">{fmt(result.monthlySavings)}</p>
          </div>
          <div className="border-l border-emerald-200 pl-4">
            <p className="text-xs text-emerald-600">Annual saving</p>
            <p className="text-lg font-bold text-emerald-700">{fmt(result.annualSavings)}</p>
          </div>
        </div>
      )}
    </article>
  )
}

// ─── CTA Banners ─────────────────────────────────────────────────────────────

function HighSavingsCTA({ monthly, results, team }: { monthly: number; results: AuditResult[]; team?: TeamData }) {
  return (
    <section
      aria-label="Executive Consultation"
      className="relative overflow-hidden rounded-2xl bg-zinc-900 p-8 text-white shadow-2xl shadow-violet-500/20 sm:p-10"
    >
      {/* Decorative gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-500 opacity-30 blur-[100px]"
      />
      <div className="relative">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400">
          Executive Consultation
        </p>
        <h2 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
          You could save <span className="text-violet-400">{fmt(monthly * 12)}</span> this year.
          <br />
          <span className="opacity-90">Let&apos;s capture every dollar.</span>
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-400">
          Our experts specialise in AI procurement and vendor negotiation. Book a free 30-minute strategy
          call and we&apos;ll map a concrete implementation plan.
        </p>
        <div className="mt-8">
          <EmailCapture
            id="cta-high-email"
            label="Email for expert consultation"
            placeholder="you@company.com"
            buttonText="Book Free Call →"
            buttonClass="bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-600/30"
            results={results}
            totalMonthlySavings={monthly}
            team={team}
          />
        </div>
      </div>
    </section>
  )
}

function OptimizedCTA({ results, monthly, team }: { results: AuditResult[]; monthly: number; team?: TeamData }) {
  return (
    <section
      aria-label="Stack already optimized"
      className="flex flex-col gap-6 glass-panel border-emerald-200 bg-emerald-50/50 p-8 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-lg font-bold text-emerald-900 tracking-tight">Your stack is highly optimized. 🎉</p>
        <p className="mt-1 text-sm text-emerald-700/80">
          You&apos;re spending well. Get notified when AI pricing changes affect your tools.
        </p>
      </div>
      <div className="min-w-0 sm:w-80">
        <EmailCapture
          id="cta-optimized-email"
          label="Email for pricing alerts"
          placeholder="you@company.com"
          buttonText="Notify me"
          buttonClass="bg-emerald-700 text-white shadow-lg shadow-emerald-700/20"
          results={results}
          totalMonthlySavings={monthly}
          team={team}
        />
      </div>
    </section>
  )
}

function StandardCTA({ results, monthly, team }: { results: AuditResult[]; monthly: number; team?: TeamData }) {
  return (
    <section
      aria-label="Save this report"
      className="flex flex-col gap-6 glass-panel p-8 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-lg font-bold text-zinc-900 tracking-tight">Save this report</p>
        <p className="mt-1 text-sm text-zinc-500">
          We&apos;ll email you a full breakdown with implementation steps.
        </p>
      </div>
      <div className="min-w-0 sm:w-80">
        <EmailCapture
          id="cta-standard-email"
          label="Email to save report"
          placeholder="you@company.com"
          buttonText="Send report"
          buttonClass="bg-zinc-900 text-white shadow-lg shadow-zinc-900/20"
          results={results}
          totalMonthlySavings={monthly}
          team={team}
        />
      </div>
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditResults({ team, results, totalMonthlySavings, onReset }: AuditResultsProps) {
  const annualSavings = totalMonthlySavings * 12
  const hasResults = results.length > 0

  // Sort: highest savings first, OPTIMAL last
  const sorted = [...results].sort((a, b) => b.monthlySavings - a.monthlySavings)

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <header className="rounded-2xl bg-zinc-900 px-6 py-10 text-center text-white shadow-xl sm:px-10">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Lumen Audit Report
        </p>
        {totalMonthlySavings > 0 ? (
          <>
            <p className="text-5xl font-extrabold tracking-tight sm:text-6xl">
              {fmt(totalMonthlySavings)}
              <span className="ml-2 text-2xl font-semibold text-zinc-400">/mo</span>
            </p>
            <p className="mt-2 text-lg text-zinc-300">
              in identified savings —{' '}
              <span className="font-bold text-emerald-400">{fmt(annualSavings)} per year</span>
            </p>
          </>
        ) : (
          <>
            <p className="text-4xl font-extrabold tracking-tight sm:text-5xl">
              Fully Optimized
            </p>
            <p className="mt-2 text-lg text-zinc-300">
              No savings found — your stack is already lean.
            </p>
          </>
        )}
        <button
          onClick={onReset}
          id="audit-reset-btn"
          className="mt-6 rounded-full border border-zinc-700 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          ← Start over
        </button>
      </header>

      {/* ── AI Summary ────────────────────────────────────────── */}
      <AISummary results={results} totalMonthlySavings={totalMonthlySavings} />

      {/* ── CTA Banner (conditional) ──────────────────────────────────────── */}
      {totalMonthlySavings > 500 ? (
        <HighSavingsCTA monthly={totalMonthlySavings} results={results} team={team} />
      ) : totalMonthlySavings < 100 ? (
        <OptimizedCTA results={results} monthly={totalMonthlySavings} team={team} />
      ) : (
        <StandardCTA results={results} monthly={totalMonthlySavings} team={team} />
      )}

      {/* ── Per-Tool Breakdown ────────────────────────────────────────────── */}
      {hasResults && (
        <section aria-label="Per-tool breakdown">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Tool-by-Tool Breakdown
          </h2>
          <div className="space-y-4">
            {sorted.map((result) => (
              <ToolCard key={result.toolId} result={result} />
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="text-center text-xs text-zinc-400">
        Pricing data verified 2026-05-08 · Results are estimates based on public pricing pages.
      </footer>
    </div>
  )
}
