/** @file Build the full Blume site without disturbing a running docs dev server. */
import { execFileSync } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

// Full builds include discovery/search assets that --isolated omits.
const root = resolve(import.meta.dirname, "..");
const source = join(root, "apps/docs");

// Keep staging inside the workspace so Astro can resolve the shared toolchain.
const staging = await mkdtemp(join(root, ".docs-build-"));

try {
  for (const entry of ["docs", "components", "components.ts", "blume.config.ts", "package.json"])
    await cp(join(source, entry), join(staging, entry), { recursive: true });

  execFileSync(process.execPath, [join(root, "node_modules/blume/bin/blume.mjs"), "build"], {
    cwd: staging,
    stdio: "inherit",
  });

  // Replace the previous artifact only after the build succeeds.
  await rm(join(source, "dist"), { recursive: true, force: true });
  await cp(join(staging, "dist"), join(source, "dist"), { recursive: true });
} finally {
  await rm(staging, { recursive: true, force: true });
}
