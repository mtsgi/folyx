import vue from "@vitejs/plugin-vue";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig(({ command, isPreview }) => ({
  base: process.env.FOLYX_BASE
    ? `${process.env.FOLYX_BASE.replace(/\/$/, "")}/foldnotes/`
    : command === "build" || isPreview
      ? "/folyx/foldnotes/"
      : "/",
  server: { port: 5174 },
  plugins: lazyPlugins(() => [vue()]),
  run: {
    tasks: {
      dev: {
        command: "vp dev",
        dependsOn: ["@folyx/vue#build"],
        cache: false,
      },
      build: {
        command: ["vue-tsc -b", "vp build"],
        dependsOn: ["@folyx/vue#build"],
      },
    },
  },
}));
