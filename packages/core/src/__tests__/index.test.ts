import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  estimateTokens,
  calcCost,
  countWords,
  countSentences,
  countParagraphs,
  getStats,
  formatCost,
  getContextSeverity,
  resolveModel,
  createWatcher,
  MODELS,
} from "../index.ts";

// ── estimateTokens ────────────────────────────────────────────────────────────

describe("estimateTokens", () => {
  it("returns 0 for empty string", () => {
    assert.equal(estimateTokens(""), 0);
  });

  it("returns 0 for null-ish", () => {
    assert.equal(estimateTokens(""), 0);
  });

  it("estimates short text within reason", () => {
    const tokens = estimateTokens("Hello, world!");
    assert.ok(tokens >= 2 && tokens <= 5, `expected 2–5, got ${tokens}`);
  });

  it("scales with text length", () => {
    const short = estimateTokens("hi");
    const long = estimateTokens("hi".repeat(100));
    assert.ok(long > short * 50);
  });

  it("respects custom charsPerToken", () => {
    const t1 = estimateTokens("abcdefghij", 5);  // 10 chars / 5 = 2
    assert.equal(t1, 2);
  });
});

// ── calcCost ─────────────────────────────────────────────────────────────────

describe("calcCost", () => {
  it("returns 0 for 0 tokens", () => {
    assert.equal(calcCost(0, MODELS["claude-sonnet-4"]), 0);
  });

  it("calculates input cost correctly", () => {
    // claude-sonnet-4: $3 / 1M tokens
    const cost = calcCost(1_000_000, MODELS["claude-sonnet-4"], "input");
    assert.equal(cost, 3);
  });

  it("calculates output cost correctly", () => {
    // claude-sonnet-4: $15 / 1M tokens output
    const cost = calcCost(1_000_000, MODELS["claude-sonnet-4"], "output");
    assert.equal(cost, 15);
  });

  it("defaults to input cost", () => {
    const explicit = calcCost(500, MODELS["gpt-4o"], "input");
    const defaulted = calcCost(500, MODELS["gpt-4o"]);
    assert.equal(explicit, defaulted);
  });

  it("scales linearly", () => {
    const half = calcCost(500_000, MODELS["claude-opus-4"]);
    const full = calcCost(1_000_000, MODELS["claude-opus-4"]);
    assert.equal(full, half * 2);
  });
});

// ── countWords ────────────────────────────────────────────────────────────────

describe("countWords", () => {
  it("returns 0 for empty string", () => {
    assert.equal(countWords(""), 0);
  });

  it("counts single word", () => {
    assert.equal(countWords("hello"), 1);
  });

  it("counts multiple words", () => {
    assert.equal(countWords("the quick brown fox"), 4);
  });

  it("ignores extra whitespace", () => {
    assert.equal(countWords("  hello   world  "), 2);
  });
});

// ── countSentences ────────────────────────────────────────────────────────────

describe("countSentences", () => {
  it("returns 0 for empty string", () => {
    assert.equal(countSentences(""), 0);
  });

  it("counts one sentence without terminal punctuation", () => {
    assert.equal(countSentences("Hello world"), 1);
  });

  it("counts multiple sentences", () => {
    assert.equal(countSentences("Hello world. How are you? I am fine!"), 3);
  });
});

// ── countParagraphs ───────────────────────────────────────────────────────────

describe("countParagraphs", () => {
  it("returns 0 for empty string", () => {
    assert.equal(countParagraphs(""), 0);
  });

  it("counts one paragraph", () => {
    assert.equal(countParagraphs("Hello world"), 1);
  });

  it("counts separated paragraphs", () => {
    assert.equal(countParagraphs("First para.\n\nSecond para.\n\nThird para."), 3);
  });

  it("ignores blank-only lines", () => {
    assert.equal(countParagraphs("   \n\n  \n\nActual content"), 1);
  });
});

// ── resolveModel ──────────────────────────────────────────────────────────────

describe("resolveModel", () => {
  it("returns claude-sonnet-4 by default", () => {
    assert.equal(resolveModel().label, "Claude Sonnet 4");
  });

  it("resolves a model by string ID", () => {
    assert.equal(resolveModel("gpt-4o").label, "GPT-4o");
  });

  it("passes through a ModelConfig object", () => {
    const custom = {
      label: "My Model",
      provider: "custom" as const,
      inputCostPer1M: 1,
      outputCostPer1M: 2,
      contextWindow: 8_000,
    };
    assert.deepEqual(resolveModel(custom), custom);
  });

  it("falls back to claude-sonnet-4 for unknown IDs", () => {
    assert.equal(resolveModel("unknown-model-xyz").label, "Claude Sonnet 4");
  });
});

// ── getStats ──────────────────────────────────────────────────────────────────

