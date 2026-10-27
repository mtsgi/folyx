/** @file Check release versions and stamp real repository metadata before packing. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const tag = process.env.FOLYX_RELEASE_TAG ?? "";
const repository = process.env.GITHUB_REPOSITORY ?? "";

if (!/^v\d+\.\d+\.\d+$/.test(tag) || !/^[\w.-]+\/[\w.-]+$/.test(repository))
  throw new Error("A version tag and real GitHub repository are required");

for (const name of ["core", "vue"]) {
  const path = resolve(import.meta.dirname, `../packages/${name}/package.json`);
  const pkg = JSON.parse(await readFile(path, "utf8"));

  if (`v${pkg.version}` !== tag) throw new Error(`${pkg.name} does not match ${tag}`);
  if (name === "vue" && pkg.dependencies["@folyx/core"] !== `^${tag.slice(1)}`)
    throw new Error("Vue dependency must track the shared version");

  // Use the actual Actions repository instead of shipping placeholder package links.
  pkg.repository = {
    type: "git",
    url: `git+https://github.com/${repository}.git`,
    directory: `packages/${name}`,
  };
  pkg.homepage = `https://github.com/${repository}#readme`;
  pkg.bugs = { url: `https://github.com/${repository}/issues` };

  await writeFile(path, JSON.stringify(pkg, null, 2) + "\n");
}
