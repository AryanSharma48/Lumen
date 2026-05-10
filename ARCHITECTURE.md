# Architecture

# Architecture & Scaling Strategy

## Current MVP State
The current architecture is optimized for speed of delivery and low operational overhead (< 500 audits/day).
- **Compute:** Next.js App Router (Serverless).
- **Database:** Supabase (PostgreSQL).
- **Abuse Protection:** A silent, client-side honeypot field (`_hp`) on the capture form to trap automated scrapers.

## Scaling to 10k Audits/Day
If traffic scales to 10,000 audits per day (approx. 7 requests per minute, but highly prone to viral spikes), the current architecture will experience database connection exhaustion, LLM API rate-limiting, and vulnerability to distributed scraping bots. Here is the evolution plan:

### 1. Edge-Based Rate Limiting
The silent honeypot is insufficient against coordinated botnets. At 10k requests/day, I would implement **Upstash Redis** rate limiting at the Next.js Edge middleware layer.
* **Impact:** Blocks malicious IPs *before* they invoke the Serverless function, protecting both Supabase connection limits and Resend API email quotas from exhaustion attacks.

### 2. Decoupling the LLM via Message Queues
Currently, the `/api/summary` route synchronously awaits the Gemini API response. At high volume, downstream LLM latency spikes will cause Vercel serverless functions to hang and timeout.
* **Impact:** Migrate the LLM call to an asynchronous background worker (e.g., Inngest or Upstash QStash). The UI would immediately render the deterministic math, and the AI summary skeleton would poll or use Server-Sent Events (SSE) to stream in once the background job completes.

### 3. Database Connection Pooling
10,000 daily audits driven by viral traffic spikes (e.g., a top post on HackerNews) will cause Next.js serverless functions to rapidly spin up, potentially exhausting Supabase's direct connection limits.
* **Impact:** Route all database traffic through Supabase's PgBouncer (connection pooling) to ensure connections are safely multiplexed across stateless Next.js invocations.