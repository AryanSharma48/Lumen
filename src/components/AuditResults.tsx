'use client'

import { useState, useEffect } from 'react'
import type { AuditResult, ActionType } from '@/types/audit'

// ─── Props ────────────────────────────────────────────────────────────────────

interface AuditResultsProps {
  results: AuditResult[]
  totalMonthlySavings: number
  onReset: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const ACTION_META: Record<ActionType, { label: string; colour: string }> = {
  DOWNGRADE_PLAN:    { label: 'Downgrade Plan',   colour: 'bg-amber-100 text-amber-800' },
  UPGRADE_PLAN:      { label: 'Upgrade Plan',      colour: 'bg-blue-100 text-blue-800' },
  SWITCH_TOOL:       { label: 'Switch Tool',       colour: 'bg-violet-100 text-violet-800' },
  REMOVE_REDUNDANCY: { label: 'Remove Redundancy', colour: 'bg-rose-100 text-rose-800' },
  API_EFFICIENCY:    { label: 'API Efficiency',    colour: 'bg-teal-100 text-teal-800' },
  OPTIMAL:           { label: 'Optimized ✓',       colour: 'bg-emerald-100 text-emerald-800' },
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmailCapture({
  id,
  label,
  placeholder,
  buttonText,
  buttonClass,
}: {
  id: string
  label: string
  placeholder: string
  buttonText: string
  buttonClass: string
}) {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    // TODO: wire to email provider / Supabase
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <p className="text-sm font-medium text-emerald-700">
        ✓ Got it — we&apos;ll be in touch at <span className="font-semibold">{email}</span>.
      </p>
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
        className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900"
      />
      <button
        type="submit"
        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 ${buttonClass}`}
      >
        {buttonText}
      </button>
    </form>
  )
}

function AISummaryPlaceholder() {
  return (
    <section aria-label="AI Personalized Summary" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs text-white">✦</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">AI Personalized Summary</h2>
      </div>
      {/* Loading skeleton */}
      <div className="space-y-3" aria-hidden="true">
        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100" />
        <div className="h-4 w-4/6 animate-pulse rounded bg-zinc-100" />
      </div>
      <p className="mt-3 text-xs text-zinc-400">Generating your personalized savings analysis…</p>
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
    <section aria-label="AI Personalized Summary" className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-xs text-white">✦</span>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">AI Personalized Summary</h2>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-line">{summary}</p>
    </section>
  )
}

function ToolCard({ result }: { result: AuditResult }) {
  const meta = ACTION_META[result.recommendedAction]
  const isOptimal = result.recommendedAction === 'OPTIMAL'
  const reasoning = result.reasoning ?? result.reason ?? ''

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      {/* Header row */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            {result.toolName}
          </p>
          <p className="mt-0.5 text-base font-semibold text-zinc-900">
            {fmt(result.currentSpend ?? result.currentMonthlySpend ?? 0)}
            <span className="ml-1 text-sm font-normal text-zinc-500">/mo current</span>
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${meta.colour}`}>
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

function HighSavingsCTA({ monthly }: { monthly: number }) {
  return (
    <section
      aria-label="Credex Consultation"
      className="relative overflow-hidden rounded-2xl bg-zinc-900 p-6 text-white shadow-xl sm:p-8"
    >
      {/* Decorative gradient blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-violet-600 to-indigo-500 opacity-20 blur-3xl"
      />
      <div className="relative">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Credex — Free Consultation
        </p>
        <h2 className="text-2xl font-bold leading-tight sm:text-3xl">
          You could save {fmt(monthly * 12)} this year.
          <br />
          <span className="text-violet-400">Let&apos;s capture every dollar.</span>
        </h2>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-zinc-300">
          Our team specialises in AI procurement and vendor negotiation. Book a free 30-minute strategy
          call and we&apos;ll map a concrete implementation plan — no strings attached.
        </p>
        <div className="mt-6">
          <EmailCapture
            id="cta-high-email"
            label="Email for Credex consultation"
            placeholder="you@company.com"
            buttonText="Book Free Call →"
            buttonClass="bg-violet-600 text-white hover:bg-violet-500"
          />
        </div>
      </div>
    </section>
  )
}

function OptimizedCTA() {
  return (
    <section
      aria-label="Stack already optimized"
      className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-semibold text-emerald-800">Your stack is highly optimized. 🎉</p>
        <p className="mt-1 text-sm text-emerald-700">
          You&apos;re spending well. Get notified when AI pricing changes affect your tools.
        </p>
      </div>
      <div className="min-w-0 sm:w-80">
        <EmailCapture
          id="cta-optimized-email"
          label="Email for pricing alerts"
          placeholder="you@company.com"
          buttonText="Notify me"
          buttonClass="bg-emerald-700 text-white"
        />
      </div>
    </section>
  )
}

function StandardCTA() {
  return (
    <section
      aria-label="Save this report"
      className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="font-semibold text-zinc-900">Save this report</p>
        <p className="mt-1 text-sm text-zinc-600">
          We&apos;ll email you a full breakdown with implementation steps.
        </p>
      </div>
      <div className="min-w-0 sm:w-80">
        <EmailCapture
          id="cta-standard-email"
          label="Email to save report"
          placeholder="you@company.com"
          buttonText="Send report"
          buttonClass="bg-zinc-900 text-white"
        />
      </div>
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AuditResults({ results, totalMonthlySavings, onReset }: AuditResultsProps) {
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
        <HighSavingsCTA monthly={totalMonthlySavings} />
      ) : totalMonthlySavings < 100 ? (
        <OptimizedCTA />
      ) : (
        <StandardCTA />
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
