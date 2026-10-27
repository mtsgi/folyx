import vue from "@vitejs/plugin-vue";
import { defineConfig, lazyPlugins } from "vite-plus";

/** Build FoldLab against the library packages and the shared Pages pathname. */
export default defineConfig(({ command, isPreview }) => ({
  run: {
    tasks: {
      build: {
        command: "vue-tsc -b && vp build",
        // Both package outputs must be ready before the application build starts.
        dependsOn: ["@folyx/core#build", "@folyx/vue#build"],
      },
    },
  },

  // Source aliases support local development; production resolves package exports.
  resolve:
    command === "serve" && !isPreview
      ? {
          alias: {
            "@folyx/core": new URL("../../packages/core/src/index.ts", import.meta.url).pathname,
            "@folyx/vue": new URL("../../packages/vue/src/index.ts", import.meta.url).pathname,
          },
        }
      : undefined,

  base: process.env.FOLYX_BASE
    ? `${process.env.FOLYX_BASE.replace(/\/$/, "")}/foldlab/`
    : command === "build" || isPreview
      ? "/folyx/foldlab/"
      : "/",

  plugins: lazyPlugins(() => [vue()]),
}));
