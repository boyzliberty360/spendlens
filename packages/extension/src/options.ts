import { MODELS } from "spendlens";

// Populate model dropdown
const modelSelect = document.getElementById("model") as HTMLSelectElement;
Object.entries(MODELS).forEach(([id, config]) => {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = `${config.label} — $${config.inputCostPer1M}/1M in`;
  modelSelect.appendChild(opt);
});

// Load saved settings
chrome.storage.sync.get(
  ["enabled", "selectedModel", "customSites", "theme"],
  (s) => {
    (document.getElementById("enabled") as HTMLInputElement).checked =
      s.enabled ?? true;
    modelSelect.value = s.selectedModel ?? "claude-sonnet-4";
    (document.getElementById("custom-sites") as HTMLTextAreaElement).value = (
      s.customSites ?? []
    ).join("\n");
    (document.getElementById("theme") as HTMLSelectElement).value =
      s.theme ?? "auto";
  }
);

// Save settings
document.getElementById("save-btn")!.addEventListener("click", () => {
  const customSitesRaw = (
    document.getElementById("custom-sites") as HTMLTextAreaElement
  ).value;
  const customSites = customSitesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const newSettings = {
    enabled: (document.getElementById("enabled") as HTMLInputElement).checked,
    selectedModel: modelSelect.value,
    customSites,
    theme: (document.getElementById("theme") as HTMLSelectElement).value,
  };

  chrome.storage.sync.set(newSettings, () => {
    // Notify all content scripts to reload settings
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: "SETTINGS_UPDATED",
            settings: newSettings,
          }).catch(() => {}); // Tab may not have content script
        }
      });
    });

    const status = document.getElementById("save-status")!;
    status.textContent = "Saved!";
    setTimeout(() => (status.textContent = ""), 2000);
  });
});
