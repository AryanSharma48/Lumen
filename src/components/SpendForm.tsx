'use client'

import { useEffect, useReducer, useCallback } from 'react'
import type { FormState, ToolName, PlanName, UseCase, ToolState } from '@/types/audit'

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
  Cursor: ['Hobby', 'Pro', 'Business', 'Enterprise'],
  'GitHub Copilot': ['Individual', 'Business', 'Enterprise'],
  Claude: ['Free', 'Pro', 'Team', 'Enterprise'],
  ChatGPT: ['Free', 'Plus', 'Team', 'Enterprise'],
  'Anthropic API': ['Pay-as-you-go'],
  'OpenAI API': ['Pay-as-you-go'],
  Gemini: ['Free', 'Advanced', 'Business', 'Enterprise'],
  Windsurf: ['Free', 'Pro', 'Teams', 'Enterprise'],
}

const USE_CASES: UseCase[] = ['coding', 'writing', 'data', 'research', 'mixed']

const LS_KEY = 'lumen_form_state'

// ─── Default State ─────────────────────────────────────────────────────────

const DEFAULT_FORM: FormState = {
  team: { teamSize: 1, useCase: 'coding', primaryUseCase: 'coding' },
  tools: [],
}

function makeToolRow(overrides: Partial<ToolState> = {}): ToolState {
  const toolName: ToolName = overrides.toolName ?? overrides.name ?? 'Cursor'
  const planName: PlanName = overrides.planName ?? overrides.plan ?? PLANS_BY_TOOL[toolName][0]
  return {
    id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    // Populate both legacy and spec field names so the engine always has what it needs
    toolName,
    name: toolName,
    planName,
    plan: planName,
    monthlySpend: 0,
    seats: 1,
    ...overrides,
  }
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: 'LOAD_STATE'; payload: FormState }
  | { type: 'SET_TEAM_SIZE'; payload: number }
  | { type: 'SET_USE_CASE'; payload: UseCase }
  | { type: 'ADD_TOOL' }
  | { type: 'REMOVE_TOOL'; id: string }
  | { type: 'UPDATE_TOOL'; id: string; field: keyof ToolState; value: string | number }

function reducer(state: FormState, action: Action): FormState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload

    case 'SET_TEAM_SIZE':
      return { ...state, team: { ...state.team, teamSize: action.payload } }

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
        // When the tool name changes, reset plan to the first valid option
        if (action.field === 'toolName') {
          const newTool = action.value as ToolName
          updated.toolName = newTool
          updated.name = newTool
          updated.planName = PLANS_BY_TOOL[newTool][0]
          updated.plan = updated.planName
        }
        // Keep spec aliases in sync when plan changes
        if (action.field === 'planName') {
          updated.plan = action.value as PlanName
        }
        return updated
      })
      return { ...state, tools }
    }

    default:
      return state
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface SpendFormProps {
  /** Called when the user submits the form with the current state. */
  onSubmit: (state: FormState) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpendForm({ onSubmit }: SpendFormProps) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_FORM)

  // ── Hydrate from localStorage on mount ─────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as FormState
        dispatch({ type: 'LOAD_STATE', payload: parsed })
      }
    } catch {
      // Corrupted storage — silently ignore; user starts fresh
    }
  }, [])

  // ── Persist to localStorage on every state change ──────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state))
    } catch {
      // Storage quota exceeded or private mode — silently ignore
    }
  }, [state])

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleToolChange = useCallback(
    (id: string, field: keyof ToolState, raw: string) => {
      const numericFields: (keyof ToolState)[] = ['monthlySpend', 'seats']
      const value = numericFields.includes(field) ? parseFloat(raw) || 0 : raw
      dispatch({ type: 'UPDATE_TOOL', id, field, value })
    },
    []
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(state)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-8 p-6 max-w-3xl mx-auto">
      {/* ── Team Section ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Your Team</h2>
        <div className="flex gap-4 flex-wrap">
          <label className="flex flex-col gap-1 text-sm">
            Total team size
            <input
              id="team-size"
              type="number"
              min={1}
              value={state.team.teamSize}
              onChange={(e) =>
                dispatch({ type: 'SET_TEAM_SIZE', payload: parseInt(e.target.value) || 1 })
              }
              className="border rounded px-2 py-1 w-28"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Primary use case
            <select
              id="use-case"
              value={state.team.useCase}
              onChange={(e) =>
                dispatch({ type: 'SET_USE_CASE', payload: e.target.value as UseCase })
              }
              className="border rounded px-2 py-1"
            >
              {USE_CASES.map((uc) => (
                <option key={uc} value={uc}>
                  {uc.charAt(0).toUpperCase() + uc.slice(1)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* ── Tools Section ── */}
      <section>
        <h2 className="text-lg font-semibold mb-3">AI Tool Subscriptions</h2>

        {state.tools.length === 0 && (
          <p className="text-sm text-gray-500 mb-2">
            No tools added yet. Click &ldquo;Add Tool&rdquo; to begin.
          </p>
        )}

        <div className="space-y-3">
          {state.tools.map((tool, idx) => (
            <div
              key={tool.id}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end border rounded p-3"
            >
              {/* Tool Name */}
              <label className="flex flex-col gap-1 text-xs">
                Tool {idx + 1}
                <select
                  id={`tool-name-${tool.id}`}
                  value={tool.name ?? tool.toolName!}
                  onChange={(e) => handleToolChange(tool.id, 'toolName', e.target.value)}
                  className="border rounded px-1 py-1"
                >
                  {TOOL_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              {/* Plan */}
              <label className="flex flex-col gap-1 text-xs">
                Plan
                <select
                  id={`tool-plan-${tool.id}`}
                  value={tool.plan ?? tool.planName!}
                  onChange={(e) => handleToolChange(tool.id, 'planName', e.target.value)}
                  className="border rounded px-1 py-1"
                >
                  {PLANS_BY_TOOL[tool.name ?? tool.toolName!].map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>

              {/* Monthly Spend */}
              <label className="flex flex-col gap-1 text-xs">
                Monthly spend ($)
                <input
                  id={`tool-spend-${tool.id}`}
                  type="number"
                  min={0}
                  step={0.01}
                  value={tool.monthlySpend}
                  onChange={(e) => handleToolChange(tool.id, 'monthlySpend', e.target.value)}
                  className="border rounded px-1 py-1"
                />
              </label>

              {/* Seats + Remove */}
              <div className="flex flex-col gap-1">
                <label className="flex flex-col gap-1 text-xs">
                  Seats
                  <input
                    id={`tool-seats-${tool.id}`}
                    type="number"
                    min={0}
                    value={tool.seats}
                    onChange={(e) => handleToolChange(tool.id, 'seats', e.target.value)}
                    className="border rounded px-1 py-1"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => dispatch({ type: 'REMOVE_TOOL', id: tool.id })}
                  className="text-xs text-red-500 hover:underline self-start"
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
          className="mt-3 text-sm border rounded px-3 py-1 hover:bg-gray-50"
        >
          + Add Tool
        </button>
      </section>

      {/* ── Submit ── */}
      <button
        type="submit"
        id="run-audit-btn"
        disabled={state.tools.length === 0}
        className="w-full bg-indigo-600 text-white rounded py-2 font-medium disabled:opacity-50"
      >
        Run Audit
      </button>
    </form>
  )
}
