# Folyx / FoldLab

Folyx helps you work with foldable screens by bringing posture, viewport regions, and their layout into a small TypeScript API. You can see which values were observed, which came from a fallback, and which are still unknown.

The workspace brings together four pieces:

- **@folyx/core** reads state and follows changes through immutable snapshots. Browser and Mock Providers share the same interface, and Core has no runtime dependencies.
- **@folyx/vue** connects those snapshots to Vue, including component cleanup, SSR, and shared instances.
- **FoldLab** gives you a place to try screen shapes, inspect a browser, and record measurements for local JSON export.
- **docs** introduces the API and its design in English and Japanese, with guides for coordinates, Providers, and Vue.

Here's a small Mock example you can try without a foldable device:

```ts
import { createFolyx, createMockProvider } from "@folyx/core";
const mock = createMockProvider({
  posture: "folded",
  viewport: { width: 900, height: 600 },
  segments: [
    { x: 0, y: 0, width: 440, height: 600 },
    { x: 460, y: 0, width: 440, height: 600 },
  ],
});
const folyx = createFolyx({ provider: mock });
const unsubscribe = folyx.subscribe((state) => console.log(state));
mock.set({ posture: "continuous" });
unsubscribe();
```

For local development, use Node >=22.19 and Vite+ (`vp`). The repository uses npm workspaces. Start with `vp install`, then open FoldLab or the documentation with the dev commands below.

```sh
vp install
vp run dev          # FoldLab
vp run dev:docs     # Blume
vp check
vp test
vp run -r build
vp run docs#validate
vp run test:package
```

`vp run ready` runs the complete set of checks, tests, builds, translation and link validation, and npm-tarball consumption checks. Pages artifact validation checks static routes and references without running JavaScript. For another deployment, set `FOLYX_BASE` and `FOLYX_SITE`; `vp run build:pages` writes `.pages/` with documentation at the root and FoldLab under `foldlab/`.

If you're new to Folyx, the [design guide](apps/docs/docs/philosophy.mdx) is a good place to start. You can then explore the [Core API](apps/docs/docs/core.mdx), [coordinates and current behavior](apps/docs/docs/coordinates.mdx), or [Vue sharing and cleanup](apps/docs/docs/vue.mdx). [日本語のドキュメント](apps/docs/docs/ja/index.mdx)もあります。

For project contributors, the [maintainer notes](docs/maintainers/README.md) cover device measurements, development, builds, and publishing. These repository documents stay outside the public documentation site.

Pixel 10 Pro Fold measurements are still pending. In version 0.1, Browser segments are used when layout and visual frames coincide and their bounds are consistent. For zoom or keyboard states whose coordinate mapping hasn't been verified, Folyx returns one fallback region covering the known layout viewport. API availability stays separate from that choice, and scale or DPR corrections aren't guessed.

GitHub Actions workflows are included for CI, Pages deployment, and manual same-version npm releases. Before the first publication, the scope access, initial package publication, per-package Trusted Publishers, and Pages settings need to be connected to your accounts. Local validation builds and checks the artifacts.

The development dependencies currently use targeted patch overrides for Blume's routing, selector-parser, and CLI schema packages. These keep the security fixes in place while the upstream dependencies catch up, and can be reviewed as part of an upgrade. Core remains free of runtime dependencies.
