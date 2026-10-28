import { defineConfig } from "blume";
import { diagramMarkdown, heroMarkdown, installMarkdown } from "./components/markdown.ts";

const base = process.env.FOLYX_BASE ?? "/folyx/";
const site =
  process.env.FOLYX_SITE ?? (process.argv.includes("build") ? "http://127.0.0.1:4173" : undefined);
const foldlabHref = site
  ? new URL(`${base.replace(/\/$/, "")}/foldlab/`, site).href
  : "http://localhost:5173/";
const foldnotesHref = site
  ? new URL(`${base.replace(/\/$/, "")}/foldnotes/`, site).href
  : "http://localhost:5174/";

/** Public library documentation, with a shared deployment base and bilingual prose. */
export default defineConfig({
  title: "Folyx",
  description: "Explore foldable screen state with a small TypeScript API.",
  // Maintainer notes live outside this content root and stay out of generated output.
  content: { root: "docs" },
  agents: {
    markdownComponents: {
      DocsHero: heroMarkdown(foldlabHref),
      DocDiagram: diagramMarkdown,
      PackageInstall: installMarkdown,
    },
  },
  theme: { accent: "teal", radius: "md" },
  i18n: {
    defaultLocale: "en",
    locales: [
      {
        code: "en",
        label: "English",
        style:
          "Use warm, plain English. Start with what the reader can do, then explain how it works in short, connected paragraphs. Explain unfamiliar terms with concrete wording. Keep API contracts, limitations, identifiers, and code examples precise.",
      },
      {
        code: "ja",
        label: "日本語",
        style:
          "読み手に自然に語りかける、やわらかい「です・ます」調で書きます。使いどころから説明し、短い段落でつなぎます。専門用語は具体的な言葉で説明し、API名・状態の値・コード例・技術的な条件は正確に保ちます。",
      },
    ],
  },
  deployment: { site, base },
  navigation: {
    actions: [
      {
        label: "FoldLab ↗",
        href: foldlabHref,
      },
      {
        label: "FoldNotes ↗",
        href: foldnotesHref,
      },
    ],
    // Header actions are hidden on narrow screens; featured links also appear in the mobile drawer.
    featured: [
      { label: "FoldLab", href: foldlabHref },
      { label: "FoldNotes", href: foldnotesHref },
    ],
  },
  seo: { og: { enabled: false } },
});
