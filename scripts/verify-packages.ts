/** @file Verify packed libraries from an external consumer without workspace aliases. */
import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dirname, "..");
const consumer = await mkdtemp(join(tmpdir(), "folyx-consumer-"));

try {
  for (const name of ["core", "vue"]) {
    const staging = join(consumer, "staging", name);
    await mkdir(staging, { recursive: true });

    for (const file of ["dist", "package.json", "README.md", "LICENSE"])
      await cp(join(root, "packages", name, file), join(staging, file), { recursive: true });

    const packResult = JSON.parse(
      execFileSync(
        "vp",
        [
          "-C",
          root,
          "pm",
          "pack",
          "--",
          staging,
          "--ignore-scripts",
          "--json",
          "--pack-destination",
          consumer,
        ],
        { cwd: root, encoding: "utf8" },
      ),
    );

    // Support both npm's array output and its package-keyed output shape.
    const packages = (Array.isArray(packResult) ? packResult : Object.values(packResult)) as {
      name: string;
      filename: string;
      files: { path: string }[];
    }[];
    const packed = packages.find((p) => p.name === `@folyx/${name}`);
    assert(packed, "npm pack did not return the requested package");

    const destination = join(consumer, "node_modules/@folyx", name);
    await mkdir(destination, { recursive: true });
    execFileSync("tar", [
      "-xzf",
      join(consumer, packed.filename),
      "-C",
      destination,
      "--strip-components=1",
    ]);

    assert(
      packed.files.some((f: { path: string }) => f.path === "dist/index.d.mts"),
      "Declarations missing from npm package",
    );
    assert(
      !packed.files.some(
        (f: { path: string }) => f.path.startsWith("src/") || f.path.includes("node_modules"),
      ),
      "Unexpected package content",
    );
  }

  // Only the third-party peer is linked. Both Folyx packages are actual unpacked npm tarballs.
  await symlink(join(root, "node_modules/vue"), join(consumer, "node_modules/vue"), "dir");
  await writeFile(join(consumer, "package.json"), JSON.stringify({ type: "module" }));

  // Core's declarations must resolve without requiring the DOM library.
  await writeFile(
    join(consumer, "core-only.ts"),
    `import { createFolyx, type FolyxSnapshot } from '@folyx/core'; const state: FolyxSnapshot = createFolyx().getSnapshot(); void state;`,
  );
  await writeFile(
    join(consumer, "core-only.json"),
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        target: "ES2022",
        lib: ["ES2023"],
        types: [],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      include: ["core-only.ts"],
    }),
  );
  execFileSync(
    process.execPath,
    [join(root, "node_modules/typescript/bin/tsc"), "-p", join(consumer, "core-only.json")],
    { cwd: consumer, stdio: "inherit" },
  );

  // Check the public Vue contract alongside readonly snapshots and exclusive options.
  await writeFile(
    join(consumer, "consumer.ts"),
    `import { createFolyx, createMockProvider, type FolyxSnapshot } from '@folyx/core';
import { useFolyx, type UseFolyxOptions } from '@folyx/vue';
const folyx = createFolyx({ provider: createMockProvider({ viewport: { width: 800, height: 600 } }) });
const state: FolyxSnapshot = folyx.getSnapshot();
const options: UseFolyxOptions = { folyx };
void options; void useFolyx;
// @ts-expect-error public snapshots are immutable
state.posture.value = 'folded';
// @ts-expect-error mutually exclusive ownership options
const invalid: UseFolyxOptions = { folyx, provider: createMockProvider() };
void invalid;
`,
  );
  await writeFile(
    join(consumer, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        target: "ES2022",
        lib: ["ES2023", "DOM"],
        types: [],
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      include: ["consumer.ts"],
    }),
  );
  execFileSync(
    process.execPath,
    [join(root, "node_modules/typescript/bin/tsc"), "-p", join(consumer, "tsconfig.json")],
    { cwd: consumer, stdio: "inherit" },
  );

  // Runtime imports must also succeed in Node with no browser globals.
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import assert from 'node:assert/strict'; import {createFolyx,createMockProvider} from '@folyx/core'; import {useFolyx} from '@folyx/vue'; assert.equal(typeof useFolyx,'function'); assert.equal(createFolyx().getSnapshot().layout,'unknown'); assert.equal(createFolyx({provider:createMockProvider({viewport:{width:800,height:600}})}).getSnapshot().segments.source,'fallback');`,
    ],
    { cwd: consumer, stdio: "inherit" },
  );

  const vue = await readFile(join(consumer, "node_modules/@folyx/vue/dist/index.mjs"), "utf8");
  assert(/from\s*["']vue["']/.test(vue), "Vue must remain an external peer");

  console.log(
    "Published tarballs: external ESM imports, readonly types, SSR, and Vue peer resolution passed.",
  );
} finally {
  await rm(consumer, { recursive: true, force: true });
}
