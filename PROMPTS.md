# LLM Integration & Prompt Engineering

Lumen uses **Google Gemini 2.5 Flash** to generate strategic executive summaries. Below is the documentation of our prompt engineering strategy and the iterations that led to the final version.

## The Production Prompt

### System Instructions
```text
You are a ruthless, highly analytical Staff Cloud Architect auditing a startup's AI spend. 
Analyze the provided JSON audit data and write a brutally direct, 3-sentence executive summary.

STRICT CONSTRAINTS:
1. NO corporate fluff, filler words, or narrative storytelling (e.g., avoid "financial agility", "operational capital", "strategic adjustment").
2. State the total monthly savings and the single biggest inefficiency directly.
3. CONDITIONAL CTA: If totalMonthlySavings > 500, your final sentence MUST BE exactly: "Your spend indicates Enterprise tier readiness; book a consultation with Credex to consolidate contracts and unlock volume discounts."
4. If totalMonthlySavings < 100, commend them for maintaining a lean, optimized stack.

Output plain text only. Do not use markdown.
```

### User Input (Dynamic)
```text
Audit Findings: ${JSON.stringify(auditData)}
```

## Engineering Rationale: Why this works

-   **Persona-Based Guardrails:** By adopting the persona of a "Ruthless Staff Cloud Architect," we force the model into a concise, technical, and high-trust tone. This prevents the "Helpful Assistant" persona from generating polite but useless filler text.
-   **Negative Constraints with Examples:** Simply telling an LLM "don't use fluff" is often ignored. By providing a list of specific "banned" words (e.g., *synergy*, *leverage*, *agility*), we drastically improved the output quality.
-   **Business Logic Offloading:** We offloaded the conditional lead-gen logic (the $500 threshold for the CTA) into the prompt. This allows the AI to handle the "transition" into the sales pitch naturally while ensuring the phrasing is 100% consistent with our brand.

## The Graveyard: What didn't work

### 1. Chain-of-Thought (CoT) Explanations
*   **Attempt:** We initially asked the model to "explain its reasoning step-by-step for each tool."
*   **Failure:** While accurate, the output was 200+ words long. It failed the "glanceability" test. Users in a viral tool want the bottom line, not a lecture on SaaS unit economics.

### 2. Zero-Shot without Persona
*   **Attempt:** A simple "Summarize these savings for the user."
*   **Failure:** The model consistently hallucinated a "supportive" tone that felt condescending. It used phrases like "Great job on starting your AI journey!" which annoyed the target audience of senior engineering leaders.

### 3. Markdown Formatting
*   **Attempt:** Encouraging the model to use bolding and bullet points.
*   **Failure:** In a 3-sentence summary, markdown actually made the text harder to read on mobile devices and created rendering inconsistencies in the "Bulletproof" HTML email template. Plain text proved more robust across all clients.