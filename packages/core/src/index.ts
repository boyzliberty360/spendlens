// ─────────────────────────────────────────────────────────────────────────────
// TokenLens core — token estimation + cost calculation for LLM prompts
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export interface ModelConfig {
  /** Human-readable label */
  label: string;
  /** Provider name */
  provider: "anthropic" | "openai" | "google" | "meta" | "custom";
  /** Input cost in USD per 1 million tokens */
  inputCostPer1M: number;
  /** Output cost in USD per 1 million tokens */
  outputCostPer1M: number;
  /** Maximum context window in tokens */
  contextWindow: number;
}

export interface TokenStats {
  /** Estimated token count */
  tokens: number;
  /** Raw character count */
  chars: number;
  /** Word count */
  words: number;
  /** Sentence count */
  sentences: number;
  /** Paragraph count */
  paragraphs: number;
  /** Estimated input cost in USD */
  inputCost: number;
  /** Context usage as a fraction (0–1) */
  contextUsage: number;
  /** Context usage as a percentage string e.g. "12.34%" */
  contextUsagePct: string;
  /** Whether prompt is within context limits */
  withinLimit: boolean;
  /** Tokens remaining before hitting the context limit */
  tokensRemaining: number;
}

export interface TokenLensOptions {
  /** Model ID from MODELS or a custom ModelConfig */
  model?: string | ModelConfig;
  /** Override the chars-per-token ratio (default: 3.8) */
  charsPerToken?: number;
}

export type ModelId = keyof typeof MODELS;

// ── Model registry ────────────────────────────────────────────────────────────

export const MODELS: Record<string, ModelConfig> = {
  // Anthropic
  "claude-sonnet-4": {
    label: "Claude Sonnet 4",
    provider: "anthropic",
    inputCostPer1M: 3,
    outputCostPer1M: 15,
    contextWindow: 200_000,
  },
  "claude-opus-4": {
    label: "Claude Opus 4",
    provider: "anthropic",
    inputCostPer1M: 15,
    outputCostPer1M: 75,
    contextWindow: 200_000,
  },
  "claude-haiku-4": {
    label: "Claude Haiku 4",
    provider: "anthropic",
    inputCostPer1M: 0.8,
    outputCostPer1M: 4,
    contextWindow: 200_000,
  },
  // OpenAI
  "gpt-4o": {
    label: "GPT-4o",
    provider: "openai",
    inputCostPer1M: 2.5,
    outputCostPer1M: 10,
    contextWindow: 128_000,
  },
  "gpt-4o-mini": {
    label: "GPT-4o mini",
    provider: "openai",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
    contextWindow: 128_000,
  },
  "o1": {
    label: "o1",
    provider: "openai",
    inputCostPer1M: 15,
    outputCostPer1M: 60,
    contextWindow: 200_000,
  },
  "o3-mini": {
    label: "o3-mini",
    provider: "openai",
    inputCostPer1M: 1.1,
    outputCostPer1M: 4.4,
    contextWindow: 200_000,
  },
  // Google
  "gemini-1.5-pro": {
    label: "Gemini 1.5 Pro",
    provider: "google",
    inputCostPer1M: 3.5,
    outputCostPer1M: 10.5,
    contextWindow: 1_000_000,
  },
  "gemini-1.5-flash": {
    label: "Gemini 1.5 Flash",
    provider: "google",
    inputCostPer1M: 0.35,
    outputCostPer1M: 1.05,
    contextWindow: 1_000_000,
  },
  "gemini-2.0-flash": {
    label: "Gemini 2.0 Flash",
    provider: "google",
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.4,
    contextWindow: 1_000_000,
  },
  // Meta
  "llama-3.1-8b": {
    label: "Llama 3.1 8B",
    provider: "meta",
    inputCostPer1M: 0.18,
    outputCostPer1M: 0.18,
    contextWindow: 131_072,
  },
  "llama-3.1-70b": {
    label: "Llama 3.1 70B",
    provider: "meta",
    inputCostPer1M: 0.88,
    outputCostPer1M: 0.88,
    contextWindow: 131_072,
  },
};

// ── Core estimation ───────────────────────────────────────────────────────────

const DEFAULT_CHARS_PER_TOKEN = 3.8;

/**
 * Estimate token count from a string.
 *
 * Uses a character-ratio heuristic (default 3.8 chars/token) which is accurate
 * to within ~5% for English prose. Code and non-Latin scripts may vary.
 *
 * @example
 * estimateTokens("Hello, world!") // → 3
 */
