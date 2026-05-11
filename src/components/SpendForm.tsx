'use client'

import { useEffect, useReducer, useCallback } from 'react'
import type { FormState, ToolName, PlanName, UseCase, ToolState } from '@/types/audit'
import { TOOL_PRICING } from '@/lib/engine'

// ─── Constants ────────────────────────────────────────────────────────────────

const TOOL_NAMES: ToolName[] = [
  'Cursor',
  'GitHub Copilot',
  'Claude',
  'ChatGPT',
  'Anthropic API',
  'OpenAI API',
  'Gemini',
  'Windsurf',
]

const PLANS_BY_TOOL: Record<ToolName, PlanName[]> = {
  'Cursor':         ['Hobby', 'Pro', 'Business', 'Enterprise'],
  'GitHub Copilot': ['Individual', 'Business', 'Enterprise'],
  'Claude':         ['Free', 'Pro', 'Team (Standard Seat)', 'Team (Premium Seat)', 'Enterprise', 'API Direct'],
  'ChatGPT':        ['Plus', 'Team', 'Enterprise', 'API Direct'],
  'Anthropic API':  ['API Direct'],
  'OpenAI API':     ['API Direct'],
  'Gemini':         ['Free', 'Plus', 'Pro', 'Ultra', 'API Direct'],
  'Windsurf':       ['Free', 'Pro', 'Max', 'Teams', 'Enterprise'],
}

const USE_CASES: { value: UseCase; label: string }[] = [
  { value: 'coding',   label: 'Coding' },
  { value: 'writing',  label: 'Writing' },
  { value: 'data',     label: 'Data' },
  { value: 'research', label: 'Research' },
  { value: 'mixed',    label: 'Mixed' },
]

const LS_KEY = 'lumen_form_state'

// ─── Default State ─────────────────────────────────────────────────────────

const DEFAULT_FORM: FormState = {
  team: { teamSize: 1, useCase: 'coding', primaryUseCase: 'coding' },
  tools: [],
}

function makeToolRow(overrides: Partial<ToolState> = {}): ToolState {
  const toolName: ToolName = overrides.toolName ?? overrides.name ?? 'Cursor'
  const planName: PlanName = overrides.planName ?? overrides.plan ?? PLANS_BY_TOOL[toolName][0]
  const pricePerSeat = TOOL_PRICING[toolName]?.[planName] ?? 0
  const seats = overrides.seats ?? 1
  return {
    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    toolName,
    name: toolName,
    planName,
    plan: planName,
    monthlySpend: overrides.monthlySpend ?? (pricePerSeat * seats),
    seats,
    ...overrides,
  }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_STATE'; payload: FormState }
  | { type: 'SET_TEAM_SIZE'; payload: number | '' }
  | { type: 'SET_USE_CASE'; payload: UseCase }
  | { type: 'ADD_TOOL' }
  | { type: 'REMOVE_TOOL'; id: string }
  | { type: 'UPDATE_TOOL'; id: string; field: keyof ToolState; value: string | number }

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload

    case 'SET_TEAM_SIZE':
      return { ...state, team: { ...state.team, teamSize: action.payload as unknown as number } }

    case 'SET_USE_CASE':
      return { ...state, team: { ...state.team, useCase: action.payload, primaryUseCase: action.payload } }

    case 'ADD_TOOL':
      return { ...state, tools: [...state.tools, makeToolRow()] }

    case 'REMOVE_TOOL':
      return { ...state, tools: state.tools.filter((t) => t.id !== action.id) }

    case 'UPDATE_TOOL': {
      const tools = state.tools.map((t) => {
        if (t.id !== action.id) return t
        const updated = { ...t, [action.field]: action.value }
        
        let recalculateSpend = false
        if (action.field === 'toolName') {
          const newTool = action.value as ToolName
          updated.toolName = newTool
          updated.name = newTool
          updated.planName = PLANS_BY_TOOL[newTool][0]
          updated.plan = updated.planName
          recalculateSpend = true
        }
        if (action.field === 'planName') {
          updated.plan = action.value as PlanName
          if (updated.name === 'Claude' && (updated.plan === 'Team (Standard Seat)' || updated.plan === 'Team (Premium Seat)')) {
            if (Number(updated.seats) < 5) updated.seats = 5
          }
          recalculateSpend = true
        }
        if (action.field === 'seats') {
          recalculateSpend = true
        }

        if (recalculateSpend) {
          const price = TOOL_PRICING[updated.name]?.[updated.plan]
          if (price != null) {
            const currentSeats = (updated.seats as unknown as string) === '' ? 0 : Number(updated.seats)
            updated.monthlySpend = price * currentSeats
          }
        }
        return updated
      })
      return { ...state, tools }
    }

    default:
      return state
  }
}

// ─── Shared input style tokens ────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition'

const selectCls =
  'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 transition'

const labelCls = 'block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1'

// ─── Props ───────────────────────────────────────────────────────────────────

