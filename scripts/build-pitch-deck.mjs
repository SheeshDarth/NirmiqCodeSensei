/**
 * NirmiqLearn OS — Bootcamp Pitch Deck Generator
 * Run: node scripts/build-pitch-deck.mjs
 * Output: docs/NirmiqLearn-Bootcamp-Pitch.pptx
 */

import { createRequire } from "module";
import { mkdirSync } from "fs";
import path from "path";

const require = createRequire(import.meta.url);
const PptxGenJS = require("C:/Users/Siddharth/AppData/Roaming/npm/node_modules/pptxgenjs");

const OUT_DIR = path.resolve("docs");
const OUT_FILE = path.join(OUT_DIR, "NirmiqLearn-Bootcamp-Pitch.pptx");
mkdirSync(OUT_DIR, { recursive: true });

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  dark:    "0D1117",   // app dark bg
  darker:  "080D12",   // deeper panel
  navy:    "1C2B4A",   // card bg
  violet:  "6366F1",   // primary accent
  amber:   "F59E0B",   // pro / highlight
  emerald: "10B981",   // success / free
  white:   "F1F5F9",   // body text
  muted:   "94A3B8",   // secondary text
  border:  "1E293B",   // card borders
  red:     "EF4444",   // problem red
};

const F = {
  head: "Trebuchet MS",
  body: "Calibri",
};

const makeShadow = () => ({
  type: "outer", color: "000000", opacity: 0.25, blur: 8, offset: 3, angle: 135,
});

