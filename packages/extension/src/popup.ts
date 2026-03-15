import { MODELS, formatCost } from "spendlens";

// ── Populate model dropdown ───────────────────────────────────────────────────
const modelSelect = document.getElementById("model-select") as HTMLSelectElement;

const grouped: Record<string, [string, typeof MODELS[string]][]> = {};
for (const [id, config] of Object.entries(MODELS)) {
  const p = config.provider;
  if (!grouped[p]) grouped[p] = [];
  grouped[p].push([id, config]);
}

const providerLabels: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  meta: "Meta",
};

for (const [provider, models] of Object.entries(grouped)) {
  const group = document.createElement("optgroup");
  group.label = providerLabels[provider] ?? provider;
  for (const [id, config] of models) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = config.label;
    group.appendChild(opt);
  }
  modelSelect.appendChild(group);
}

// ── Load settings ─────────────────────────────────────────────────────────────
const toggle = document.getElementById("enabled-toggle") as HTMLInputElement;
const toggleLabel = document.getElementById("toggle-label")!;

chrome.storage.sync.get(["enabled", "selectedModel"], (s) => {
  toggle.checked = s.enabled ?? true;
  toggleLabel.textContent = toggle.checked ? "On" : "Off";
  modelSelect.value = s.selectedModel ?? "claude-sonnet-4";
});

// ── Toggle enable/disable ─────────────────────────────────────────────────────
toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  toggleLabel.textContent = enabled ? "On" : "Off";
  chrome.storage.sync.set({ enabled });
  broadcastSettings({ enabled });
});

// ── Model change ──────────────────────────────────────────────────────────────
modelSelect.addEventListener("change", () => {
  const selectedModel = modelSelect.value;
  chrome.storage.sync.set({ selectedModel });
  broadcastSettings({ selectedModel });
});

function broadcastSettings(patch: Record<string, unknown>) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    tabs.forEach((tab) => {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, {
          type: "SETTINGS_UPDATED",
          settings: patch,
        }).catch(() => {});
      }
    });
  });
}

// ── Request live stats from the active tab's content script ──────────────────
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { type: "GET_STATS" }, (response) => {
    if (chrome.runtime.lastError || !response) return;

    const { stats, model: modelId, active } = response;
    if (!active || !stats) return;

    const model = MODELS[modelId] ?? MODELS["claude-sonnet-4"];

    document.getElementById("popup-tokens")!.textContent =
      stats.tokens.toLocaleString();
    document.getElementById("popup-cost")!.textContent =
      formatCost(stats.inputCost);
    document.getElementById("popup-ctx-pct")!.textContent =
      stats.contextUsagePct;

    const bar = document.getElementById("popup-ctx-bar")!;
    bar.style.width = (stats.contextUsage * 100).toFixed(1) + "%";
    bar.style.background =
      stats.contextUsage >= 0.9
        ? "#ef4444"
        : stats.contextUsage >= 0.6
        ? "#f59e0b"
        : "#22c55e";

    const siteStatus = document.getElementById("site-status")!;
    siteStatus.innerHTML = `<span class="site-tag">${model.label}</span>`;
  });
});

// ── Open options page ─────────────────────────────────────────────────────────
document.getElementById("open-options")!.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
