import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  createContext,
  useMemo,
  type ReactNode,
} from "react";
import {
  getStats,
  formatCost,
  getContextSeverity,
  resolveModel,
  MODELS,
  type TokenStats,
  type TokenLensOptions,
  type ModelConfig,
} from "spendlens";

export type { TokenStats, TokenLensOptions, ModelConfig };
export { MODELS, formatCost, getContextSeverity };

// ── Context (optional global model config) ────────────────────────────────────

interface TokenLensContextValue {
  defaultModel: string | ModelConfig;
  defaultCharsPerToken?: number;
}

const TokenLensContext = createContext<TokenLensContextValue>({
  defaultModel: "claude-sonnet-4",
});

/**
 * Optional provider to set a default model for all hooks in the tree.
 *
 * @example
 * <TokenLensProvider model="gpt-4o">
 *   <App />
 * </TokenLensProvider>
 */
export function TokenLensProvider({
  model = "claude-sonnet-4",
  charsPerToken,
  children,
}: {
  model?: string | ModelConfig;
  charsPerToken?: number;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ defaultModel: model, defaultCharsPerToken: charsPerToken }),
    [model, charsPerToken]
  );
  return (
    <TokenLensContext.Provider value={value}>
      {children}
    </TokenLensContext.Provider>
  );
}

// ── useTokenLens — primary hook ────────────────────────────────────────────────

export interface UseTokenLensResult extends TokenStats {
  /** The resolved ModelConfig being used */
  model: ModelConfig;
  /** Formatted cost string e.g. "$0.000027" */
  formattedCost: string;
  /** Severity level for UI colour-coding */
  severity: "ok" | "warning" | "danger";
}

/**
 * Primary hook — returns full token stats for the given text, updating
 * synchronously on every render (no debounce). Memoised so re-renders with
 * the same text are free.
 *
 * @example
 * const { tokens, formattedCost, severity } = useTokenLens(text, { model: "gpt-4o" });
 */
export function useTokenLens(
  text: string,
  options?: TokenLensOptions
): UseTokenLensResult {
  const ctx = useContext(TokenLensContext);
  const resolvedOptions: TokenLensOptions = {
    model: options?.model ?? ctx.defaultModel,
    charsPerToken: options?.charsPerToken ?? ctx.defaultCharsPerToken,
  };

  return useMemo(() => {
    const stats = getStats(text, resolvedOptions);
    const model = resolveModel(resolvedOptions.model);
    return {
      ...stats,
      model,
      formattedCost: formatCost(stats.inputCost),
      severity: getContextSeverity(stats.contextUsage),
    };
  }, [text, resolvedOptions.model, resolvedOptions.charsPerToken]);
}

// ── useTokenCount — lightweight, just the number ──────────────────────────────

/**
 * Lightweight hook — returns only the estimated token count.
 * Use this when you only need the number and want minimal re-render cost.
 *
 * @example
 * const tokens = useTokenCount(text);
 */
export function useTokenCount(text: string, charsPerToken?: number): number {
  return useMemo(() => {
    const ctx = useContext(TokenLensContext);
    return getStats(text, { charsPerToken: charsPerToken ?? ctx.defaultCharsPerToken }).tokens;
  }, [text, charsPerToken]);
}

// ── useTokenCost — just the cost ──────────────────────────────────────────────

/**
 * Returns only the formatted cost string for the current text.
 *
 * @example
 * const cost = useTokenCost(text, "claude-opus-4");
 * // → "$0.000150"
 */
export function useTokenCost(
  text: string,
  model?: string | ModelConfig
): string {
  const ctx = useContext(TokenLensContext);
  return useMemo(() => {
    const stats = getStats(text, { model: model ?? ctx.defaultModel });
    return formatCost(stats.inputCost);
  }, [text, model]);
}

// ── useTokenLensDebounced — for high-frequency inputs ─────────────────────────

