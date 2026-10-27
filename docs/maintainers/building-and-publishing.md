# Building and publishing

These contributor notes cover local development, site builds, and npm releases. They are kept in the repository, outside the public documentation site.

## Working on the project

The workspace uses Vite+ and npm. Start with `vp install`, then use `vp run dev` for FoldLab or `vp run dev:docs` for the documentation. Libraries are built with `vp pack` and include ESM, type declarations, and source maps.

Internal package dependencies use npm-compatible semver ranges, so the workspace doesn't need `workspace:*` references. Blume is currently pinned to 2.1.0 because the newer dependency set encountered npm peer-resolution cycling in this workspace. When updating that pin, check dependency resolution as well as the build. The workspace doesn't need a `legacy-peer-deps` setting.

Public documentation lives in `apps/docs/docs`. Keep contributor material, including device verification and build or release procedures, in `docs/maintainers` so it stays outside Blume's content root.

English is the public documentation's source language, with Japanese pages under `apps/docs/docs/ja`. Once you've reviewed a new translation, `vp run docs#translations:adopt` uses Blume's official workflow to adopt existing pages and record their source revision. CI uses `vp run docs#translations:check` to spot translations that have fallen behind. When the source changes, update the Japanese page and use the official workflow again. The [Blume translation guide](https://useblume.dev/guides/translate-markdown-documentation) explains the process in more detail. The contributor notes here are maintained separately from Blume's translation tracking.

## Publishing to GitHub Pages

The Pages workflow builds the documentation and FoldLab separately, then brings their output into one artifact. The documentation sits at the site root, with FoldLab under `/foldlab/`.

`FOLYX_BASE` is the deployment pathname and `FOLYX_SITE` is the origin. Actions obtains both from `configure-pages`. Local Pages builds default to `/folyx/`, and the documentation dev server uses that path too.

To connect the repository, select GitHub Actions under Settings → Pages. The workflow can then deploy on a push to `main` or a manual dispatch. For a custom domain, set it up in Pages first so the origin and base supplied to the build match the published address. The output is static, so it doesn't need server-side APIs.

## Preparing an npm release

The two packages start at 0.1.0 and are versioned together. For a release, update both versions, the Vue-to-Core dependency, app dependencies, and the lockfile. Commit the changes, create a matching v-prefixed tag, and run the manual release workflow with that tag.

The workflow checks versions, builds, tests, and package contents before publishing Core and then Vue. If a release stops partway through, it can be retried; a matching version that's already published is skipped. The two publications are separate operations rather than a transaction that can be rolled back together.

Before the first release, you'll need ownership of the `@folyx` scope, a public GitHub repository, matching repository metadata in both manifests, and a Trusted Publisher configured for each package with `release.yml` as its workflow. The release workflow fills in the actual GitHub repository metadata before packing, so placeholder author or repository URLs aren't needed in this checkout.

For a new package name, the scope owner first makes an authenticated publication using the validated package output and their own npm session. Package-level Trusted Publishing can then be configured for later releases from GitHub-hosted runners. Those releases use OIDC, so a long-lived npm token isn't needed in the repository. The [npm Trusted Publishing guide](https://docs.npmjs.com/trusted-publishers/) covers the setup.