describe("getStats", () => {
  it("returns zero stats for empty string", () => {
    const s = getStats("");
    assert.equal(s.tokens, 0);
    assert.equal(s.chars, 0);
    assert.equal(s.words, 0);
    assert.equal(s.inputCost, 0);
    assert.equal(s.withinLimit, true);
  });

  it("chars matches text length exactly", () => {
    const text = "Hello, world!";
    assert.equal(getStats(text).chars, text.length);
  });

  it("withinLimit is false when over context window", () => {
    // Use a model with a tiny context window
    const stats = getStats("a".repeat(10_000), {
      model: {
        label: "Tiny",
        provider: "custom",
        inputCostPer1M: 1,
        outputCostPer1M: 1,
        contextWindow: 100,
      },
    });
    assert.equal(stats.withinLimit, false);
  });

  it("contextUsage is capped at 1", () => {
    const stats = getStats("a".repeat(100_000), {
      model: {
        label: "Tiny",
        provider: "custom",
        inputCostPer1M: 1,
        outputCostPer1M: 1,
        contextWindow: 10,
      },
    });
    assert.equal(stats.contextUsage, 1);
  });

  it("tokensRemaining is 0 when over limit", () => {
    const stats = getStats("a".repeat(10_000), {
      model: {
        label: "Tiny",
        provider: "custom",
        inputCostPer1M: 1,
        outputCostPer1M: 1,
        contextWindow: 10,
      },
    });
    assert.equal(stats.tokensRemaining, 0);
  });

  it("contextUsagePct ends with %", () => {
    const stats = getStats("hello world");
    assert.ok(stats.contextUsagePct.endsWith("%"));
  });
});

// ── formatCost ────────────────────────────────────────────────────────────────

describe("formatCost", () => {
  it("formats zero", () => {
    assert.equal(formatCost(0), "$0.00");
  });

  it("formats tiny cost to 6 decimal places", () => {
    assert.ok(formatCost(0.000003).startsWith("$0.000003"));
  });

  it("formats small cost to 4 decimal places", () => {
    assert.ok(formatCost(0.0012).startsWith("$0.0012"));
  });

  it("formats larger cost to 2 decimal places", () => {
    assert.equal(formatCost(1.5), "$1.50");
  });

  it("always starts with $", () => {
    assert.ok(formatCost(99.99).startsWith("$"));
  });
});

// ── getContextSeverity ────────────────────────────────────────────────────────

describe("getContextSeverity", () => {
  it("returns ok for low usage", () => {
    assert.equal(getContextSeverity(0.1), "ok");
    assert.equal(getContextSeverity(0.59), "ok");
  });

  it("returns warning for mid usage", () => {
    assert.equal(getContextSeverity(0.6), "warning");
    assert.equal(getContextSeverity(0.89), "warning");
  });

  it("returns danger for high usage", () => {
    assert.equal(getContextSeverity(0.9), "danger");
    assert.equal(getContextSeverity(1.0), "danger");
  });
});

// ── createWatcher ─────────────────────────────────────────────────────────────

describe("createWatcher", () => {
  it("returns stats on update", () => {
    const watcher = createWatcher({ model: "claude-haiku-4" });
    const stats = watcher.update("Hello world");
    assert.ok(stats.tokens > 0);
    watcher.destroy();
  });

  it("memoises — same text returns same object reference", () => {
    const watcher = createWatcher();
    const s1 = watcher.update("test text");
    const s2 = watcher.update("test text");
    assert.equal(s1, s2, "expected same reference for identical input");
    watcher.destroy();
  });

  it("recomputes after text change", () => {
    const watcher = createWatcher();
    const s1 = watcher.update("short");
    const s2 = watcher.update("a much longer piece of text than before");
    assert.ok(s2.tokens > s1.tokens);
    watcher.destroy();
  });

  it("reset clears memoised state", () => {
    const watcher = createWatcher();
    const s1 = watcher.update("hello");
    watcher.reset();
    const s2 = watcher.update("hello");
    assert.notEqual(s1, s2, "expected fresh object after reset");
    watcher.destroy();
  });
});

// ── MODELS registry ───────────────────────────────────────────────────────────

describe("MODELS", () => {
  it("contains at least 10 models", () => {
    assert.ok(Object.keys(MODELS).length >= 10);
  });

  it("every model has required fields", () => {
    for (const [id, m] of Object.entries(MODELS)) {
      assert.ok(typeof m.label === "string", `${id}: missing label`);
      assert.ok(typeof m.inputCostPer1M === "number", `${id}: missing inputCostPer1M`);
      assert.ok(typeof m.outputCostPer1M === "number", `${id}: missing outputCostPer1M`);
      assert.ok(typeof m.contextWindow === "number" && m.contextWindow > 0, `${id}: bad contextWindow`);
    }
  });

  it("claude-sonnet-4 exists", () => {
    assert.ok(MODELS["claude-sonnet-4"]);
  });

  it("gpt-4o exists", () => {
    assert.ok(MODELS["gpt-4o"]);
  });
});
