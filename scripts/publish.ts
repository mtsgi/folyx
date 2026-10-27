/** @file Publish Core then Vue, skipping retries only when tarball integrity matches. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const output = await mkdtemp(join(tmpdir(), "folyx-release-"));

try {
  for (const name of ["core", "vue"]) {
    const cwd = resolve(import.meta.dirname, `../packages/${name}`);
    const pkg = JSON.parse(await readFile(join(cwd, "package.json"), "utf8"));

    if (`v${pkg.version}` !== process.env.FOLYX_RELEASE_TAG || !pkg.repository?.url)
      throw new Error("Run release preparation and validation first");

    const packed = JSON.parse(
      execFileSync(
        "vp",
        ["pm", "pack", "--", "--ignore-scripts", "--json", "--pack-destination", output],
        { cwd, encoding: "utf8" },
      ),
    );

    // npm versions return either an array or an object keyed by package identity.
    const entries = (Array.isArray(packed) ? packed : Object.values(packed)) as {
      name: string;
      filename: string;
    }[];
    const entry = entries.find((p) => p.name === pkg.name);

    if (!entry) throw new Error("npm pack did not return the requested package");

    const tarball = join(output, entry.filename);
    const response = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(pkg.name)}/${pkg.version}`,
    );

    if (response.ok) {
      const existing = (await response.json()) as { dist: { integrity?: string } };
      const integrity = `sha512-${createHash("sha512")
        .update(await readFile(tarball))
        .digest("base64")}`;

      if (existing.dist.integrity !== integrity)
        throw new Error(`${pkg.name}@${pkg.version} already exists with different content`);

      console.log(`Already published: ${pkg.name}@${pkg.version}`);
      continue;
    }

    if (response.status !== 404) throw new Error(`Registry check failed: ${response.status}`);

    execFileSync("vp", ["pm", "publish", tarball, "--access", "public"], { cwd, stdio: "inherit" });
  }
} finally {
  await rm(output, { recursive: true, force: true });
}
