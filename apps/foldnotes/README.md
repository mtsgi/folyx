# FoldNotes

A small Markdown notebook demonstrating `@folyx/vue` in an everyday app. FoldLab remains the separate API inspector and simulator.

## Run and build

From the repository root:

```sh
vp install
vp run dev:foldnotes
vp run foldnotes#build
vp run foldnotes#preview
```

The dev server defaults to `http://localhost:5174/`. Development and build tasks first build the Folyx packages, then use their normal package exports. The app is included in `vp run build` and `vp run ready`.

## GitHub Pages

The existing Pages workflow builds and verifies FoldNotes together with the docs and FoldLab, then deploys on pushes to `main` or manual dispatch. FoldNotes is served at `/folyx/foldnotes/` by default, with links in the docs header and mobile menu. `FOLYX_BASE` and `FOLYX_SITE` from `configure-pages` keep paths aligned with the actual Pages deployment.

To build and verify the combined artifact locally, run `vp run build:pages` and `vp run test:pages`. FoldNotes is written to `.pages/foldnotes/`. `vp run foldnotes#preview` serves the standalone app build at `/folyx/foldnotes/` by default.

## Layout

One `useFolyx()` subscription drives the UI. Only `horizontal` with exactly two segments and a non-`fallback` geometry source enables two panes. Each pane uses the segment's `x`, `y`, `width`, and `height` in layout-viewport CSS pixels, leaving any gap clear. The editor and preview scroll independently. Posture alone never selects a layout.

Other states use the responsive Single layout with Edit/Preview buttons. Notes are always visible at widths of 768px and above; smaller screens and two-pane layouts open the list within the editor region. Changing layouts preserves the selected note and edits. SSR starts in the unknown Single state; storage is read after mounting.

## MVP and limits

- List, select, create, and edit notes, with live Markdown preview and a first-run sample.
- Automatic localStorage persistence, including the selected note. Data stays in this browser and origin. No accounts, backend, synchronization, deletion, or rich-text editing.
- CommonMark headings, emphasis, lists, links, and code blocks via micromark. Raw HTML and dangerous URL protocols are disabled; no syntax highlighting or Markdown extensions.
- Storage failures keep editing available in the current tab and show a message. Unreadable stored data is preserved, with persistence disabled for that session.
- Vertical, complex, unknown, and fallback geometry use Single layout. No user-facing mock controls.

Run `vp check`, `vp test`, and `vp run ready` from the root. App tests reuse Vitest, happy-dom, and Folyx's Mock Provider.
