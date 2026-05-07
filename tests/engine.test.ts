import { describe, it, expect } from "vitest";
import { runAudit } from "@/lib/engine";
import type { FormState, ToolState } from "@/types/audit";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeForm(overrides: Partial<FormState> = {}): FormState {
  return {
    team: { teamSize: 10, useCase: "coding" },
    tools: [],
    ...overrides,
  };
}

function makeTool(overrides: Partial<ToolState> = {}): ToolState {
  return {
    id: "tool-1",
    toolName: "Cursor",
    planName: "Pro",
    monthlySpend: 200,
    seats: 10,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("runAudit — edge cases", () => {
  it("returns an empty result array when no tools are supplied", () => {
    const form = makeForm({ tools: [] });
    const report = runAudit(form);
    expect(report.results).toHaveLength(0);
    expect(report.totalMonthlySavings).toBe(0);
    expect(report.totalAnnualSavings).toBe(0);
  });

  it("marks a zero-seat entry as OPTIMAL with zero savings", () => {
    const form = makeForm({
      tools: [makeTool({ seats: 0, monthlySpend: 0 })],
    });
    const { results } = runAudit(form);
    expect(results[0].recommendedAction).toBe("OPTIMAL");
    expect(results[0].monthlySavings).toBe(0);
  });

  it("marks a free-plan entry as OPTIMAL regardless of team size", () => {
    const form = makeForm({
      tools: [
        makeTool({
          toolName: "Windsurf",
          planName: "Free",
          monthlySpend: 0,
          seats: 20,
        }),
      ],
    });
    const { results } = runAudit(form);
    expect(results[0].recommendedAction).toBe("OPTIMAL");
    expect(results[0].monthlySavings).toBe(0);
  });
});

describe("runAudit — overspend detection", () => {
  it("flags an Enterprise plan for a tiny team and recommends a downgrade", () => {
    // Small 3-person team on Cursor Enterprise ($60/seat = $180/mo)
    const form = makeForm({
      team: { teamSize: 3, useCase: "coding" },
      tools: [
        makeTool({
          toolName: "Cursor",
          planName: "Enterprise",
          monthlySpend: 180, // 3 seats × $60
          seats: 3,
        }),
      ],
    });
    const { results } = runAudit(form);
    expect(results[0].recommendedAction).toBe("DOWNGRADE_PLAN");
    expect(results[0].monthlySavings).toBeGreaterThan(0);
  });

  it("suggests switching from a chat tool to Windsurf for a coding team", () => {
    // Team of 10 on ChatGPT Team ($30/seat = $300/mo)
    // Windsurf Pro is $15/seat → $150/mo — should recommend a switch
    const form = makeForm({
      team: { teamSize: 10, useCase: "coding" },
      tools: [
        makeTool({
          toolName: "ChatGPT",
          planName: "Team",
          monthlySpend: 300, // 10 seats × $30
          seats: 10,
        }),
      ],
    });
    const { results } = runAudit(form);
    expect(results[0].recommendedAction).toBe("SWITCH_TOOL");
    expect(results[0].recommendedTool).toBe("Windsurf");
    expect(results[0].monthlySavings).toBe(150);
  });

  it("accurately computes aggregate savings across multiple tools", () => {
    // Tool 1: Cursor Enterprise (3 seats, $180/mo) — should save $60
    // Tool 2: ChatGPT Team (5 seats, $150/mo) — should save $75
    const form = makeForm({
      team: { teamSize: 5, useCase: "coding" },
      tools: [
        makeTool({
          id: "t1",
          toolName: "Cursor",
          planName: "Enterprise",
          monthlySpend: 180,
          seats: 3,
        }),
        makeTool({
          id: "t2",
          toolName: "ChatGPT",
          planName: "Team",
          monthlySpend: 150,
          seats: 5,
        }),
      ],
    });
    const report = runAudit(form);
    expect(report.totalMonthlySavings).toBeGreaterThan(0);
    expect(report.totalAnnualSavings).toBe(report.totalMonthlySavings * 12);
  });
});

describe("runAudit — optimal scenarios", () => {
  it("marks an appropriately-sized plan as OPTIMAL and saves $0", () => {
    // 10-person team on Cursor Pro ($20/seat = $200/mo) — this is the right plan
    const form = makeForm({
      team: { teamSize: 10, useCase: "coding" },
      tools: [
        makeTool({
          toolName: "Cursor",
          planName: "Pro",
          monthlySpend: 200,
          seats: 10,
        }),
      ],
    });
    const { results } = runAudit(form);
    expect(results[0].recommendedAction).toBe("OPTIMAL");
    expect(results[0].monthlySavings).toBe(0);
    expect(results[0].annualSavings).toBe(0);
  });

  it("suggests switching a coding-tool subscription for a writing team", () => {
    // Writing team on Cursor Pro ($20/seat) — Gemini Advanced ($20/seat) is equivalent
    // but the team's use-case doesn't warrant a coding IDE
    const form = makeForm({
      team: { teamSize: 5, useCase: "writing" },
      tools: [
        makeTool({
          toolName: "Cursor",
          planName: "Pro",
          monthlySpend: 150, // 5 × $30 — deliberately over per-seat to force suggestion
          seats: 5,
        }),
      ],
    });
    const { results } = runAudit(form);
    // The per-seat price is $30, Gemini Advanced is $20 → SWITCH_TOOL
    expect(results[0].recommendedAction).toBe("SWITCH_TOOL");
    expect(results[0].recommendedTool).toBe("Gemini");
  });
});
