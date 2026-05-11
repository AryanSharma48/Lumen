# User Discovery Interviews

## Interview 1: The Engineering Org Leader
**Profile:** Amit Ashu, Head of Product Success at Othor AI (Series A/B)
**Method:** Asynchronous Cold DM (LinkedIn)

**Direct Quotes:**
1. *"How are you tracking rogue AI spend like Copilot vs Cursor? Do developers just expense it?"* (Me)
2. *"Centrally managed."* (Amit)
3. *"So no shadow IT on individual corporate cards?"* (Me)
4. *"Nope. We lock all that down."* (Amit)

**The most surprising thing they said:**
The absolute brevity and finality of his answer. It surprised me because it proved that once a company hires a "Head of Product Success" or equivalent ops leader, the chaotic "shadow AI" problem ceases to exist. 

**What it changed about your design:**
It forced a massive pivot in my Go-To-Market and product messaging. I originally designed the landing page for established Enterprise managers. This interview made me change the target persona to **Pre-Series A** founders. The tool must capture teams *before* they mature enough to implement the central management Amit uses.

---

## Interview 2: The Pre-Incubation Engineering Lead
**Profile:** Varun Narayan Jain, 4th-Year CS, Former Technical Secretary of ACM Chapter. Manages cloud/AI resources for multiple student-led startup teams.
**Method:** Asynchronous Chat

**Direct Quotes:**
1. *"We had a runaway pipeline script eat 60% of our entire monthly OpenAI API budget while we were asleep."*
2. *"I literally had to lock the master account and issue hard-capped, separate API keys per team to stop the bleeding."*
3. *"For standard bulk classification, we are actively pushing people to Groq or Together AI because GPT-4o is just too expensive."*

**The most surprising thing they said:**
The alert fatigue. I assumed managers just set billing alerts at $500 and moved on. Varun's team was so traumatized by API bill shock that they completely abandoned frontier models for basic tasks just to survive the month.

**What it changed about your design:**
It validated and shaped my **API Efficiency Logic (Rule 4)**. Instead of the UI just displaying "You spend $X on OpenAI," I changed the `AuditResults` component to dynamically render a suggestion card: *"Route bulk tasks to Gemini Flash or Groq to save $Y."* I designed the results page to offer the exact architecture pivot Varun was doing manually.

---

## Interview 3: The YC Startup IC (Individual Contributor)
**Profile:** Aditya Jha, Software Engineer at CodeWisp (YC W26). Pre-Series A startup.
**Method:** Asynchronous Chat (Discord)

**Direct Quotes:**
1. *"The company officially pays for GitHub Copilot, but half my pod secretly prefers using Cursor."*
2. *"Nobody wants to wait a week for IT procurement approval for a $20 tool."*
3. *"We just pay for it ourselves and expense it under our generic 'learning and development' or 'software' monthly stipend."*

**The most surprising thing they said:**
That AI tool redundancy isn't caused by top-down management incompetence; it is caused by bottom-up developer preference actively bypassing procurement to maintain velocity.

**What it changed about your design:**
It fundamentally changed the `engine.ts` math. Originally, my calculator just summed up the total costs of inputted tools. After talking to Aditya, I wrote specific logic to detect **Seat-Based Redundancy**. If a user inputs 10 Copilot seats and 5 Cursor seats, the engine now flags this as a direct overlap and visually highlights the exact dollar amount wasted by double-paying for developer environments.