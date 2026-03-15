import {
  getStats,
  formatCost,
  getContextSeverity,
  MODELS,
  type ModelConfig,
} from "spendlens";

// ── Site-specific selectors ───────────────────────────────────────────────────

interface SiteConfig {
  inputSelector: string;
  submitSelector?: string;
  defaultModel: string;
  // Optional function to detect the active model from the page DOM
  detectModel?: () => string | null;
}

const SITE_CONFIGS: Record<string, SiteConfig> = {
  "claude.ai": {
    inputSelector: '[contenteditable="true"], div.ProseMirror',
    submitSelector: 'button[aria-label*="Send"]',
    defaultModel: "claude-sonnet-4",
    detectModel: () => {
      // Claude shows the model name in a button in the top bar
      const btn = document.querySelector<HTMLElement>(
        '[data-testid*="model"], button[class*="model"], [class*="modelName"]'
      );
      if (!btn) return null;
      const text = btn.innerText?.toLowerCase() ?? "";
      if (text.includes("opus")) return "claude-opus-4";
      if (text.includes("haiku")) return "claude-haiku-4";
      if (text.includes("sonnet")) return "claude-sonnet-4";
      return null;
    },
  },
  "chat.openai.com": {
    inputSelector: "#prompt-textarea",
    submitSelector: 'button[data-testid="send-button"]',
    defaultModel: "gpt-4o",
    detectModel: () => {
      // ChatGPT shows selected model in the model switcher button
      const btn = document.querySelector<HTMLElement>(
        '#model-switcher-dropdown button, [data-testid="model-switcher"] span, button[class*="model"] span'
      );
      if (!btn) return null;
      const text = btn.innerText?.toLowerCase() ?? "";
      if (text.includes("o3")) return "o3-mini";
      if (text.includes("o1")) return "o1";
      if (text.includes("4o mini") || text.includes("4o-mini")) return "gpt-4o-mini";
      if (text.includes("4o")) return "gpt-4o";
      if (text.includes("gpt-5") || text.includes("gpt5")) return "gpt-4o"; // fallback for newer models
      return null;
    },
  },
  "chatgpt.com": {
    inputSelector: "#prompt-textarea",
    submitSelector: 'button[data-testid="send-button"]',
    defaultModel: "gpt-4o",
    detectModel: () => {
      const btn = document.querySelector<HTMLElement>(
        '#model-switcher-dropdown button, [data-testid="model-switcher"] span, button[class*="model"] span, [class*="model-name"]'
      );
      if (!btn) return null;
      const text = btn.innerText?.toLowerCase() ?? "";
      if (text.includes("o3")) return "o3-mini";
      if (text.includes("o1")) return "o1";
      if (text.includes("4o mini") || text.includes("4o-mini")) return "gpt-4o-mini";
      if (text.includes("4o")) return "gpt-4o";
      if (text.includes("gpt-5") || text.includes("gpt5")) return "gpt-4o";
      return null;
    },
  },
  "gemini.google.com": {
    inputSelector: ".ql-editor, rich-textarea .ql-editor",
    defaultModel: "gemini-1.5-pro",
    detectModel: () => {
      const btn = document.querySelector<HTMLElement>(
        '[data-model-name], .model-selector button, [aria-label*="Gemini"] span'
      );
      if (!btn) return null;
      const text = btn.innerText?.toLowerCase() ?? "";
      if (text.includes("flash")) return "gemini-2.0-flash";
      if (text.includes("1.5 pro")) return "gemini-1.5-pro";
      if (text.includes("pro")) return "gemini-1.5-pro";
      return null;
    },
  },
  "aistudio.google.com": {
    inputSelector: "textarea, .run-prompt-text-area textarea",
    defaultModel: "gemini-1.5-pro",
    detectModel: () => {
      const sel = document.querySelector<HTMLElement>(
        "mat-select, [class*='model-select']"
      );
      if (!sel) return null;
      const text = sel.innerText?.toLowerCase() ?? "";
      if (text.includes("flash")) return "gemini-2.0-flash";
      if (text.includes("1.5 flash")) return "gemini-1.5-flash";
      if (text.includes("pro")) return "gemini-1.5-pro";
      return null;
    },
  },
  "poe.com": {
    inputSelector: "textarea[class*='GrowingTextArea']",
    defaultModel: "claude-sonnet-4",
    detectModel: () => {
      const bot = document.querySelector<HTMLElement>(
        "[class*='ChatHeader'] h2, [class*='botName'], [class*='BotHeader'] h1"
      );
      if (!bot) return null;
      const text = bot.innerText?.toLowerCase() ?? "";
      if (text.includes("gpt-4o")) return "gpt-4o";
      if (text.includes("gpt-4")) return "gpt-4o";
      if (text.includes("opus")) return "claude-opus-4";
      if (text.includes("haiku")) return "claude-haiku-4";
      if (text.includes("claude")) return "claude-sonnet-4";
      if (text.includes("gemini")) return "gemini-1.5-pro";
      return null;
    },
  },
  "perplexity.ai": {
    inputSelector: "textarea",
    defaultModel: "claude-sonnet-4",
  },
};