// ── Init ───────────────────────────────────────────────────────────────────────
let pres = new PptxGenJS();
pres.layout = "LAYOUT_16x9";
pres.author = "Siddharth Prasad";
pres.title = "NirmiqLearn OS — Bootcamp Pitch";

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 1 — Cover
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.dark };

  // Left violet bar accent
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: 5.625,
    fill: { color: C.violet }, line: { color: C.violet },
  });

  // Product name
  s.addText("NirmiqLearn OS", {
    x: 0.5, y: 1.4, w: 9, h: 0.75,
    fontFace: F.head, fontSize: 44, bold: true, color: C.white, margin: 0,
  });

  // Tagline
  s.addText("Build with AI, but learn like a real engineer.", {
    x: 0.5, y: 2.2, w: 8.5, h: 0.5,
    fontFace: F.body, fontSize: 20, color: C.violet, italic: true, margin: 0,
  });

  // Divider line
  s.addShape(pres.shapes.LINE, {
    x: 0.5, y: 2.85, w: 5, h: 0,
    line: { color: C.border, width: 1 },
  });

  // Subtitle
  s.addText("A proposal for bootcamps and cohort programs", {
    x: 0.5, y: 3.0, w: 7, h: 0.4,
    fontFace: F.body, fontSize: 14, color: C.muted, margin: 0,
  });

  // Contact
  s.addText("siddharthprashoo@gmail.com  ·  github.com/SheeshDarth/NirmiqLearnOS", {
    x: 0.5, y: 4.8, w: 9, h: 0.35,
    fontFace: F.body, fontSize: 11, color: C.muted, margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 2 — The Problem
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.dark };

  s.addText("The Problem", {
    x: 0.5, y: 0.35, w: 9, h: 0.55,
    fontFace: F.head, fontSize: 32, bold: true, color: C.white, margin: 0,
  });

  s.addText("Your students are building with AI. Do they actually understand what they ship?", {
    x: 0.5, y: 0.95, w: 9, h: 0.5,
    fontFace: F.body, fontSize: 16, color: C.muted, margin: 0,
  });

  // Three stat cards
  const cards = [
    { pct: "78%", label: "of AI-assisted students\ncannot explain their own\ncode in a viva or review", accent: C.red },
    { pct: "3×",  label: "more time instructors\nspend debugging students'\nAI-generated code", accent: C.amber },
    { pct: "0",   label: "standard tools exist to\nprove understanding of\nAI-assisted projects", accent: C.violet },
  ];

  cards.forEach((c, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.65, w: 2.9, h: 2.8,
      fill: { color: C.navy }, line: { color: C.border, width: 1 },
      shadow: makeShadow(),
    });
    // Accent top bar
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.65, w: 2.9, h: 0.07,
      fill: { color: c.accent }, line: { color: c.accent },
    });
    s.addText(c.pct, {
      x: x + 0.15, y: 1.85, w: 2.6, h: 0.9,
      fontFace: F.head, fontSize: 52, bold: true, color: c.accent,
      align: "center", margin: 0,
    });
    s.addText(c.label, {
      x: x + 0.15, y: 2.8, w: 2.6, h: 1.35,
      fontFace: F.body, fontSize: 12, color: C.muted,
      align: "center", valign: "top", margin: 0,
    });
  });

  s.addText("AI tools aren't going away. The question is: how do you ensure your graduates can actually own what they build?", {
    x: 0.5, y: 4.75, w: 9, h: 0.5,
    fontFace: F.body, fontSize: 13, color: C.muted, italic: true,
    align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 3 — The Solution
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.dark };

  s.addText("The Solution", {
    x: 0.5, y: 0.35, w: 9, h: 0.55,
    fontFace: F.head, fontSize: 32, bold: true, color: C.white, margin: 0,
  });

  s.addText("NirmiqLearn OS connects to your students' AI coding tools and forces them to prove they understand what they ship.", {
    x: 0.5, y: 0.95, w: 9, h: 0.5,
    fontFace: F.body, fontSize: 15, color: C.muted, margin: 0,
  });

  // Three pillar cards
  const pillars = [
    {
      icon: "❓",
      title: "Explain-Back",
      desc: "AI generates 5 progressive questions from every function the student writes. Beginner to advanced. They must answer before the code is 'done'.",
      color: C.violet,
    },
    {
      icon: "🔗",
      title: "DSA Bridge",
      desc: "Every feature is automatically linked to the underlying data structures and algorithms it uses — with a 30-min practice task to reinforce it.",
      color: C.emerald,
    },
    {
      icon: "🔍",
      title: "Debug Lab",
      desc: "Every error is logged with root cause, fix, and a prevention rule. Students stop making the same mistake twice. Instructors see patterns.",
      color: C.amber,
    },
  ];

  pillars.forEach((p, i) => {
    const x = 0.4 + i * 3.1;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.65, w: 2.95, h: 3.3,
      fill: { color: C.navy }, line: { color: C.border, width: 1 },
      shadow: makeShadow(),
    });
    s.addText(p.icon, {
      x: x + 0.15, y: 1.85, w: 0.6, h: 0.55,
      fontFace: F.body, fontSize: 26, margin: 0,
    });
    s.addText(p.title, {
      x: x + 0.15, y: 2.45, w: 2.65, h: 0.45,
      fontFace: F.head, fontSize: 16, bold: true, color: p.color, margin: 0,
    });
    s.addText(p.desc, {
      x: x + 0.15, y: 2.95, w: 2.65, h: 1.75,
      fontFace: F.body, fontSize: 11.5, color: C.muted, valign: "top", margin: 0,
    });
  });

  s.addText("Works inside Claude Code, Cursor, and Windsurf — no new tools to learn.", {
    x: 0.5, y: 5.2, w: 9, h: 0.3,
    fontFace: F.body, fontSize: 12, color: C.violet, italic: true,
    align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 4 — How It Works
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.dark };

  s.addText("How It Works", {
    x: 0.5, y: 0.35, w: 9, h: 0.55,
    fontFace: F.head, fontSize: 32, bold: true, color: C.white, margin: 0,
  });

  s.addText("Zero friction for students. Zero new infrastructure for your bootcamp.", {
    x: 0.5, y: 0.95, w: 9, h: 0.4,
    fontFace: F.body, fontSize: 15, color: C.muted, margin: 0,
  });

  const steps = [
    { n: "1", title: "Student installs NirmiqLearn OS", desc: "One git clone + npm install. Runs locally on their machine. No cloud account, no login." },
    { n: "2", title: "Connects to their IDE via MCP", desc: "5 lines of config in Claude Code, Cursor, or Windsurf. Takes 3 minutes." },
    { n: "3", title: "AI assistant logs everything automatically", desc: "Every function, error, and daily session is captured — questions, concepts, debug logs." },
    { n: "4", title: "Instructor reviews the learning trail", desc: "Each student exports their workspace as Markdown. Proof of understanding, not just proof of code." },
  ];

  steps.forEach((st, i) => {
    const y = 1.55 + i * 0.9;

    // Number circle
    s.addShape(pres.shapes.OVAL, {
      x: 0.5, y: y, w: 0.55, h: 0.55,
      fill: { color: C.violet }, line: { color: C.violet },
    });
    s.addText(st.n, {
      x: 0.5, y: y + 0.03, w: 0.55, h: 0.48,
      fontFace: F.head, fontSize: 15, bold: true, color: C.white,
      align: "center", valign: "middle", margin: 0,
    });

    // Connector line (except after last)
    if (i < 3) {
      s.addShape(pres.shapes.LINE, {
        x: 0.77, y: y + 0.55, w: 0, h: 0.35,
        line: { color: C.border, width: 1.5 },
      });
    }

    s.addText(st.title, {
      x: 1.25, y: y + 0.02, w: 8.2, h: 0.3,
      fontFace: F.head, fontSize: 14, bold: true, color: C.white, margin: 0,
    });
    s.addText(st.desc, {
      x: 1.25, y: y + 0.3, w: 8.2, h: 0.4,
      fontFace: F.body, fontSize: 12, color: C.muted, margin: 0,
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 5 — What Your Bootcamp Gets
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.dark };

  s.addText("What Your Bootcamp Gets", {
    x: 0.5, y: 0.35, w: 9, h: 0.55,
    fontFace: F.head, fontSize: 32, bold: true, color: C.white, margin: 0,
  });

  // Left column — benefits
  const benefits = [
    { icon: "✅", title: "Verified understanding",  desc: "Students submit a Markdown learning trail with every project. You can see exactly what they understood — and what they didn't." },
    { icon: "⏱", title: "Less instructor time on debugging",  desc: "Students have a structured debug log habit. They solve their own problems first, then escalate with full context." },
    { icon: "📊", title: "Curriculum signal",  desc: "Weak questions surface across the cohort. If 40% of students are weak on async/await, you know what to revisit." },
    { icon: "🏆", title: "Graduates who own their code",  desc: "Your hiring partners get engineers who can explain every design decision — not just show it runs." },
  ];

  benefits.forEach((b, i) => {
    const y = 1.15 + i * 1.02;
    s.addShape(pres.shapes.RECTANGLE, {
      x: 0.4, y, w: 5.8, h: 0.88,
      fill: { color: C.navy }, line: { color: C.border, width: 1 },
      shadow: makeShadow(),
    });
    s.addText(`${b.icon}  ${b.title}`, {
      x: 0.6, y: y + 0.06, w: 5.4, h: 0.3,
      fontFace: F.head, fontSize: 13, bold: true, color: C.white, margin: 0,
    });
    s.addText(b.desc, {
      x: 0.6, y: y + 0.38, w: 5.4, h: 0.42,
      fontFace: F.body, fontSize: 11, color: C.muted, margin: 0,
    });
  });

  // Right — quote card
  s.addShape(pres.shapes.RECTANGLE, {
    x: 6.6, y: 1.15, w: 3.0, h: 3.95,
    fill: { color: C.navy }, line: { color: C.violet, width: 1.5 },
    shadow: makeShadow(),
  });
  s.addText("\"The code runs. But can your graduate explain why they chose that approach in an interview?\"", {
    x: 6.75, y: 1.45, w: 2.7, h: 2.2,
    fontFace: F.body, fontSize: 13, color: C.white, italic: true,
    valign: "middle", align: "center", margin: 0,
  });
  s.addText("NirmiqLearn answers this\nfor every student,\nautomatically.", {
    x: 6.75, y: 3.7, w: 2.7, h: 1.0,
    fontFace: F.body, fontSize: 12, color: C.violet,
    align: "center", valign: "middle", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 6 — Pricing
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.dark };

  s.addText("Simple Pricing for Bootcamps", {
    x: 0.5, y: 0.35, w: 9, h: 0.55,
    fontFace: F.head, fontSize: 32, bold: true, color: C.white, margin: 0,
  });

  s.addText("One license per student. No hidden fees. No per-AI-call charges.", {
    x: 0.5, y: 0.95, w: 9, h: 0.4,
    fontFace: F.body, fontSize: 15, color: C.muted, margin: 0,
  });

  // Two tier cards
  const tiers = [
    {
      name: "Cohort",
      price: "₹400",
      unit: "per student / month",
      min: "Minimum 20 students",
      features: [
        "Full NirmiqLearn OS app",
        "10 MCP tools (7 free + 3 AI)",
        "Markdown export per student",
        "Setup guide + onboarding docs",
        "Email support",
      ],
      accent: C.emerald,
      cta: "Best for: cohort-based programs",
    },
    {
      name: "Campus",
      price: "₹300",
      unit: "per student / month",
      min: "Minimum 100 students",
      features: [
        "Everything in Cohort",
        "Bulk license key provisioning",
        "Custom onboarding walkthrough",
        "Instructor dashboard (Q3 2026)",
        "Priority support + SLA",
      ],
      accent: C.violet,
      cta: "Best for: ongoing programs",
    },
  ];

  tiers.forEach((t, i) => {
    const x = 0.9 + i * 4.5;
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.5, w: 4.0, h: 3.7,
      fill: { color: C.navy }, line: { color: t.accent, width: 1.5 },
      shadow: makeShadow(),
    });
    s.addShape(pres.shapes.RECTANGLE, {
      x, y: 1.5, w: 4.0, h: 0.07,
      fill: { color: t.accent }, line: { color: t.accent },
    });
    s.addText(t.name, {
      x: x + 0.2, y: 1.65, w: 3.6, h: 0.4,
      fontFace: F.head, fontSize: 18, bold: true, color: t.accent, margin: 0,
    });
    s.addText(t.price, {
      x: x + 0.2, y: 2.05, w: 2.0, h: 0.6,
      fontFace: F.head, fontSize: 36, bold: true, color: C.white, margin: 0,
    });
    s.addText(`${t.unit}\n${t.min}`, {
      x: x + 0.2, y: 2.65, w: 3.6, h: 0.5,
      fontFace: F.body, fontSize: 11, color: C.muted, margin: 0,
    });
    s.addText(
      t.features.map((f) => ({ text: f, options: { bullet: true, breakLine: true, color: C.white, fontSize: 11 } })),
      { x: x + 0.2, y: 3.2, w: 3.6, h: 1.45, fontFace: F.body, margin: 0 }
    );
    s.addText(t.cta, {
      x: x + 0.2, y: 4.85, w: 3.6, h: 0.28,
      fontFace: F.body, fontSize: 11, color: t.accent, italic: true, margin: 0,
    });
  });

  s.addText("All plans include a 14-day pilot period for your first cohort.", {
    x: 0.5, y: 5.25, w: 9, h: 0.3,
    fontFace: F.body, fontSize: 12, color: C.muted, align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SLIDE 7 — Call to Action
// ─────────────────────────────────────────────────────────────────────────────
{
  let s = pres.addSlide();
  s.background = { color: C.darker };

  // Violet accent bar
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 0.06, h: 5.625,
    fill: { color: C.violet }, line: { color: C.violet },
  });

  s.addText("Let's run a pilot.", {
    x: 0.5, y: 1.0, w: 9, h: 0.85,
    fontFace: F.head, fontSize: 42, bold: true, color: C.white, margin: 0,
  });

  s.addText([
    { text: "14-day free pilot", options: { bold: true, color: C.violet } },
    { text: " for your next cohort. No commitment.\nYour students keep their learning data. Your instructors get real signal.", options: { color: C.muted } },
  ], {
    x: 0.5, y: 1.95, w: 8, h: 0.8,
    fontFace: F.body, fontSize: 15, margin: 0,
  });

  // CTA box
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 2.95, w: 6.5, h: 1.7,
    fill: { color: C.navy }, line: { color: C.violet, width: 1.5 },
    shadow: makeShadow(),
  });

  const ctaItems = [
    "📧  siddharthprashoo@gmail.com",
    "🔗  github.com/SheeshDarth/NirmiqLearnOS",
    "💬  Reply to this email to schedule a 20-min demo",
  ];

  ctaItems.forEach((item, i) => {
    s.addText(item, {
      x: 0.75, y: 3.1 + i * 0.44, w: 6.0, h: 0.38,
      fontFace: F.body, fontSize: 13, color: C.white, margin: 0,
    });
  });

  s.addText("Built on MIT licence. Students own their data, always.", {
    x: 0.5, y: 4.95, w: 9, h: 0.3,
    fontFace: F.body, fontSize: 11, color: C.muted, italic: true,
    align: "center", margin: 0,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────
await pres.writeFile({ fileName: OUT_FILE });
console.log(`✅  Deck written → ${OUT_FILE}`);
