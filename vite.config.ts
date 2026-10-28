import vue from "@vitejs/plugin-vue";
import { defineConfig, lazyPlugins } from "vite-plus";

/** Shared formatting, linting, unit tests, and task policy for the monorepo. */
export default defineConfig({
  plugins: lazyPlugins(() => [vue()]),
  test: {
    include: ["packages/*/tests/**/*.test.ts", "apps/foldnotes/tests/**/*.test.ts"],
    // Tests resolve source directly so a fresh checkout does not need dist files first.
    alias: {
      "@folyx/core": new URL("./packages/core/src/index.ts", import.meta.url).pathname,
      "@folyx/vue": new URL("./packages/vue/src/index.ts", import.meta.url).pathname,
    },
  },

  staged: {
    "*": "vp check --fix",
  },

  fmt: {
    // Local browser-test artifacts may be retained without being treated as source files.
    ignorePatterns: ["test-results/**"],
    overrides: [
      {
        files: ["**/*.vue"],
        options: {
          // Keep nested template tags and attributes on separate, readable lines.
          htmlWhitespaceSensitivity: "ignore",
          singleAttributePerLine: true,
        },
      },
    ],
  },
  lint: {
    jsPlugins: [{ name: "vite-plus", specifier: "vite-plus/oxlint-plugin" }],
    rules: { "vite-plus/prefer-vite-plus-imports": "error" },
    options: { typeAware: true, typeCheck: true },
  },

  run: {
    // Verification scripts stay fresh; explicitly configured build tasks can be cached.
    cache: { scripts: false, tasks: true },
  },
});
