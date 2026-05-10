'use client'

import { useState } from 'react'
import SpendForm from '@/components/SpendForm'
import AuditResults from '@/components/AuditResults'
import { runAudit } from '@/lib/engine'
import type { FormState, AuditReport } from '@/types/audit'

export default function Home() {
  const [report, setReport] = useState<AuditReport | null>(null)

  function handleSubmit(state: FormState) {
    const result = runAudit(state)
    setReport(result)
  }

  function handleReset() {
    setReport(null)
  }

  return (
    <main className="min-h-screen bg-zinc-50">
      {report === null ? (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900">Lumen</h1>
            <p className="mt-2 text-zinc-500">Audit your AI spend. Find what you&apos;re wasting.</p>
          </div>
          <SpendForm onSubmit={handleSubmit} />
        </div>
      ) : (
        <AuditResults
          team={report.team}
          results={report.results}
          totalMonthlySavings={report.totalMonthlySavings}
          onReset={handleReset}
        />
      )}
    </main>
  )
}
