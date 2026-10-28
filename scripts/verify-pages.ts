/** @file Check static Pages routes and local asset references without executing scripts. */
import { strict as assert } from "node:assert";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { Window } from "happy-dom";
import type { HTMLAnchorElement } from "happy-dom";

const root = resolve(import.meta.dirname, "../.pages");
const base = `${(process.env.FOLYX_BASE ?? "/folyx/").replace(/\/$/, "")}/`;
const origin = process.env.FOLYX_SITE ?? "http://127.0.0.1:4173";
const files: string[] = [];
const guideDiagrams = {
  index: "overview",
  core: "layout",
  providers: "providers",
  coordinates: "coordinates",
  vue: "ssr",
  philosophy: "philosophy",
} as const;

/** Collect generated HTML pages, including locale routes and demo apps. */
async function walk(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith(".html")) files.push(path);
  }
}

await walk(root);

for (const path of [
  ...["", "ja/"].flatMap((locale) =>
    ["index", "core", "providers", "coordinates", "vue", "philosophy", "references"].map(
      (guide) => `${locale}${guide === "index" ? "" : `${guide}/`}index.html`,
    ),
  ),
  "foldlab/index.html",
  "foldnotes/index.html",
  "blume-search.json",
])
  assert((await stat(join(root, path))).isFile(), `Missing Pages route: ${path}`);

let references = 0;

