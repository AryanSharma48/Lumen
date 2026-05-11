# Performance Metrics

### The North Star Metric
**Total Recovered MRR Identified**
For a B2B lead-generation tool, traditional SaaS metrics like Daily Active Users (DAU) or session duration are vanity metrics—users should ideally only need to run an infrastructure audit once a quarter. The true measure of Lumen’s success is the cumulative financial waste it uncovers. "Total Recovered MRR Identified" perfectly aligns the user's "aha moment" (discovering they are burning cash) with Credex’s core business model (negotiating that spend down). If this cumulative number is low, Lumen is just a novelty calculator. If it scales into the tens of thousands, it acts as a highly qualified, high-intent revenue engine for Credex's sales team.

### 3 Input Metrics That Drive the North Star
1. **Audit Completion Rate (Funnel Velocity):** The percentage of unique visitors who land on the `/` page and successfully reach the `/results` page. If this drops below 40%, it indicates the form is too complex, or the user lacks the required billing knowledge, bottlenecking the top of the lead funnel.
2. **High-Value Savings Yield:** The percentage of completed audits that identify greater than $500 in monthly savings. This is the critical threshold that triggers the conditional Credex Enterprise consultation CTA. A high yield proves our GTM targeting is successfully reaching the right "bill shock" persona.
3. **High-Intent Conversion (CTR):** The percentage of users with >$500 in savings who actually click the "Book Credex Consultation" CTA. This measures the effectiveness of our report's copywriting and the psychological urgency created by the audit.

### What I'd Instrument First
I would immediately instrument the `audit_completed` backend event (using PostHog or Amplitude).
* **Properties tracked:** `total_monthly_spend`, `total_monthly_savings`, `tool_count`, and `highest_cost_tool`.
* **Why:** Before worrying about UI clicks, I need to validate the core mathematical engine. Tracking this exact payload tells me immediately if the logic is resonating with real-world stacks and provides the baseline data needed to calculate our "High-Value Savings Yield."

### The Pivot Trigger
**Threshold:** If 80% of completed audits return less than $100 in identified savings over a trailing 14-day period.
* **Interpretation:** This explicitly invalidates our GTM assumption. It means our distribution channels are capturing "Hobbyist" developers on free tiers, rather than our target Pre-Series A engineering managers with bloated stacks.
* **Action:** I would halt the current outbound motion and pivot upstream. I would rewrite the landing page copy and shift outreach entirely to Series B+ Fractional CFOs, where massive overlapping "Enterprise" contract wastage is mathematically guaranteed.