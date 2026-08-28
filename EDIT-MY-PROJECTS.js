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
    title: "AI-Powered Financial Data Extraction Platform",
    org: "Lending · Credit risk",
    summary: "An AI-powered financial spreading tool that replaces conventional manual data entry processes with automated data extraction to configurable templates.",
    tags: ["Data entry", "Document AI", "Credit"],
    password: "akpixels@16",
    href: "case-studies/numera-spreading.pdf",
    cover: "case-studies/numera-spreading/cover.jpg"
  },
  {
    slug: "conference-solution",
    title: "Conference Solution",
    org: "Life sciences · AI platform",
    summary: "AI-enabled platform for extracting data from medical conferences and surfacing insights.",
    tags: ["Data extraction", "Insights", "AI platform"],
    password: "akpixels@16",
    href: "case-studies/conference-solution",
    cover: "case-studies/conference-solution/cover.jpg"
  }
];


/* ───────────────────────────────────────────────────────────────
   2. ODDS AND ENDS  (no access code — anyone can open these)
     • image:  images/<name>.jpg
     • href:   extras/<name>.pdf
   ─────────────────────────────────────────────────────────────── */

window.EXTRAS = [
  { caption: "Model Risk Validator",      image: "images/extra-1.jpg", href: "extras/extra-1.pdf" },
  { caption: "VR Training - Maritime", image: "images/extra-2.jpg", href: "extras/extra-2.pdf" },
  { caption: "Indexing",     image: "images/extra-3.jpg", href: "extras/extra-3.pdf" }
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
