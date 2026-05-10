# Performance Metrics

### North Star Metric
**Total Recovered MRR Identified**
*   *Why:* Directly aligns the user's "aha moment" (finding money) with the value of the lead for Credex. If this number is low, the tool is a toy; if high, it's a revenue engine.

### Input Metrics
1.  **Form Completion Rate:** % of users who land on `/` and successfully reach `/results`. Target: >40%.
2.  **Savings Yield:** % of audits that identify >$100 in monthly savings. Target: >60%.
3.  **Lead Intent (CTR):** % of users who click the "Book Free Call" or "Send Report" CTA. Target: >10%.

### First Instrument
**Event:** `audit_completed`
*   **Properties:** `total_monthly_savings`, `tool_count`, `primary_use_case`.
*   **Goal:** Establish baseline "Savings Yield" to validate engine logic relevance.

### Pivot Trigger
**Threshold:** If 90% of completed audits show **$0 savings** over 30 days.
*   **Interpretation:** The current rule engine is too basic, or we are targeting "Hobbyist" users with free-tier stacks.
*   **Action:** Pivot upstream. Adjust `GTM.md` to target Series B+ companies with >100 seats where "Enterprise" contract wastage is guaranteed.
