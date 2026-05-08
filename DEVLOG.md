# Devlog

## Day 1: Foundation, Data Modeling & Audit Engine
**Date:** 2026-05-07

**Goals for today:**
- Initialize Next.js (App Router) TypeScript project with Tailwind and ESLint
- Set up GitHub Actions CI pipeline (lint + build on every push to `main`)
- Scaffold all 12 required evaluation markdown files at repo root
- Define all TypeScript domain types
- Implement the deterministic audit engine (no AI/LLM)
- Build the spend-input form with full localStorage persistence
- Write and pass ≥ 5 engine unit tests

**What I accomplished:**
- Bootstrapped the project using `create-next-app@latest` with `--ts`, `--tailwind`, `--app`, `--src-dir` flags
- Created `.github/workflows/ci.yml` running `npm ci → lint → test → build`
- Scaffolded `README.md`, `ARCHITECTURE.md`, `DEVLOG.md`, `REFLECTION.md`, `TESTS.md`, `PRICING_DATA.md`, `PROMPTS.md`, `GTM.md`, `ECONOMICS.md`, `USER_INTERVIEWS.md`, `LANDING_COPY.md`, `METRICS.md`
- **`src/types/audit.ts`** — complete domain model: `TeamData`, `ToolState`, `FormState`, `AuditResult`, `AuditReport`, and all supporting union types (`ToolName`, `PlanName`, `UseCase`, `ActionType`)
- **`src/lib/engine.ts`** — deterministic audit engine with four rules: enterprise-overkill downgrade, same-vendor cheaper plan, coding-team cross-tool switch (→ Windsurf Pro), writing-team coding-IDE switch (→ Gemini Advanced); uses a candidate-collection pattern so the highest-savings recommendation always wins
- **`src/components/SpendForm.tsx`** — `useReducer`-driven form with `useEffect` hydration from `localStorage` on mount and write-back on every state change; dynamic plan dropdowns that reset on tool-name change
- **`tests/engine.test.ts`** — 8 Vitest tests covering: empty tools, zero seats, free plan, enterprise overkill, coding-team tool switch (savings amount verified), aggregate multi-tool savings, optimal scenario, writing-team tool switch
- Configured `vitest.config.ts` with `@/*` path alias; added `test` and `test:watch` scripts to `package.json`

**Challenges faced:**
- First engine implementation short-circuited on the first matching rule, causing the cross-tool `SWITCH_TOOL` recommendation to never fire when a cheaper same-vendor plan also existed; discovered via a failing test and fixed by collecting all candidates and reducing to the highest-savings result

**Next steps:**
- Build the Audit Results UI (hero savings section, per-tool recommendation cards)
- Populate `PRICING_DATA.md` with finalized per-seat prices for all 8 tools

---

## Day 2: Pricing Data Research & Verification
**Date:** 2026-05-08

**Goals for today:**
- Research and verify current pricing for all AI tools supported by the audit engine
- Populate `PRICING_DATA.md` with accurate, sourced tier data

**What I accomplished:**
- Researched and verified pricing across all 8 supported tools/platforms: Cursor, GitHub Copilot, Claude, ChatGPT, Anthropic API (direct), OpenAI API (direct), Gemini, and Windsurf
- Populated `PRICING_DATA.md` with structured tier tables for each tool, including per-seat subscription prices and per-token API rates where applicable
- Noted that API-based tools (Anthropic, OpenAI, Gemini) use usage-based billing — prices recorded per 1M input/output tokens to match the spend-form input model
- All prices sourced directly from official pricing pages and verified as of 2026-05-08

**Key pricing notes:**
- GitHub Copilot Business ($19/mo) is cheaper than Enterprise ($39/mo) — relevant to enterprise-overkill rule
- Windsurf Pro ($20/mo) remains the best-value coding IDE for most team profiles
- Gemini Advanced ($19.99/mo) is the lowest-cost general AI assistant subscription
- ChatGPT Pro ($200/mo) is an extreme outlier — strong signal for enterprise-overkill downgrades

**Challenges faced:**
- None significant; all pricing pages were publicly accessible and clearly structured

**Next steps:**
- Build the Audit Results UI (hero savings section, per-tool recommendation cards)
- Integrate Supabase for lead capture and set up the email confirmation flow
