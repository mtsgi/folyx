/** @file Serve the Pages artifact locally for browser tests, including its base path. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";

const root = resolve(import.meta.dirname, "../.pages");
const base = `${(process.env.FOLYX_BASE ?? "/folyx/").replace(/\/$/, "")}/`;

const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".woff2": "font/woff2",
  ".png": "image/png",
};

createServer(async (request, response) => {
  try {
    const path = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);

    if (path === base.slice(0, -1)) {
      response.writeHead(308, { Location: base });
      response.end();
      return;
    }

    if (!path.startsWith(base)) throw new Error("Outside site base");

    let file = resolve(root, path.slice(base.length) || ".");

    // Resolve paths before checking the root boundary to reject traversal attempts.
    if (file !== root && !file.startsWith(root + sep)) throw new Error("Invalid path");
    if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");

    response.writeHead(200, { "Content-Type": mime[extname(file)] ?? "application/octet-stream" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
}).listen(Number(process.env.FOLYX_PORT ?? 4173), "127.0.0.1", () =>
  console.log(`Serving Pages at http://127.0.0.1:${process.env.FOLYX_PORT ?? 4173}${base}`),
);
