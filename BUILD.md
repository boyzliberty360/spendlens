# SpendLens — Build Instructions

## Requirements
- OS: Linux, macOS, or Windows
- Node.js: v20 or higher (https://nodejs.org)
- npm: v9 or higher

## Steps

1. Unzip the source code
2. Open terminal in the unzipped folder
3. Install dependencies:
   npm install

4. Build the core package:
   npm run build -w packages/core

5. Build the extension:
   npm run build -w packages/extension

6. Copy static assets:
   node packages/extension/scripts/copy-assets.mjs

## Output
The extension files will be in:
packages/extension/dist/

## Tools used
- TypeScript 5.4
- tsup 8.x (TypeScript bundler/minifier)
- npm workspaces

## Source entry points
- packages/extension/src/content.ts
- packages/extension/src/background.ts
- packages/extension/src/popup.ts
- packages/extension/src/options.ts