for (const file of files) {
  const html = await readFile(file, "utf8");
  const page = new URL(base + relative(root, file).split(sep).join("/"), origin);

  // Parse links only: verification must not load scripts, styles, or network resources.
  const dom = new Window({
    url: page.href,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true,
      disableIframePageLoading: true,
    },
  });
  dom.document.write(html);

  const route = relative(root, file).split(sep).join("/");
  if (route !== "404.html" && !/^(foldlab|foldnotes)\//.test(route)) {
    const document = dom.document;
    const guide = route
      .replace(/^ja\//, "")
      .replace(/\/index\.html$/, "")
      .replace(/\.html$/, "");
    const markdownPath =
      route === "index.html" ? "index.md" : route.replace(/\/index\.html$/, ".md");
    const markdown = await readFile(join(root, markdownPath), "utf8");
    assert.equal(document.querySelectorAll("h1").length, 1, `Expected one page title in ${route}`);
    assert(
      !/<(?:DocsHero|DocDiagram|PackageInstall)\b/.test(markdown),
      `Unconverted component in ${markdownPath}`,
    );

    if (Object.hasOwn(guideDiagrams, guide)) {
      const kind = guideDiagrams[guide as keyof typeof guideDiagrams];
      const diagram = document.querySelector(`[data-doc-diagram="${kind}"]`);
      assert(diagram, `Missing ${kind} diagram in ${route}`);
      assert(
        diagram.querySelector("figcaption")?.textContent?.trim(),
        `Missing diagram caption in ${route}`,
      );
      assert(diagram.querySelector("svg"), `Missing SVG in ${route}`);
      for (const svg of diagram.querySelectorAll("svg")) {
        assert(svg.hasAttribute("viewBox"), `Missing responsive SVG viewport in ${route}`);
        assert.equal(svg.getAttribute("role"), "img", `Missing SVG role in ${route}`);
        assert(svg.getAttribute("aria-label"), `Missing SVG label in ${route}`);
        assert(svg.querySelector("title")?.textContent?.trim(), `Missing SVG title in ${route}`);
        assert(
          svg.querySelector("desc")?.textContent?.trim(),
          `Missing SVG description in ${route}`,
        );
      }
      const explanation = diagram.querySelector("figcaption p")!.textContent!.trim();
      assert(markdown.includes(explanation), `Missing diagram explanation in ${markdownPath}`);
    }

    if (guide === "index") {
      const hero = document.querySelector("[data-doc-hero]");
      assert(hero, `Missing docs hero in ${route}`);
      assert(document.getElementById("install"), `Missing installation anchor in ${route}`);
      assert(hero.querySelector('a[href="#install"]'), `Missing get-started link in ${route}`);
      const experiment = [...hero.querySelectorAll("a")].find(
        (link) =>
          new URL(link.getAttribute("href")!, page).href ===
          new URL(`${base}foldlab/`, origin).href,
      );
      assert(experiment, `Missing FoldLab hero link in ${route}`);
      assert(
        markdown.includes(hero.querySelector(".headline")!.textContent!.trim()),
        `Missing hero copy in ${markdownPath}`,
      );
    }

    if (guide === "index" || guide === "vue") {
      const installer = document.querySelector("[data-package-install] blume-tabs");
      assert(installer, `Missing package manager switcher in ${route}`);
      assert.equal(
        installer.getAttribute("data-hash"),
        "false",
        `Installation tabs change the anchor in ${route}`,
      );
      assert.equal(
        installer.getAttribute("data-sync-key"),
        "folyx-install",
        `Unscoped installation tabs in ${route}`,
      );
      const panels = [...installer.querySelectorAll("[data-blume-tab-panel]")];
      assert.deepEqual(
        panels.map((panel) => panel.getAttribute("data-title")),
        ["npm", "pnpm", "Yarn", "Bun"],
        `Incorrect package managers in ${route}`,
      );
      const packages = guide === "vue" ? "@folyx/core @folyx/vue vue" : "@folyx/core";
      for (const [index, prefix] of ["npm install", "pnpm add", "yarn add", "bun add"].entries()) {
        const command = `${prefix} ${packages}`;
        assert.equal(
          panels[index]!.querySelector("pre code")?.textContent?.trim(),
          command,
          `Incorrect command in ${route}`,
        );
        assert(markdown.includes(command), `Missing ${prefix} command in ${markdownPath}`);
      }
    }

    const drawer = dom.document.querySelector("[data-blume-nav-drawer]");
    assert(drawer, `Missing navigation drawer in ${route}`);

    const toggle = dom.document.querySelector("[data-blume-header] [data-blume-nav-toggle]");
    assert.equal(
      toggle?.getAttribute("aria-controls"),
      drawer.id,
      `Missing menu toggle on ${route}`,
    );

    for (const [name, slug] of [
      ["FoldLab", "foldlab"],
      ["FoldNotes", "foldnotes"],
    ]) {
      const expected = new URL(`${base}${slug}/`, origin).href;
      const demoLink: HTMLAnchorElement | undefined = [...drawer.querySelectorAll("a")].find(
        (element) => element.textContent?.trim() === name,
      );
      assert(demoLink, `Missing ${name} link in the navigation drawer on ${route}`);
      assert.equal(
        new URL(demoLink.getAttribute("href")!, page).href,
        expected,
        `Incorrect ${name} link on ${route}`,
      );
      const headerLink = [...document.querySelectorAll("[data-blume-header] a")].find(
        (element) => element.textContent?.trim() === `${name} ↗`,
      );
      assert(headerLink, `Missing ${name} link in the header on ${route}`);
      assert.equal(
        new URL(headerLink.getAttribute("href")!, page).href,
        expected,
        `Incorrect ${name} header link on ${route}`,
      );
    }
  }

  const links = [...dom.document.querySelectorAll("[href], [src]")].flatMap((element) =>
    [element.getAttribute("href"), element.getAttribute("src")].filter(
      (value): value is string => value !== null,
    ),
  );
  await dom.happyDOM.close();

  for (const link of links) {
    const url = new URL(link, page);

    if (url.origin !== new URL(origin).origin || !["http:", "https:"].includes(url.protocol))
      continue;

    const siteRoot = url.pathname === base.slice(0, -1);

    assert(
      siteRoot || url.pathname.startsWith(base),
      `Reference escapes Pages base: ${url.href} in ${file}`,
    );

    let target = resolve(
      root,
      siteRoot ? "." : decodeURIComponent(url.pathname.slice(base.length)) || ".",
    );
    assert(target === root || target.startsWith(root + sep), "Invalid artifact reference");

    try {
      if ((await stat(target)).isDirectory()) target = join(target, "index.html");
      assert((await stat(target)).isFile());
    } catch {
      throw new Error(
        `Missing artifact target ${url.pathname} referenced by ${relative(root, file)}`,
      );
    }

    references++;
  }
}

console.log(
  `Pages artifact: ${files.length} HTML routes and ${references} local references verified at ${base}.`,
);