interface SpendFormProps {
  onSubmit: (state: FormState) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpendForm({ onSubmit }: SpendFormProps) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_FORM)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FormState
        dispatch({ type: 'LOAD_STATE', payload: parsed })
      }
    } catch {
      // Corrupted storage — silently ignore
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch {
      // Storage quota exceeded — silently ignore
    }
  }, [state])

  const handleToolChange = useCallback(
    (id: string, field: keyof ToolState, raw: string) => {
      const numericFields: (keyof ToolState)[] = ['monthlySpend', 'seats']
      const value = numericFields.includes(field) ? (raw === '' ? '' : parseFloat(raw)) : raw
      dispatch({ type: 'UPDATE_TOOL', id, field, value: value as never })
    },
    []
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedState: FormState = {
      ...state,
      team: {
        ...state.team,
        teamSize: (state.team.teamSize as unknown as string) === '' ? 1 : Math.max(1, Number(state.team.teamSize)),
      },
      tools: state.tools.map((t) => ({
        ...t,
        monthlySpend: (t.monthlySpend as unknown as string) === '' ? 0 : Number(t.monthlySpend),
        seats: (t.seats as unknown as string) === '' ? 1 : Number(t.seats),
      })),
    }
    onSubmit(normalizedState)
  }

  const canSubmit = state.tools.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>

      {/* ── Team Section ─────────────────────────────────────────────────── */}
      <section className="glass-panel p-6">
        <h2 className="mb-4 text-base font-semibold text-zinc-900">Your Team</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="team-size" className={labelCls}>Team size</label>
              <input
                id="team-size"
                type="number"
                min={1}
                value={state.team.teamSize}
                onChange={(e) =>
                  dispatch({ type: 'SET_TEAM_SIZE', payload: e.target.value === '' ? '' : parseInt(e.target.value) })
                }
                className={inputCls}
              />
          </div>
          <div>
            <label htmlFor="use-case" className={labelCls}>Primary use case</label>
            <select
              id="use-case"
              value={state.team.primaryUseCase ?? state.team.useCase}
              onChange={(e) =>
                dispatch({ type: 'SET_USE_CASE', payload: e.target.value as UseCase })
              }
              className={selectCls}
            >
              {USE_CASES.map((uc) => (
                <option key={uc.value} value={uc.value}>{uc.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── Tools Section ─────────────────────────────────────────────────── */}
      <section className="glass-panel p-6">
        <h2 className="mb-1 text-base font-semibold text-zinc-900">AI Tool Subscriptions</h2>
        <p className="mb-4 text-sm text-zinc-500">
          Add every AI tool your team pays for, even partially.
        </p>

        {state.tools.length === 0 && (
          <div className="mb-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-center">
            <p className="text-sm text-zinc-400">No tools added yet — click below to start.</p>
          </div>
        )}

        <div className="space-y-3">
          {state.tools.map((tool, idx) => (
            <div
              key={tool.id}
              className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-12"
            >
              {/* Tool Name */}
              <div className="sm:col-span-3">
                <label htmlFor={`tool-name-${tool.id}`} className={labelCls}>
                  Tool {idx + 1}
                </label>
                <select
                  id={`tool-name-${tool.id}`}
                  value={tool.name ?? tool.toolName!}
                  onChange={(e) => handleToolChange(tool.id, 'toolName', e.target.value)}
                  className={selectCls}
                >
                  {TOOL_NAMES.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              {/* Plan */}
              <div className="sm:col-span-4">
                <label htmlFor={`tool-plan-${tool.id}`} className={labelCls}>Plan</label>
                <select
                  id={`tool-plan-${tool.id}`}
                  value={tool.plan ?? tool.planName!}
                  onChange={(e) => handleToolChange(tool.id, 'planName', e.target.value)}
                  className={selectCls}
                >
                  {PLANS_BY_TOOL[tool.name ?? tool.toolName!].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Monthly Spend */}
              <div className="sm:col-span-3">
                <label htmlFor={`tool-spend-${tool.id}`} className={labelCls}>
                  Monthly spend ($)
                </label>
                <input
                  id={`tool-spend-${tool.id}`}
                  type="number"
                  min={0}
                  step={5}
                  value={tool.monthlySpend}
                  onChange={(e) => handleToolChange(tool.id, 'monthlySpend', e.target.value)}
                  className={inputCls}
                />
              </div>

              {/* Seats + Remove */}
              <div className="sm:col-span-2">
                <label htmlFor={`tool-seats-${tool.id}`} className={labelCls}>Seats</label>
                <input
                  id={`tool-seats-${tool.id}`}
                  type="number"
                  min={(tool.name === 'Claude' && (tool.plan === 'Team (Standard Seat)' || tool.plan === 'Team (Premium Seat)')) ? 5 : 1}
                  value={tool.seats}
                  onChange={(e) => handleToolChange(tool.id, 'seats', e.target.value)}
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_TOOL', id: tool.id })}
                  className="mt-1.5 text-xs font-medium text-rose-500 hover:text-rose-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          id="add-tool-btn"
          onClick={() => dispatch({ type: 'ADD_TOOL' })}
          className="mt-4 flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-zinc-400 hover:bg-zinc-50"
        >
          <span className="text-base leading-none">+</span> Add Tool
        </button>
      </section>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <button
        type="submit"
        id="run-audit-btn"
        disabled={!canSubmit}
        className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {canSubmit ? 'Run Audit →' : 'Add at least one tool to run the audit'}
      </button>
    </form>
  )
}
