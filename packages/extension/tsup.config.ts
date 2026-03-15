import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    background: "src/background.ts",
    content: "src/content.ts",
    options: "src/options.ts",
    popup: "src/popup.ts",
  },
  format: ["iife"],
  outDir: "dist",
  clean: true,
  sourcemap: false,
  minify: true,
  noExternal: ["spendlens"],
  outExtension: () => ({ js: ".js" }),
  esbuildOptions(opts) {
    // Prevent tsup from appending ".global" to IIFE output filenames
    opts.globalName = "TokenLensExt";
  },
});
