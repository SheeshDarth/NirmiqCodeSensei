# UI/UX Specification — NirmiqLearn OS

## 1. Design Direction

NirmiqLearn OS should look like a premium academic intelligence cockpit, not a generic AI chatbot.

Keywords:
- Deep focus
- Engineering console
- Learning graph
- Calm discipline
- Local-first intelligence
- Academic OS
- Dark premium interface

## 2. Visual Identity

### Theme Name
Nirmiq Cognitive Graph

### Mood
Dark, focused, structured, technical, premium.

### Color Palette

Primary background:
- Near-black blue/graphite

Surface:
- Slightly lighter graphite panels

Accent:
- Electric cyan or soft intelligence blue

Secondary accent:
- Muted violet or neural purple

Success:
- Green for mastered concepts

Warning:
- Amber for partial understanding

Danger:
- Red for weak understanding

Avoid:
- Overused AI gradients
- Neon overload
- Robot/brain/circuit visuals
- Crypto/blockchain visuals
- Generic SaaS blobs

## 3. Typography

Use a clean modern sans-serif:
- Inter
- Geist
- Satoshi if available

Use monospace for:
- code snippets
- debug logs
- system notes
- terminal-like sections

## 4. Layout

### App Shell
Left sidebar:
- Dashboard
- Workspaces
- Learning Map
- Explain-Back
- Debug Lab
- DSA Bridge
- Daily Log
- Settings

Top bar:
- Active workspace
- Search
- Export
- Theme toggle

Main area:
- Card-based
- Clear sections
- No clutter

Right panel:
- Current focus
- Weak concepts
- Next action
- Progress snapshot

## 5. Main Screens

### Dashboard
Cards:
- Active Project
- Understanding Score
- Explain-Back Accuracy
- Debug Lessons
- Weak Concepts
- Today’s Required Action

### Workspace Detail
Tabs:
- Overview
- Learning Map
- Concepts
- Explain-Back
- Debug Logs
- Daily Logs
- Export

### Learning Map
Visual style:
- Module cards connected by subtle lines
- Each module has:
  - Concept tags
  - Difficulty
  - Confidence status
  - Explain-back button

### Explain-Back
Should feel like a strict mentor.
Display:
- Question
- Difficulty
- Answer box
- Expected points hidden by default
- Self-score
- Confidence color

### Debug Lab
Should feel like a bug postmortem system.
Fields:
- Error
- Hypothesis
- Cause
- Fix
- Lesson
- Prevention rule

## 6. Component Guidelines

### Cards
Use cards for every major learning object.
Each card should have:
- Title
- Short summary
- Status badge
- Action button

### Badges
Use badges for:
- Project
- DSA
- Exam
- Topic
- Red/Yellow/Green confidence
- Beginner/Intermediate/Advanced difficulty

### Empty States
Empty states must guide action.
Example:
“No learning map yet. Create one to turn your project into a study system.”

### Buttons
Primary button:
- High confidence action

Secondary:
- View/edit/export

Danger:
- Archive/delete only

## 7. UX Rules

- Every page must answer: “What should I do next?”
- No page should feel empty without guidance.
- The system should reduce decision fatigue.
- The product should punish passive consumption and reward explanation.
- Avoid huge walls of AI text.
- Prefer cards, checklists, and progressive reveal.

## 8. Mobile Responsiveness

MVP should work on desktop first.
Mobile should still allow:
- Reading dashboard
- Answering explain-back
- Writing daily logs

## 9. Microcopy Examples

Dashboard:
“Your project is not mastered until you can explain it without AI.”

Explain-Back:
“Do not paste AI answers. Explain it like you are in a viva.”

Debug Lab:
“Every bug is a permanent lesson if you document it properly.”

DSA Bridge:
“Connect this feature to the fundamentals behind it.”

## 10. Accessibility

- Minimum contrast ratio should be readable.
- Focus states required.
- Buttons must have clear labels.
- Avoid color-only status indication; include text labels too.
