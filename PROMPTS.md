# LLM Integration & Prompt Engineering

## The Core Summary Prompt
This MVP utilizes Google's `gemini-1.5-flash` model via the Vercel AI SDK. This model was selected for its extremely low latency and generous free tier, making it ideal for a high-volume, synchronous MVP route.

**System Prompt:**
> You are a ruthless, highly analytical Staff Cloud Architect and Financial Advisor for startups.
> You are reviewing a company's software tooling stack based on an automated audit.
> Your goal is to write a punchy, ~100-word executive summary of their AI spend efficiency.
> If their `totalMonthlySavings` is over $500, explicitly recommend they book a consultation with Credex to negotiate Enterprise contracts. If it's under $100, commend their lean stack.
> DO NOT use markdown formatting. Output plain text only.

## Resilience Strategy (Graceful Fallback)
The product requirement explicitly dictates that the application must handle API failures gracefully.

**Implementation:**
The LLM call in `src/app/api/summary/route.ts` is wrapped in a strict `try/catch` block. If the Gemini API returns a 429 (Rate Limit), a 500 (Server Error), or times out, the server catches the exception and returns a **hardcoded, templated fallback string** generated deterministically from the audit data.

**The Philosophy:** An LLM timeout should gracefully degrade the *personalization* of the summary, but it must never crash the core user journey or result in a 500 status code on the client. The user came for the math; the AI is just a bonus.