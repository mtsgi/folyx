import { defineConfig } from "blume";

const base = process.env.FOLYX_BASE ?? "/folyx/";
const site =
  process.env.FOLYX_SITE ?? (process.argv.includes("build") ? "http://127.0.0.1:4173" : undefined);

/** Public library documentation, with a shared deployment base and bilingual prose. */
export default defineConfig({
  title: "Folyx",
  description: "Explore foldable screen state with a small TypeScript API.",
  // Maintainer notes live outside this content root and stay out of generated output.
  content: { root: "docs" },
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
        href: site
          ? new URL(`${base.replace(/\/$/, "")}/foldlab/`, site).href
          : "http://localhost:5173/",
      },
    ],
  },
  seo: { og: { enabled: false } },
});
