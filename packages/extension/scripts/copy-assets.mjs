// scripts/copy-assets.mjs
// Copies manifest.json, HTML pages, and icons into dist/ after tsup build

import { copyFile, readdir, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const distDir = join(root, "dist");
const iconsDir = join(publicDir, "icons");
const distIconsDir = join(distDir, "icons");

// Ensure dist/icons exists
if (!existsSync(distIconsDir)) {
  await mkdir(distIconsDir, { recursive: true });
}

// Copy everything in public/ directly to dist/
const publicFiles = await readdir(publicDir);
for (const file of publicFiles) {
  const src = join(publicDir, file);
  const dest = join(distDir, file);
  // Skip the icons directory — handled separately below
  if (file === "icons") continue;
  await copyFile(src, dest);
  console.log(`  copied: ${file} → dist/${file}`);
}

// Copy icons if they exist
if (existsSync(iconsDir)) {
  const icons = await readdir(iconsDir);
  for (const icon of icons) {
    await copyFile(join(iconsDir, icon), join(distIconsDir, icon));
    console.log(`  copied: icons/${icon} → dist/icons/${icon}`);
  }
} else {
  console.log("  ⚠  No icons folder found. Add PNG icons to public/icons/ before publishing.");
}

console.log("✓ Assets copied to dist/");
