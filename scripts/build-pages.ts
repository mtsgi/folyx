/** @file Merge prebuilt docs and demo apps into one static GitHub Pages artifact. */
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const base = process.env.FOLYX_BASE ?? "/folyx/";

if (!base.startsWith("/") || base.includes("..") || /[?#]/.test(base))
  throw new Error("FOLYX_BASE must be an absolute URL pathname");

const output = resolve(root, ".pages");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

// Workspace tasks build these inputs before merging; do not start nested vp tasks here.
await cp(resolve(root, "apps/docs/dist"), output, { recursive: true });
await cp(resolve(root, "apps/foldlab/dist"), resolve(output, "foldlab"), { recursive: true });
await cp(resolve(root, "apps/foldnotes/dist"), resolve(output, "foldnotes"), { recursive: true });
await writeFile(resolve(output, ".nojekyll"), "");

console.log(`Pages artifact: ${output} (base ${base})`);
