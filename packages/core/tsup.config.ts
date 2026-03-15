import { defineConfig } from "tsup";

export default defineConfig([
  // ESM + CJS (npm package consumers)
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    outDir: "dist",
  },
  // UMD browser bundle (CDN, extensions, plain <script> tags)
  {
    entry: { "spendlens.umd": "src/index.ts" },
    format: ["iife"],
    globalName: "TokenLens",
    minify: true,
    outDir: "dist",
    outExtension: () => ({ js: ".min.js" }),
  },
]);
