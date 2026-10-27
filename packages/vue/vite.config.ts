import { defineConfig } from "vite-plus";

/** Build the adapter after Core and keep its runtime dependencies external. */
export default defineConfig({
  run: {
    tasks: {
      // Core's output must exist before the adapter resolves its dependency.
      build: { command: "vp pack", dependsOn: ["@folyx/core#build"] },
    },
  },
  pack: {
    format: ["esm"],
    target: "es2022",
    sourcemap: true,
    // Consumers provide Vue as a peer and Core as a separate package.
    deps: { neverBundle: ["vue", "@folyx/core"] },
    dts: true,
    exports: false,
  },
});
