# NirmiqLearn OS — Bootcamp Onboarding Guide

This guide is for bootcamp instructors and program managers setting up NirmiqLearn OS
for a cohort. It covers installation, IDE setup, student workflow, and how to review
learning trails.

---

## What students need

| Requirement | Notes |
|-------------|-------|
| Node.js ≥ 18 | Check with `node -v` |
| npm ≥ 9 | Bundled with Node 18+ |
| Claude Code, Cursor, or Windsurf | Any MCP-compatible IDE |
| NIRMIQ_PRO_KEY | Provided by instructor (from Gumroad bulk purchase) |
| ANTHROPIC_API_KEY | Student's own key — get free credits at console.anthropic.com |

---

## Step 1 — Installation (per student, ~5 minutes)

```bash
# Clone the repo
git clone https://github.com/SheeshDarth/NirmiqLearnOS.git
cd NirmiqLearnOS

# Install dependencies
npm install

# Set up the database
npm run db:generate
npm run db:migrate

# Start the app
npm run dev
```

Open **http://127.0.0.1:3000** — the dashboard appears. The app binds to localhost only.

---

## Step 2 — Pro key setup

Students add two lines to `.env.local` in the NirmiqLearnOS directory:

```env
NIRMIQ_PRO_KEY=XXXX-XXXX-XXXX-XXXX   # Provided by instructor
ANTHROPIC_API_KEY=sk-ant-api03-...    # Student's own key
```

Keys are verified against Gumroad once, then cached locally for 7 days. Works offline
after first activation.

**As the instructor:** purchase bulk licenses on Gumroad, then distribute one key per
student. Each key is single-use — one student per key.

---

## Step 3 — Connect to IDE

### Claude Code

Create or edit `.claude/mcp.json` in any project directory:

```json
{
  "mcpServers": {
    "nirmiqlearn": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "C:/path/to/NirmiqLearnOS"
    }
  }
}
```

Then start the MCP server once in a separate terminal:
```bash
npm run mcp
```

### Cursor

Open Settings → Features → MCP Servers → Add:

```json
{
  "nirmiqlearn": {
    "command": "npm",
    "args": ["run", "mcp"],
    "cwd": "C:/path/to/NirmiqLearnOS"
  }
}
```

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "nirmiqlearn": {
      "command": "npm",
      "args": ["run", "mcp"],
      "cwd": "C:/path/to/NirmiqLearnOS"
    }
  }
}
```

---

## Step 4 — Create a workspace

Students go to **http://127.0.0.1:3000/workspaces/new** and create one workspace per
project. They give it a title, type (project / topic / exam), and a goal statement.

Encourage one workspace per major assignment — not one per file.

---

## The student workflow (daily)

This is what the AI assistant does automatically once connected:

1. **Student writes a function** → AI calls `nirmiq_generate_questions` → 5 explain-back questions saved to workspace
2. **Student implements a feature** → AI calls `nirmiq_suggest_concepts` → DSA/CS concepts linked with practice tasks
3. **Student hits an error** → AI calls `nirmiq_debug_assist` → structured diagnosis saved; `add_debug_log` creates a permanent record
4. **End of session** → AI calls `add_daily_log` → what was built, what's unclear, next action

Students can also interact directly from the app: answer questions, mark confidence, review weak spots.

---

## What instructors review

At the end of a project or sprint, students export their workspace:

1. Go to `http://127.0.0.1:3000/workspaces/[id]/export`
2. Click **Export Markdown**
3. Submit the `.md` file with their project

The Markdown file contains:
- All explain-back questions + student answers + confidence ratings
- All DSA/CS concept links
- All debug logs (error, root cause, fix, lesson learned)
- All daily logs

**This is the learning trail.** It proves understanding, not just submission.

---

## Grading with the learning trail

Suggested rubric additions:

| Criterion | Weight | What to look for |
|-----------|--------|-----------------|
| Question coverage | 20% | At least 3 questions per major function |
| Weak question resolution | 20% | Red-confidence questions should be answered before submission |
| Debug log depth | 20% | Each bug logged with root cause, not just "it worked after" |
| Concept links | 20% | At least 2 DSA/CS concepts linked with explanation |
| Daily log consistency | 20% | A log for each work session, "unclear topics" honestly filled |

---

## Bulk license provisioning

1. Purchase the **Campus plan** on Gumroad (minimum 100 licenses)
2. You receive a spreadsheet of license keys
3. Distribute one key per student via your LMS or email
4. Each student sets `NIRMIQ_PRO_KEY=their-key` in `.env.local`

Keys are single-use. If a student loses theirs, email `siddharthprashoo@gmail.com`
with their name and cohort — a replacement key is issued within 24 hours.

---

## Troubleshooting

**MCP tools not appearing in the IDE**
→ Check that `npm run mcp` is running in a terminal
→ Verify the `cwd` path in your MCP config is the absolute path to NirmiqLearnOS
→ Restart the IDE after updating MCP config

**"Pro license key not recognised"**
→ Check for typos in `NIRMIQ_PRO_KEY` — the key is case-insensitive but spaces break it
→ Make sure `.env.local` is in the `NirmiqLearnOS` directory, not the student's project directory
→ Restart `npm run mcp` after editing `.env.local`

**"Could not verify Pro license — Gumroad unreachable"**
→ Student needs internet for first-time verification only
→ After one successful verification, it works offline for 7 days

**Database errors on first run**
→ Run `npm run db:generate && npm run db:migrate` — the database file must be initialized first

---

## Privacy for students

- All data is stored locally on each student's machine in `data/nirmiqlearn.db`
- Nothing is sent to NirmiqLearn servers — zero telemetry
- The only outbound calls are: (a) Gumroad license verification on first activation, (b) Anthropic API calls when using AI tools (directly from student machine to Anthropic, using their own key)
- Students own their data. When the course ends, their learning history stays on their machine.

See [SECURITY.md](../SECURITY.md) and [the privacy policy](http://127.0.0.1:3000/privacy) for full details.

---

## Support

Email: `siddharthprashoo@gmail.com`
GitHub issues: https://github.com/SheeshDarth/NirmiqLearnOS/issues
Subject line for bootcamp support: `[BOOTCAMP] Your bootcamp name`
