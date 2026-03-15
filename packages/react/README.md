# @tokenlens/react

React hooks and components for [TokenLens](https://github.com/boyzliberty360/tokenlens) — real-time token counting and cost estimation, built for React apps.

[![npm](https://img.shields.io/npm/v/@tokenlens/react)](https://www.npmjs.com/package/@tokenlens/react)
[![license](https://img.shields.io/github/license/boyzliberty360/tokenlens)](../../LICENSE)

```bash
npm install @tokenlens/react
```

---

## Quickstart

```tsx
import { useTokenLens } from "@tokenlens/react";

function PromptBox() {
  const [text, setText] = useState("");
  const { tokens, formattedCost, severity } = useTokenLens(text, {
    model: "claude-sonnet-4",
  });

  return (
    <div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      <p style={{ color: severity === "danger" ? "red" : "inherit" }}>
        {tokens.toLocaleString()} tokens · {formattedCost}
      </p>
    </div>
  );
}
```

---

## Hooks

### `useTokenLens(text, options?)`

Primary hook. Returns the full stats object plus convenience fields.

```tsx
const stats = useTokenLens(text, { model: "gpt-4o" });

stats.tokens          // number  — estimated token count
stats.chars           // number  — character count
stats.words           // number  — word count
stats.sentences       // number  — sentence count
stats.paragraphs      // number  — paragraph count
stats.inputCost       // number  — USD cost (raw)
stats.formattedCost   // string  — "$0.000027"
stats.contextUsage    // number  — 0–1 fraction
stats.contextUsagePct // string  — "12.34%"
stats.withinLimit     // boolean
stats.tokensRemaining // number
stats.severity        // "ok" | "warning" | "danger"
stats.model           // ModelConfig
```

**Options:**

| Option | Type | Default |
|---|---|---|
| `model` | `string \| ModelConfig` | `"claude-sonnet-4"` |
| `charsPerToken` | `number` | `3.8` |

---

### `useTokenLensDebounced(text, options?, delay?)`

Same as `useTokenLens` but only recomputes after the user stops typing. Good for very large textareas.

```tsx
// Only recomputes 200ms after the last keystroke
const stats = useTokenLensDebounced(text, { model: "claude-opus-4" }, 200);
```

---

### `useTokenLensTextarea(options?)`

Ref-based variant — attach it directly to a `<textarea>` without managing your own state.

```tsx
const { ref, stats } = useTokenLensTextarea({ model: "gpt-4o" });

return (
  <>
    <textarea ref={ref} placeholder="Type here..." />
    <span>{stats.tokens} tokens · {stats.formattedCost}</span>
  </>
);
```

---

### `useTokenCount(text, charsPerToken?)`

Lightweight — returns only the token count number. Minimal re-render cost.

```tsx
const tokens = useTokenCount(text);
```

---

### `useTokenCost(text, model?)`

Returns only the formatted cost string.

```tsx
const cost = useTokenCost(text, "claude-opus-4");
// → "$0.000150"
```

---

### `useModelList(provider?)`

Returns the full model registry as an array, optionally filtered by provider. Useful for building model pickers.

```tsx
const allModels    = useModelList();
const claudeModels = useModelList("anthropic");
const openaiModels = useModelList("openai");

// Each item: { id, label, provider, inputCostPer1M, outputCostPer1M, contextWindow }
```

---

## Components

### `<TokenCounter />`

Drop-in counter component. Zero styling opinions — inherits your app's font and color.

```tsx
<TokenCounter
  text={promptText}
  model="claude-sonnet-4"
  showCost      // default true
  showContext   // default true, shows a small progress bar
  className="my-counter"
  style={{ opacity: 0.7 }}
/>
```

Renders: `847 tokens  ·  $0.000025  ·  ▓░░░░░  0.42%`

---

## Context provider

Set a default model for all hooks in the tree — no need to pass `model` to every hook.

```tsx
import { TokenLensProvider } from "@tokenlens/react";

function App() {
  return (
    <TokenLensProvider model="gpt-4o">
      <PromptEditor />
      <CostSummary />
    </TokenLensProvider>
  );
}
```

You can still override per-hook:

```tsx
// Uses the provider's gpt-4o by default
const stats = useTokenLens(text);

// Overrides for this specific component
const opusStats = useTokenLens(text, { model: "claude-opus-4" });
```

---

## Custom models

Pass any `ModelConfig` object as the model:

```tsx
const stats = useTokenLens(text, {
  model: {
    label: "My Fine-tuned Model",
    provider: "custom",
    inputCostPer1M: 1.5,
    outputCostPer1M: 6,
    contextWindow: 32_000,
  },
});
```

---

## Full example — prompt editor with model picker

```tsx
import { useState } from "react";
import { useTokenLens, useModelList, TokenCounter } from "@tokenlens/react";

export function PromptEditor() {
  const [text, setText] = useState("");
  const [modelId, setModelId] = useState("claude-sonnet-4");
  const models = useModelList();
  const { severity, tokensRemaining, withinLimit } = useTokenLens(text, {
    model: modelId,
  });

  return (
    <div>
      <select value={modelId} onChange={(e) => setModelId(e.target.value)}>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — ${m.inputCostPer1M}/1M in
          </option>
        ))}
      </select>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        style={{ borderColor: severity === "danger" ? "red" : undefined }}
      />

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <TokenCounter text={text} model={modelId} />
        {!withinLimit && (
          <span style={{ color: "red" }}>
            Over limit by {(-tokensRemaining).toLocaleString()} tokens
          </span>
        )}
      </div>
    </div>
  );
}
```

---

## Supported models

See the [main TokenLens README](../../README.md#supported-models) for the full model table.

---

## License

MIT © Orion