// ── State ─────────────────────────────────────────────────────────────────────

interface ExtensionSettings {
  enabled: boolean;
  selectedModel: string;
  customSites: string[];
  theme: "auto" | "light" | "dark";
  // Whether the user has manually picked a model in the popup
  userOverrideModel: boolean;
}

let settings: ExtensionSettings = {
  enabled: true,
  selectedModel: "claude-sonnet-4",
  customSites: [],
  theme: "auto",
  userOverrideModel: false,
};

// ── Widget HTML ───────────────────────────────────────────────────────────────

function createWidget(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.id = "tl-widget";
  wrap.setAttribute("data-spendlens", "true");

  const isDark =
    settings.theme === "dark" ||
    (settings.theme === "auto" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  wrap.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483647;
    background: ${isDark ? "#1e1e1e" : "#ffffff"};
    color: ${isDark ? "#e0e0e0" : "#1a1a1a"};
    border: 0.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"};
    border-radius: 12px;
    padding: 10px 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    line-height: 1.4;
    min-width: 200px;
    max-width: 260px;
    box-shadow: 0 4px 20px rgba(0,0,0,${isDark ? "0.4" : "0.1"});
    transition: opacity 0.2s;
    pointer-events: none;
    opacity: 0;
  `;

  wrap.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
      <span style="font-weight:600;font-size:11px;letter-spacing:0.04em;opacity:0.5;text-transform:uppercase;">TokenLens</span>
      <span id="tl-model-badge" style="font-size:10px;opacity:0.6;"></span>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">
      <div>
        <div style="opacity:0.5;font-size:10px;margin-bottom:2px;">Tokens</div>
        <div id="tl-tokens" style="font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;">0</div>
      </div>
      <div>
        <div style="opacity:0.5;font-size:10px;margin-bottom:2px;">Est. cost</div>
        <div id="tl-cost" style="font-size:18px;font-weight:600;font-variant-numeric:tabular-nums;">$0.00</div>
      </div>
    </div>
    <div style="margin-bottom:6px;">
      <div style="display:flex;justify-content:space-between;font-size:10px;opacity:0.5;margin-bottom:3px;">
        <span>Context</span>
        <span id="tl-ctx-pct">0%</span>
      </div>
      <div style="height:3px;background:rgba(128,128,128,0.2);border-radius:99px;overflow:hidden;">
        <div id="tl-ctx-bar" style="height:100%;width:0%;border-radius:99px;background:#22c55e;transition:width 0.2s,background 0.2s;"></div>
      </div>
    </div>
    <div id="tl-warning" style="display:none;font-size:10px;color:#f59e0b;margin-top:4px;"></div>
  `;

  document.body.appendChild(wrap);
  return wrap;
}

// ── Resolve active model ──────────────────────────────────────────────────────
// Priority: user manual override → DOM detection → site default

function resolveActiveModel(siteConfig: SiteConfig): string {
  // If user explicitly picked a model in the popup, respect it
  if (settings.userOverrideModel && settings.selectedModel) {
    return settings.selectedModel;
  }

  // Try to detect from the page DOM
  if (siteConfig.detectModel) {
    const detected = siteConfig.detectModel();
    if (detected && MODELS[detected]) {
      return detected;
    }
  }

  // Fall back to site default
  return siteConfig.defaultModel;
}

// ── Widget update ─────────────────────────────────────────────────────────────

let _currentSiteConfig: SiteConfig | null = null;

function updateWidget(widget: HTMLElement, text: string) {
  // Re-detect model on every update so it stays in sync with what user picks on the page
  const activeModelId = _currentSiteConfig
    ? resolveActiveModel(_currentSiteConfig)
    : settings.selectedModel;

  const model: ModelConfig = MODELS[activeModelId] ?? MODELS["claude-sonnet-4"];
  const stats = getStats(text, { model: activeModelId });
  _lastStats = stats;
  _lastActiveText = text;
  _lastDetectedModel = activeModelId;

  const tokens = widget.querySelector<HTMLElement>("#tl-tokens")!;
  const cost = widget.querySelector<HTMLElement>("#tl-cost")!;
  const bar = widget.querySelector<HTMLElement>("#tl-ctx-bar")!;
  const pct = widget.querySelector<HTMLElement>("#tl-ctx-pct")!;
  const badge = widget.querySelector<HTMLElement>("#tl-model-badge")!;
  const warning = widget.querySelector<HTMLElement>("#tl-warning")!;

  tokens.textContent = stats.tokens.toLocaleString();
  cost.textContent = formatCost(stats.inputCost);
  pct.textContent = stats.contextUsagePct;
  badge.textContent = model.label;

  const barPct = (stats.contextUsage * 100).toFixed(1) + "%";
  bar.style.width = barPct;

  const severity = getContextSeverity(stats.contextUsage);
  bar.style.background =
    severity === "danger"
      ? "#ef4444"
      : severity === "warning"
      ? "#f59e0b"
      : "#22c55e";

  if (severity === "danger") {
    warning.style.display = "block";
    warning.textContent = `⚠ ${stats.tokensRemaining.toLocaleString()} tokens remaining`;
  } else {
    warning.style.display = "none";
  }

  widget.style.opacity = text.trim().length > 0 ? "1" : "0";
  widget.style.pointerEvents = text.trim().length > 0 ? "auto" : "none";
}

// ── Input detection ───────────────────────────────────────────────────────────

function getTextFromElement(el: Element): string {
  if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
    return (el as HTMLInputElement).value;
  }
  return (el as HTMLElement).innerText ?? "";
}

