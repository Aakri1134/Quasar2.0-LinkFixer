import type { FeatureItem } from "./Home.types";
import type { StepItem } from "./sections/StepSection";

export const STEPS: StepItem[] = [
  {
    title: "Enter your URL",
    description:
      "Paste any public website URL into the input field. LinkFixer accepts root domains, subdomains, and deep paths.",
  },
  {
    title: "Crawler maps your site",
    description:
      "Our distributed Puppeteer crawler follows every internal link, collecting status codes, redirect chains, and Core Web Vitals as it goes.",
  },
  {
    title: "Issues surface instantly",
    description:
      "Broken links, slow pages, and malformed sitemap entries appear in a live dashboard as pages are processed — no waiting for a full crawl.",
  },
  {
    title: "Export and fix",
    description:
      "Download a prioritised CSV or PDF report and share it with your team. Each issue includes the exact URL, error type, and a recommended fix.",
  },
]

export const FEATURES: FeatureItem[] = [
  {
    title: "Broken link detection",
    description:
      "Crawl every page on your site and surface 4xx/5xx errors before they hurt your users or your SEO rankings.",
  },
  {
    title: "Core Web Vitals",
    description:
      "Measure LCP, CLS, and FID across all your pages so you know exactly where performance is slipping.",
  },
  {
    title: "Sitemap analysis",
    description:
      "Parse and validate your sitemap.xml, flag missing pages, and visualize the full structure of your site.",
  },
  {
    title: "Redirect chains",
    description:
      "Detect multi-hop redirects that slow down crawls and hurt page authority, then get precise fix suggestions.",
  },
  {
    title: "Scheduled monitoring",
    description:
      "Set recurring checks so you're the first to know when something breaks — not your users or Google.",
  },
  {
    title: "Detailed reports",
    description:
      "Export health reports as PDF or CSV to share with your team or clients, with actionable fix priorities built in.",
  },
]
