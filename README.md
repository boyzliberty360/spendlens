# TokenLens

> See token count and cost **before** you hit send.

Real-time token counting and cost estimation for LLM prompts — as an npm package, React hooks library, and browser extension that works on Claude, ChatGPT, Gemini, and any site you configure.

[![npm](https://img.shields.io/npm/v/spendlens)](https://www.npmjs.com/package/spendlens)
[![npm downloads](https://img.shields.io/npm/dm/spendlens)](https://www.npmjs.com/package/spendlens)
[![CI](https://github.com/boyzliberty360/spendlens/actions/workflows/ci.yml/badge.svg)](https://github.com/boyzliberty360/spendlens/actions)
[![license](https://img.shields.io/github/license/boyzliberty360/spendlens)](LICENSE)

---

## Packages

| Package | Description | Install |
|---|---|---|
| [`spendlens`](packages/core) | Core library — works anywhere JS runs | `npm i spendlens` |
| [`@spendlens/react`](packages/react) | React hooks + drop-in component | `npm i @spendlens/react` |
| [Browser extension](packages/extension) | Floating counter on AI sites | [Download →](#browser-extension) |

---

## Core (`spendlens`)

```bash
npm install spendlens
```

### Quickstart

```ts
import { getStats, formatCost } from "spendlens";

const stats = getStats("Write me a poem about the sea.", {
  model: "claude-sonnet-4",
});

console.log(stats.tokens);           // 9
console.log(formatCost(stats.inputCost)); // "$0.000027"
console.log(stats.contextUsagePct);  // "0.00%"
console.log(stats.withinLimit);      // true
```

### Live watcher

```ts
import { createWatcher, formatCost } from "spendlens";

const watcher = createWatcher({ model: "gpt-4o" });

textarea.addEventListener("input", (e) => {
  const stats = watcher.update(e.target.value);
  tokenDisplay.textContent = stats.tokens.toLocaleString();
  costDisplay.textContent = formatCost(stats.inputCost);
});
```

### CDN / plain HTML

```html
<script src="https://cdn.jsdelivr.net/npm/spendlens/dist/spendlens.umd.min.js"></script>
<script>
  const stats = TokenLens.getStats("Hello, world!", { model: "gpt-4o" });
  console.log(stats.tokens, TokenLens.formatCost(stats.inputCost));
</script>
```

### API reference

| Function | Returns | Description |
|---|---|---|
| `getStats(text, opts?)` | `TokenStats` | Full stats object |
| `estimateTokens(text, cpt?)` | `number` | Token count only |
| `calcCost(tokens, model, type?)` | `number` | USD cost |
| `formatCost(cost)` | `string` | e.g. `"$0.000027"` |
| `createWatcher(opts?)` | `Watcher` | Memoised, stateful watcher |
| `getContextSeverity(usage)` | `"ok"\|"warning"\|"danger"` | Colour-code helper |
| `resolveModel(model?)` | `ModelConfig` | Resolve ID → config |
| `MODELS` | `Record<string, ModelConfig>` | Full model registry |

**`TokenStats` fields:**

```ts
{
  tokens: number          // estimated token count
  chars: number           // character count
  words: number           // word count
  sentences: number       // sentence count
  paragraphs: number      // paragraph count
  inputCost: number       // USD cost (raw number)
  contextUsage: number    // 0–1 fraction of context window used
  contextUsagePct: string // e.g. "12.34%"
  withinLimit: boolean    // false when prompt exceeds context window
  tokensRemaining: number // tokens left before hitting the limit
}
```

### Custom model

```ts
const stats = getStats(text, {
  model: {
    label: "My Model",
    provider: "custom",
    inputCostPer1M: 1.5,
    outputCostPer1M: 6,
    contextWindow: 32_000,
  },
});
```

---

## React (`@spendlens/react`)

```bash
npm install @spendlens/react
```

### Hooks

```tsx
import {
  useTokenLens,
  useTokenLensDebounced,
  useTokenLensTextarea,
  useTokenCount,
  useTokenCost,
  useModelList,
  TokenCounter,
  TokenLensProvider,
} from "@spendlens/react";
```

**`useTokenLens`** — primary hook, synchronous, memoised:

```tsx
const { tokens, formattedCost, severity, contextUsagePct } = useTokenLens(
  text,
  { model: "claude-sonnet-4" }
);
```

**`useTokenLensDebounced`** — waits for the user to stop typing:

```tsx
const stats = useTokenLensDebounced(text, { model: "gpt-4o" }, 200);
```

**`useTokenLensTextarea`** — attach directly to a textarea, no state needed:

```tsx
const { ref, stats } = useTokenLensTextarea({ model: "claude-haiku-4" });
return <textarea ref={ref} />;
```

**`useModelList`** — build a model picker:

```tsx
const models = useModelList("anthropic"); // or "openai", "google", "meta"
```

**`<TokenCounter />`** — zero-config drop-in:

```tsx
<TokenCounter text={text} model="gpt-4o" showCost showContext />
// renders: 847 tokens · $0.000025 · ▓░░░░░ 0.42%
```

**`<TokenLensProvider />`** — set a default model for the whole tree:

```tsx
<TokenLensProvider model="claude-sonnet-4">
  <App />
</TokenLensProvider>
```

See [`packages/react/README.md`](packages/react/README.md) for full docs.

---

## Browser extension

The extension injects a live counter widget on AI sites. It appears when you start typing and shows token count, estimated cost, and context window usage — before you hit send.

**Supported sites out of the box:**
- claude.ai
- chatgpt.com / chat.openai.com
- gemini.google.com / aistudio.google.com
- poe.com
- perplexity.ai
- Any site you add in settings

### Install (Chrome / Chromium)

1. Download `spendlens-extension.zip` from [Releases](https://github.com/boyzliberty360/spendlens/releases)
2. Unzip it
3. Go to `chrome://extensions`
4. Enable **Developer mode** (top right)
5. Click **Load unpacked** and select the unzipped folder

### Install (Firefox)

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from the unzipped folder

### Settings

Click the TokenLens icon in your toolbar to:
- Toggle the counter on/off
- Switch the active model (affects cost estimates)

Click **Settings** for:
- Adding custom sites (any hostname where you want the counter to appear)
- Choosing widget theme (auto / light / dark)

---

## Supported models

| Model | Provider | Input $/1M | Output $/1M | Context |
|---|---|---|---|---|
| claude-sonnet-4 | Anthropic | $3.00 | $15.00 | 200K |
| claude-opus-4 | Anthropic | $15.00 | $75.00 | 200K |
| claude-haiku-4 | Anthropic | $0.80 | $4.00 | 200K |
| gpt-4o | OpenAI | $2.50 | $10.00 | 128K |
| gpt-4o-mini | OpenAI | $0.15 | $0.60 | 128K |
| o1 | OpenAI | $15.00 | $60.00 | 200K |
| o3-mini | OpenAI | $1.10 | $4.40 | 200K |
| gemini-1.5-pro | Google | $3.50 | $10.50 | 1M |
| gemini-1.5-flash | Google | $0.35 | $1.05 | 1M |
| gemini-2.0-flash | Google | $0.10 | $0.40 | 1M |
| llama-3.1-8b | Meta | $0.18 | $0.18 | 131K |
| llama-3.1-70b | Meta | $0.88 | $0.88 | 131K |

---

## Development

```bash
git clone https://github.com/boyzliberty360/spendlens
cd spendlens
npm install

# Build everything
npm run build

# Build individual packages
npm run build -w packages/core
npm run build -w packages/react
npm run build -w packages/extension

# Run tests (47 unit tests)
npm run test -w packages/core

# Watch mode
npm run dev -w packages/core
```

### Repo structure

```
spendlens/
├── packages/
│   ├── core/                  # spendlens npm package
│   │   ├── src/
│   │   │   ├── index.ts       # full library
│   │   │   └── __tests__/     # 47 unit tests
│   │   └── tsup.config.ts     # builds ESM + CJS + UMD
│   │
│   ├── react/                 # @spendlens/react
│   │   └── src/
│   │       └── index.tsx      # hooks + TokenCounter + Provider
│   │
│   └── extension/             # browser extension
│       ├── src/
│       │   ├── content.ts     # injected widget
│       │   ├── background.ts  # service worker
│       │   ├── popup.ts       # toolbar popup
│       │   └── options.ts     # settings page
│       ├── public/            # manifest, HTML, icons
│       └── scripts/           # post-build asset copy
│
├── .github/workflows/ci.yml   # CI + auto-publish on tag
└── tsconfig.json              # shared TS config
```

### Releasing

```bash
# 1. Bump version in packages/core/package.json and packages/react/package.json
# 2. Commit and tag
git add .
git commit -m "chore: release v1.1.0"
git tag v1.1.0
git push origin main --tags
# GitHub Actions handles npm publish + GitHub Release automatically
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT © Orion