/**
 * Debounced variant — only recomputes after the user stops typing for
 * `delay` ms (default 150). Useful for large textareas where you want
 * to avoid computing on every keystroke.
 *
 * @example
 * const stats = useTokenLensDebounced(text, { model: "gpt-4o" }, 200);
 */
export function useTokenLensDebounced(
  text: string,
  options?: TokenLensOptions,
  delay = 150
): UseTokenLensResult {
  const [debouncedText, setDebouncedText] = useState(text);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedText(text), delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, delay]);

  return useTokenLens(debouncedText, options);
}

// ── useTokenLensTextarea — ref-based, attach directly to a textarea ───────────

export interface UseTokenLensTextareaResult {
  /** Attach this ref to your <textarea> or <input> */
  ref: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  stats: UseTokenLensResult;
}

/**
 * Ref-based hook — attach `ref` to any textarea or input and get live stats
 * without managing your own state.
 *
 * @example
 * const { ref, stats } = useTokenLensTextarea({ model: "claude-sonnet-4" });
 * return (
 *   <>
 *     <textarea ref={ref} />
 *     <span>{stats.tokens} tokens · {stats.formattedCost}</span>
 *   </>
 * );
 */
export function useTokenLensTextarea(
  options?: TokenLensOptions
): UseTokenLensTextareaResult {
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);
  const [text, setText] = useState("");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const handler = () => setText(el.value);
    el.addEventListener("input", handler);
    // Sync initial value
    setText(el.value);

    return () => el.removeEventListener("input", handler);
  }, [ref.current]);

  const stats = useTokenLens(text, options);
  return { ref, stats };
}

// ── useModelList — convenience for building model pickers ────────────────────

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  contextWindow: number;
}

/**
 * Returns the full model list, optionally filtered by provider.
 *
 * @example
 * const models = useModelList("anthropic");
 * // → [{ id: "claude-sonnet-4", label: "Claude Sonnet 4", ... }, ...]
 */
export function useModelList(provider?: string): ModelOption[] {
  return useMemo(() => {
    return Object.entries(MODELS)
      .filter(([, m]) => !provider || m.provider === provider)
      .map(([id, m]) => ({
        id,
        label: m.label,
        provider: m.provider,
        inputCostPer1M: m.inputCostPer1M,
        outputCostPer1M: m.outputCostPer1M,
        contextWindow: m.contextWindow,
      }));
  }, [provider]);
}

// ── TokenCounter component — drop-in UI ──────────────────────────────────────

export interface TokenCounterProps {
  text: string;
  model?: string | ModelConfig;
  /** Show cost breakdown */
  showCost?: boolean;
  /** Show context bar */
  showContext?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Drop-in counter component. Renders tokens, cost, and context usage.
 *
 * @example
 * <TokenCounter text={promptText} model="claude-sonnet-4" showCost showContext />
 */
export function TokenCounter({
  text,
  model,
  showCost = true,
  showContext = true,
  className,
  style,
}: TokenCounterProps) {
  const stats = useTokenLens(text, { model });

  const barColor =
    stats.severity === "danger"
      ? "#ef4444"
      : stats.severity === "warning"
      ? "#f59e0b"
      : "#22c55e";

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "13px",
        color: "inherit",
        ...style,
      }}
    >
      <span>
        <strong style={{ fontVariantNumeric: "tabular-nums" }}>
          {stats.tokens.toLocaleString()}
        </strong>{" "}
        tokens
      </span>

      {showCost && (
        <span style={{ opacity: 0.7 }}>{stats.formattedCost}</span>
      )}

      {showContext && (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            opacity: 0.6,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: "60px",
              height: "3px",
              background: "rgba(128,128,128,0.2)",
              borderRadius: "99px",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                display: "block",
                height: "100%",
                width: `${Math.min(stats.contextUsage * 100, 100)}%`,
                background: barColor,
                borderRadius: "99px",
                transition: "width 0.2s, background 0.2s",
              }}
            />
          </span>
          <span style={{ fontSize: "11px" }}>{stats.contextUsagePct}</span>
        </span>
      )}
    </div>
  );
}
