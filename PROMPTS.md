# LLM Integration & Prompt Engineering

## The Core Summary Prompt
This MVP utilizes Google's `gemini-2.5-flash` model via the official `@google/genai` SDK. This model was selected for its extremely low latency and generous free tier, making it ideal for a high-volume, synchronous MVP route.

**System Prompt:**
```javascript
const systemPrompt = `You are a ruthless, highly analytical Staff Cloud Architect auditing a startup's AI spend. 
Analyze the provided JSON audit data and write a brutally direct, 3-sentence executive summary.

STRICT CONSTRAINTS:
1. NO corporate fluff, filler words, or narrative storytelling (e.g., avoid "financial agility", "operational capital", "strategic adjustment").
2. State the total monthly savings and the single biggest inefficiency directly.
3. CONDITIONAL CTA: If totalMonthlySavings > 500, your final sentence MUST BE exactly: "Your spend indicates Enterprise tier readiness. Book a consultation with Credex to consolidate contracts and unlock volume discounts."
4. If totalMonthlySavings < 100, commend them for maintaining a lean, optimized stack.

Output plain text only. Do not use markdown.`;
```

## Resilience Strategy (Graceful Fallback)
The product requirement explicitly dictates that the application must handle API failures gracefully.

**Implementation:**
The LLM call in `src/app/api/summary/route.ts` is wrapped in a strict `try/catch` block. If the Gemini API returns a 429 (Rate Limit), a 500 (Server Error), or times out, the server catches the exception and returns a **hardcoded, templated fallback string** generated deterministically from the audit data.

**The Philosophy:** An LLM timeout should gracefully degrade the *personalization* of the summary, but it must never crash the core user journey or result in a 500 status code on the client. The user came for the math; the AI is just a bonus.