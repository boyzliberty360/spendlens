// Background service worker — handles extension lifecycle and messaging

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    // Set default settings on first install
    chrome.storage.sync.set({
      enabled: true,
      selectedModel: "claude-sonnet-4",
      customSites: [],
      theme: "auto",
    });

    // Open options page on first install so user can configure
    chrome.runtime.openOptionsPage();
  }
});
