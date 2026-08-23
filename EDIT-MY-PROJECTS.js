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
    slug: "mastercard",
    title: "Global Payments Network",
    org: "Financial services · Payment processing",
    summary: "Global technology and financial services company that runs a payment processing network. Internal tool to track the usages of all products Procurement.",
    tags: ["Product usage", "Dashboards", "Enterprise UX"],
    password: "akpixels@16",
    href: "case-studies/mastercard.pdf",
    cover: "case-studies/mastercard/cover.jpg"
  },
  {
    slug: "procurement-ai",
    title: "Vessel Management Portal",
    org: "Enterprise SaaS · Maritime",
    summary: "Enterprise SaaS for maritime vessel management.",
    tags: ["Enterprise SaaS", "Maritime", "Workflow"],
    password: "akpixels@16",
    href: "case-studies/procurement-ai.pdf",
    cover: "case-studies/procurement-ai/cover.jpg"
  },
  {
    slug: "spreadsmart",
    title: "AI-Powered Financial Data Extraction",
    org: "Lending · Credit risk",
    summary: "An AI-powered financial spreading tool that replaces conventional manual data entry processes with automated data extraction to configurable templates.",
    tags: ["Data entry", "Document AI", "Credit"],
    password: "akpixels@16",
    href: "case-studies/spreadsmart.pdf",
    cover: "case-studies/spreadsmart/cover.jpg"
  },
  {
    slug: "credit-risk-staging",
    title: "Conference Solution",
    org: "Life sciences · AI platform",
    summary: "AI-enabled platform for extracting data from medical conferences and surfacing insights.",
    tags: ["Data extraction", "Insights", "AI platform"],
    password: "akpixels@16",
    href: "case-studies/credit-risk-staging.pdf",
    cover: "case-studies/credit-risk-staging/cover.jpg"
  }
];


/* ───────────────────────────────────────────────────────────────
   2. ODDS AND ENDS  (no access code — anyone can open these)
     • image:  images/<name>.jpg
     • href:   extras/<name>.pdf
   ─────────────────────────────────────────────────────────────── */

window.EXTRAS = [
  { caption: "Usage analytics — Mastercard",      image: "images/extra-1.jpg", href: "extras/extra-1.pdf" },
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