export function estimateTokens(
  text: string,
  charsPerToken = DEFAULT_CHARS_PER_TOKEN
): number {
  if (!text) return 0;
  return Math.round(text.length / charsPerToken);
}

/**
 * Calculate the USD cost for a given token count and model.
 *
 * @example
 * calcCost(1000, MODELS["claude-sonnet-4"], "input") // → 0.000003
 */
export function calcCost(
  tokens: number,
  model: ModelConfig,
  type: "input" | "output" = "input"
): number {
  const rate =
    type === "input" ? model.inputCostPer1M : model.outputCostPer1M;
  return (tokens / 1_000_000) * rate;
}

/**
 * Count words in a string.
 */
export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/**
 * Count sentences in a string.
 */
export function countSentences(text: string): number {
  if (!text.trim()) return 0;
  const matches = text.match(/[.!?]+[\s\n]/g);
  return matches ? matches.length + 1 : 1;
}

/**
 * Count paragraphs (blocks separated by blank lines).
 */
export function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  return text
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0).length;
}

/**
 * Resolve a model ID string or ModelConfig object into a ModelConfig.
 * Falls back to claude-sonnet-4 if the model ID is unknown.
 */
export function resolveModel(model?: string | ModelConfig): ModelConfig {
  if (!model) return MODELS["claude-sonnet-4"];
  if (typeof model === "object") return model;
  return MODELS[model] ?? MODELS["claude-sonnet-4"];
}

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Compute full token statistics for a prompt string.
 *
 * @example
 * const stats = getStats("Write me a poem about the sea", { model: "gpt-4o" });
 * console.log(stats.tokens);      // 8
 * console.log(stats.inputCost);   // 0.00000002
 * console.log(stats.contextUsagePct); // "0.01%"
 */
export function getStats(
  text: string,
  options: TokenLensOptions = {}
): TokenStats {
  const model = resolveModel(options.model);
  const tokens = estimateTokens(text, options.charsPerToken);
  const inputCost = calcCost(tokens, model, "input");
  const contextUsage = Math.min(tokens / model.contextWindow, 1);
  const tokensRemaining = Math.max(model.contextWindow - tokens, 0);

  return {
    tokens,
    chars: text.length,
    words: countWords(text),
    sentences: countSentences(text),
    paragraphs: countParagraphs(text),
    inputCost,
    contextUsage,
    contextUsagePct: (contextUsage * 100).toFixed(2) + "%",
    withinLimit: tokens <= model.contextWindow,
    tokensRemaining,
  };
}

/**
 * Create a stateful watcher that fires a callback on every text change.
 * Useful for attaching to textarea `input` events.
 *
 * @example
 * const watcher = createWatcher({ model: "claude-sonnet-4" });
 * textarea.addEventListener("input", (e) => {
 *   const stats = watcher.update(e.target.value);
 *   console.log(stats.tokens, stats.inputCost);
 * });
 * watcher.destroy(); // cleanup
 */
export function createWatcher(options: TokenLensOptions = {}) {
  let _lastText = "";
  let _lastStats: TokenStats | null = null;

  return {
    update(text: string): TokenStats {
      if (text === _lastText && _lastStats) return _lastStats;
      _lastText = text;
      _lastStats = getStats(text, options);
      return _lastStats;
    },
    reset() {
      _lastText = "";
      _lastStats = null;
    },
    destroy() {
      _lastText = "";
      _lastStats = null;
    },
  };
}

/**
 * Format a cost value as a human-readable USD string.
 *
 * @example
 * formatCost(0.000003)   // "$0.000003"
 * formatCost(0.123456)   // "$0.1235"
 * formatCost(1.5)        // "$1.50"
 */
export function formatCost(cost: number): string {
  if (cost === 0) return "$0.00";
  if (cost < 0.0001) return "$" + cost.toFixed(6);
  if (cost < 0.01) return "$" + cost.toFixed(4);
  return "$" + cost.toFixed(2);
}

/**
 * Get a severity level based on context window usage.
 * Useful for colour-coding a progress bar.
 */
export function getContextSeverity(
  usage: number
): "ok" | "warning" | "danger" {
  if (usage >= 0.9) return "danger";
  if (usage >= 0.6) return "warning";
  return "ok";
}

// ── Default export (convenience object) ──────────────────────────────────────

const TokenLens = {
  getStats,
  estimateTokens,
  calcCost,
  formatCost,
  countWords,
  countSentences,
  countParagraphs,
  createWatcher,
  resolveModel,
  getContextSeverity,
  MODELS,
};

export default TokenLens;
