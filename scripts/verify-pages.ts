/** @file Check static Pages routes and local asset references without executing scripts. */
import { strict as assert } from "node:assert";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { Window } from "happy-dom";

const root = resolve(import.meta.dirname, "../.pages");
const base = `${(process.env.FOLYX_BASE ?? "/folyx/").replace(/\/$/, "")}/`;
const origin = process.env.FOLYX_SITE ?? "http://127.0.0.1:4173";
const files: string[] = [];

/** Collect generated HTML pages, including locale routes and FoldLab. */
async function walk(dir: string) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith(".html")) files.push(path);
  }
}

await walk(root);

for (const path of [
  "index.html",
  "ja/philosophy/index.html",
  "core/index.html",
  "foldlab/index.html",
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
