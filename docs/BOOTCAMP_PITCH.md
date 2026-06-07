# Bootcamp Outreach — Cold Email Templates, Demo Script, Pricing

---

## Target list (India)

| Bootcamp | Focus | Contact approach |
|----------|-------|-----------------|
| Masai School | Full-stack / DSA | Apply as EdTech partner, LinkedIn DM to curriculum head |
| Newton School | Full-stack | Email admission / curriculum team |
| Scaler Academy | DSA + system design | LinkedIn DM to program manager |
| Coding Ninjas | DSA + web dev | Partner inquiry form |
| Crio.do | Project-based learning | Email directly — MCP-first angle fits their model |
| AltCampus | Full-stack | Small team — founder reachable on Twitter |
| iNeuron | Data science + web | Partner inquiry |
| Any college CS dept | Final year projects | HOD email with pilot offer |

---

## Cold Email Template 1 — Problem-first (best for curriculum heads)

**Subject:** Your students are building with Cursor/Claude. Can they explain what they ship?

---

Hi [Name],

I've been following [Bootcamp Name]'s curriculum — the move to AI-assisted coding is the right call.

But there's a gap I haven't seen anyone solve yet: your students can ship working code with Copilot or Cursor, but when a hiring manager asks them to explain their design decisions — or when they sit a viva — they often can't.

I built something that fixes this. It's called **NirmiqLearn OS**.

It's a local MCP server that connects to Claude Code, Cursor, and Windsurf. While students build, it automatically:
- Generates explain-back questions from their code
- Links what they built to DSA/CS concepts
- Logs debug sessions with root cause and fix

At the end of every project, students export a **learning trail** in Markdown — proof of understanding, not just proof of submission.

It runs locally on each student's machine. No cloud, no login, no data leaving their device.

I'd like to offer [Bootcamp Name] a **free 14-day pilot** for your next cohort. 20 students, no commitment.

Would a 20-minute call next week make sense?

Siddharth Prasad
siddharthprashoo@gmail.com
github.com/SheeshDarth/NirmiqLearnOS

---

## Cold Email Template 2 — Short (for founders / Twitter DM)

**Subject:** Local MCP tool that makes AI-assisted students accountable for understanding

---

Hi [Name],

Quick one: I built a local-first MCP server that connects to Cursor/Claude Code and forces students to prove they understand the code they ship — explain-back questions, DSA concept mapping, structured debug logs.

Everything runs on their machine. No cloud. Learning trail exported as Markdown for instructors.

Happy to give [Bootcamp] a free pilot for one cohort. 20 minutes to show you how it works?

— Siddharth | siddharthprashoo@gmail.com

---

## Cold Email Template 3 — CS Department (college angle)

**Subject:** Free tool for final-year project supervision — tracks what students actually understand

---

Dear Professor [Name],

I'm reaching out about a tool that might help with a problem I suspect you see in every final-year project viva: students who submit working projects but can't explain the architecture decisions they made.

**NirmiqLearn OS** is a free, open-source, local-first learning OS. It connects to the AI coding tools your students already use (Claude Code, Cursor, Copilot via IDE) and captures:
- Explain-back questions generated from their code
- DSA/CS concept links (what they built → what fundamental it uses)
- Structured debug logs
- Daily session logs

At submission, they include a Markdown learning trail alongside their code. You can see not just that it works, but that they understood it.

It runs completely on their machines — no server, no account, no data leaving campus.

I'd be happy to run a pilot with one project group this semester. No cost, no commitment.

Would you be open to a short demo?

Siddharth Prasad
siddharthprashoo@gmail.com

---

## 15-Minute Demo Script

### Before the call (2 min setup)
- Have the app running at `http://127.0.0.1:3000`
- Have Claude Code open with a workspace already set up
- Have 1-2 sample questions and debug logs already in the workspace

### Minute 0–3: Frame the problem
> "Quick question before I show you anything — when one of your students submits a project built with Cursor or Claude, how do you know they actually understood the code? Not just that it runs."

Let them answer. This is the hook.

> "What I've found is that working code and understood code are increasingly different things. NirmiqLearn is built specifically for that gap."

### Minute 3–7: Show the app
1. Open the workspace dashboard — show the modules, explain-back questions, debug logs
2. Show one workspace with questions at different confidence levels (red/yellow/green)
3. Show a debug log: "This is what a student's debug session looks like. Root cause, fix, lesson learned. Not just 'it worked after I changed this.'"

### Minute 7–11: Show the MCP in action
1. Switch to Claude Code
2. Say: "This is what happens automatically. I'll show you."
3. Paste a short function, ask Claude: "Use nirmiq_generate_questions on this code"
4. Show the 5 questions appear, then get added to the workspace
5. Ask: "use nirmiq_suggest_concepts" — show the DSA concepts appear

> "This happens inside the IDE your students already use. They don't have to think about it. Their AI assistant does it for them."

### Minute 11–13: Show the export
1. Go to the export page, click Export Markdown
2. Open the file — show it has questions, debug logs, concept links, daily logs
3. "This is the learning trail. You get this at project submission instead of just a GitHub link."

### Minute 13–15: Pricing + close
> "For a cohort of [their size], it works out to ₹[X]/student/month. I'd like to offer a free 14-day pilot first — you run it with one cohort, see how instructors and students respond. No commitment."

Ask: "Does that make sense to try?"

---

## Pricing Model

### Direct to bootcamp

| Plan | Price | Min students | What's included |
|------|-------|-------------|-----------------|
| Cohort pilot | Free | 20 | 14 days, one cohort — no strings attached |
| Cohort | ₹400/student/month | 20 | Full app, 10 MCP tools, email support |
| Campus | ₹300/student/month | 100 | Everything + bulk keys, custom onboarding, priority support |

### Annual discount
- Pay 10 months, get 12 months (2 months free)
- Available on Campus plan only

### How to quote
- 30 students × ₹400 × 3 months (one cohort) = **₹36,000** per cohort
- 100 students × ₹300 × 12 months (annual) = **₹3,60,000** per year

### What to say on pricing objections
**"We already use ChatGPT/Claude for teaching"**
> Those are generation tools. This is a comprehension tool. It works alongside what you already use.

**"Students can just use Claude directly for questions"**
> They could. But they don't. This makes it automatic and tracks the answers over time. It also gives you visibility as the instructor.

**"It's too expensive for students to pay themselves"**
> The bootcamp license covers it. Per-student cost is about the same as one chai per day.

**"We need cloud access / a dashboard"**
> The instructor dashboard is on the roadmap for Q3 2026. For now, students export a Markdown file with every submission — you get everything you need without a cloud dependency.

---

## Follow-up sequence after first email (no reply)

| Day | Action |
|-----|--------|
| +3 | Short follow-up: "Sending a quick follow-up — happy to send a short demo video instead of a call if that's easier." |
| +7 | LinkedIn connection + short DM: "Sent an email about NirmiqLearn OS — the local MCP server for AI-assisted student accountability. Would love 15 minutes." |
| +14 | Final email: "Last follow-up — if the timing isn't right, totally understood. I'll circle back next semester." |

Three touches, then stop. Don't spam. One quality demo is worth 10 cold emails.
