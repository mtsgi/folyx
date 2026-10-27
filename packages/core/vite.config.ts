import { defineConfig } from "vite-plus";

/** Distribute framework-independent ESM, declarations, and source maps. */
export default defineConfig({
  pack: {
    format: ["esm"],
    target: "es2022",
    sourcemap: true,
    dts: true,
    exports: false,
  },
});
