/* ═══════════════════════════════════════════════════════════════
   PORTFOLIO CONTENT REGISTRY
   Everything you'll want to change regularly lives in this one file.
   Edit, save, refresh the page. No other file needs touching.
   ═══════════════════════════════════════════════════════════════ */


/* ───────────────────────────────────────────────────────────────
   1. CASE STUDIES  (the 2×2 grid under "The work")
   For each entry:
     • folder for the cover:  case-studies/<slug>/cover.jpg
     • the PDF itself:        case-studies/<slug>.pdf
     • `password` is the access code you share for THAT study only
   Add a study by copying a block; remove one by deleting its block.
   ─────────────────────────────────────────────────────────────── */

window.CASE_STUDIES = [
  {
    slug: "acquire.ai-case study",
    title: "Procurement Solution with AI Agents",
    org: "Spend Intelligence · Procurement Solution",
    summary: "An AI-powered procurement platform that automates sourcing, predicts supply chain risk, and delivers real-time cost intelligence.",
    tags: ["Product usage", "Dashboards", "Enterprise UX"],
    password: "akpixels@16",
    href: "case-studies/acquire.ai-case study.pdf",
    cover: "case-studies/acquire.ai-case study/cover.jpg"
  },
  {
    slug: "vessel-management-portal",
    title: "Vessel Management Portal",
    org: "Enterprise SaaS · Maritime",
    summary: "Enterprise SaaS for maritime vessel management.",
    tags: ["Enterprise SaaS", "Maritime", "Workflow"],
    password: "akpixels@16",
    href: "case-studies/vessel-management-portal.pdf",
    cover: "case-studies/vessel-management-portal/cover.jpg"
  },
  {
    slug: "numera-spreading",
    title: "AI-Powered Financial Data Extraction",
    org: "Lending · Credit risk",
    summary: "An AI-powered financial spreading tool that replaces conventional manual data entry processes with automated data extraction to configurable templates.",
    tags: ["Data entry", "Document AI", "Credit"],
    password: "akpixels@16",
    href: "case-studies/spreadsmart.pdf",
    cover: "case-studies/spreadsmart/cover.jpg"
  },
  {
    slug: "mastercard",
    title: "Global Payment Network — Usage & Tracking Platform",
    org: "Life sciences · AI platform",
    summary: "A real-time analytics engine for monitoring cross-border transaction flows, tracking volume metrics, and optimizing network performance across global payment rails.",
    tags: ["Fintech", "Insights", "Enterprise SaaS"],
    password: "akpixels@16",
    href: "case-studies/mastercard.pdf",
    cover: "case-studies/mastercard/cover.jpg"
  }
];


/* ───────────────────────────────────────────────────────────────
   2. ODDS AND ENDS  (no access code — anyone can open these)
     • image:  images/<name>.jpg
     • href:   extras/<name>.pdf
   ─────────────────────────────────────────────────────────────── */

window.EXTRAS = [
  { caption: "Insights.AI",      image: "images/extra-1.jpg", href: "extras/extra-1.pdf" },
  { caption: "Sourcing workflow — Procurement.ai", image: "images/extra-2.jpg", href: "extras/extra-2.pdf" },
  { caption: "Spreading canvas — Spreadsmart",     image: "images/extra-3.jpg", href: "extras/extra-3.pdf" }
];


/* ───────────────────────────────────────────────────────────────
   3. DOMAIN CHIPS  (the pill row in the collection band)
   ─────────────────────────────────────────────────────────────── */

window.DOMAINS = [
  "FinTech",
  "Risk & Quant",
  "Agentic AI",
  "Data Analytics",
  "EdTech",
  "VR",
  "Enterprise Accelerators"
];


/* ───────────────────────────────────────────────────────────────
   4. INTRO AUDIO  (the voice clip the landing aura reacts to)
   Easiest way to swap it: drop your new file into the audio/ folder
   named  intro.wav  — it overwrites the old one and nothing else
   needs changing.
   Using a different name or format (mp3 / m4a / ogg all work)?
   Just point this at it.
   ─────────────────────────────────────────────────────────────── */

window.INTRO_AUDIO = "audio/intro.wav";
