# Contributing to TokenLens

Thanks for wanting to contribute. This is a monorepo with three packages — `spendlens` (core), `@spendlens/react`, and the browser extension. Below is everything you need to get started.

---

## Getting started

```bash
git clone https://github.com/boyzliberty360/spendlens
cd spendlens
npm install
npm run build   # build all packages
npm run test -w packages/core   # run unit tests
```

---

## Project structure

```
packages/core      → npm package, pure TS, no dependencies
packages/react     → React hooks, peer dep on react ≥17
packages/extension → Chrome/Firefox extension, Manifest V3
```

All three share the root `tsconfig.json` and are managed as npm workspaces.

---

## Making changes

### Adding or updating a model

Edit `packages/core/src/index.ts` — find the `MODELS` record and add your entry:

```ts
"my-model-id": {
  label: "My Model Name",
  provider: "openai",          // "anthropic" | "openai" | "google" | "meta" | "custom"
  inputCostPer1M: 2.0,         // USD per 1 million input tokens
  outputCostPer1M: 8.0,        // USD per 1 million output tokens
  contextWindow: 128_000,      // max tokens
},
```

Then add a test in `packages/core/src/__tests__/index.test.ts`:

```ts
it("my-model-id exists", () => {
  assert.ok(MODELS["my-model-id"]);
});
```

Run `npm run test -w packages/core` to confirm it passes.

### Adding a React hook

Add it to `packages/react/src/index.tsx` and export it. Make sure to:
- Use `useMemo` or `useCallback` to avoid unnecessary recomputes
- Accept `TokenLensOptions` so callers can set the model
- Read from `TokenLensContext` as the fallback when no model is passed

### Changing the extension widget

The widget UI lives in `packages/extension/src/content.ts` inside `createWidget()`. After editing, rebuild with:

```bash
npm run build -w packages/extension
node packages/extension/scripts/copy-assets.mjs
```

Then reload the unpacked extension in Chrome (`chrome://extensions → reload`).

---

## Running tests

```bash
npm run test -w packages/core
```

The test suite uses Node's built-in `node:test` runner — no extra dependencies. All 47 tests should pass. If you add functionality, add tests for it.

---

## Adding a new site to the extension

Edit `packages/extension/src/content.ts` — find `SITE_CONFIGS` and add an entry:

```ts
"mysite.com": {
  inputSelector: "textarea.prompt-input",   // CSS selector for the prompt field
  submitSelector: "button.send-btn",        // optional
  defaultModel: "gpt-4o",
},
```

If the selector varies or the site uses a complex SPA, you can open an issue with the site URL and we can figure out the right selector together.

---

## Pull request checklist

- [ ] `npm run build` passes with no errors across all packages
- [ ] `npm run test -w packages/core` passes (47/47)
- [ ] New functionality has tests
- [ ] No new runtime dependencies added to `packages/core` (it must stay zero-dep)
- [ ] TypeScript types are exported for any new public API surface

---

## Commit style

Use conventional commits:

```
feat: add gemini-2.5-flash model
fix: correct token estimate for code blocks
chore: bump tsup to 8.1
docs: add hook example for custom model
```

---

## Reporting issues

Open a GitHub issue with:
- What you expected
- What happened
- A minimal reproduction (paste of prompt text + model + stats you got)

---

## License

By contributing, you agree your changes will be released under the MIT license.