function attachToInput(el: Element, widget: HTMLElement) {
  const handler = () => {
    const text = getTextFromElement(el);
    updateWidget(widget, text);
  };

  el.addEventListener("input", handler);
  el.addEventListener("keyup", handler);

  handler();

  return () => {
    el.removeEventListener("input", handler);
    el.removeEventListener("keyup", handler);
  };
}

// ── Main init ─────────────────────────────────────────────────────────────────

function getSiteConfig(): SiteConfig | null {
  const host = window.location.hostname;

  for (const [pattern, config] of Object.entries(SITE_CONFIGS)) {
    if (host.includes(pattern)) return config;
  }

  for (const site of settings.customSites) {
    if (host.includes(site)) {
      return {
        inputSelector: "textarea, [contenteditable='true']",
        defaultModel: settings.selectedModel,
      };
    }
  }

  return null;
}

function init() {
  if (!settings.enabled) return;

  const siteConfig = getSiteConfig();
  if (!siteConfig) return;

  // Store site config globally so updateWidget can detect model on every keystroke
  _currentSiteConfig = siteConfig;

  // Set initial model from site (unless user has overridden)
  if (!settings.userOverrideModel) {
    settings.selectedModel = resolveActiveModel(siteConfig);
  }

  const widget = createWidget();
  const cleanups: Array<() => void> = [];

  function scanForInputs() {
    const inputs = document.querySelectorAll(siteConfig!.inputSelector);
    inputs.forEach((el) => {
      if (el.getAttribute("data-tl-attached")) return;
      el.setAttribute("data-tl-attached", "true");
      const cleanup = attachToInput(el, widget);
      cleanups.push(cleanup);
    });
  }

  scanForInputs();

  const observer = new MutationObserver(() => scanForInputs());
  observer.observe(document.body, { childList: true, subtree: true });
}

// ── Load settings and boot ────────────────────────────────────────────────────

chrome.storage.sync.get(
  ["enabled", "selectedModel", "customSites", "theme", "userOverrideModel"],
  (stored: {
    enabled?: boolean;
    selectedModel?: string;
    customSites?: string[];
    theme?: "auto" | "light" | "dark";
    userOverrideModel?: boolean;
  }) => {
    if (stored.enabled !== undefined) settings.enabled = stored.enabled;
    if (stored.selectedModel) settings.selectedModel = stored.selectedModel;
    if (stored.customSites) settings.customSites = stored.customSites;
    if (stored.theme) settings.theme = stored.theme;
    if (stored.userOverrideModel !== undefined)
      settings.userOverrideModel = stored.userOverrideModel;

    init();
  }
);

// ── Track stats for popup ─────────────────────────────────────────────────────

let _lastStats: ReturnType<typeof getStats> | null = null;
let _lastActiveText = "";
let _lastDetectedModel = "claude-sonnet-4";

// ── Message listener ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "SETTINGS_UPDATED") {
    // If the user changed model from the popup, flag it as a manual override
    if (msg.settings.selectedModel) {
      settings.userOverrideModel = true;
      chrome.storage.sync.set({ userOverrideModel: true });
    }
    Object.assign(settings, msg.settings);
    const widget = document.getElementById("tl-widget");
    if (widget) widget.remove();
    init();
  }

  if (msg.type === "GET_STATS") {
    sendResponse({
      active: _lastActiveText.trim().length > 0,
      stats: _lastStats,
      model: _lastDetectedModel,
    });
  }

  // Allow popup to reset manual override so auto-detect kicks back in
  if (msg.type === "RESET_MODEL_OVERRIDE") {
    settings.userOverrideModel = false;
    chrome.storage.sync.set({ userOverrideModel: false });
    const siteConfig = getSiteConfig();
    if (siteConfig) {
      settings.selectedModel = resolveActiveModel(siteConfig);
    }
  }
});