# Automated Tests

This project uses **Vitest** for unit testing the core audit engine. The tests verify mathematical accuracy, plan recommendation logic, and edge-case handling.

## Test Suite: `tests/engine.test.ts`

This file contains the primary test suite for the Lumen Audit Engine. It covers the following 7 critical areas:

| Test Case | Coverage | Purpose |
| :--- | :--- | :--- |
| **Pricing Sanity** | `TOOL_PRICING` | Ensures the hard-coded vendor prices match the project specification. |
| **Solo Overkill** | Rule 1 | Verifies that solo users on "Team" plans are correctly flagged for downgrading to "Pro/Plus." |
| **Enterprise Downgrade** | Rule 2 | Checks that teams under 50 people on "Enterprise" tiers are recommended to consolidate to standard business plans. |
| **Redundancy Logic** | Rule 3 | Tests the detection of overlapping Copilot + LLM subscriptions and the recommendation of Cursor as a replacement. |
| **API Efficiency** | Rule 4 | Validates that high API spend is flagged for potential token-pooling savings. |
| **Edge Cases** | `runAudit` | Handles empty tool lists, zero-seat entries, and free plans to prevent engine crashes. |
| **Aggregate Math** | `runAudit` | Ensures that monthly and annual savings are summed correctly across disparate recommendations. |

## How to Run Tests

### Local Execution
To run the full test suite on your local machine:
```bash
npm test
```

### Continuous Integration
These tests are automatically executed on every push to the `main` branch via GitHub Actions. You can view the status of these checks in the **Actions** tab of the repository.

---
**Total Test Count:** 15+ assertions across 7 test groups.
