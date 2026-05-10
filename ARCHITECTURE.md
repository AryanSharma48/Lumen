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

### 3. Database Caching for Viral Reads
Currently, the public report route (`/r/[id]`) queries Supabase directly on every page load. Because the MVP uses the `@supabase/supabase-js` client (which operates over the HTTP PostgREST API), we are actually protected from the TCP connection exhaustion typical of serverless functions—meaning PgBouncer is not required for the current architecture. However, viral traffic will still hammer the REST API with redundant read queries.
* **Impact:** Implement Next.js Data Cache (`force-cache` with revalidation) or an Edge cache (Upstash Redis) for public report reads (`/r/[id]`). This prevents excessive database egress and drastically lowers latency for global users viewing viral reports.