import * as vscode from "vscode";
import { MODELS } from "spendlens";

const MODELS_DATA = Object.entries(MODELS).map(([id, m]) => ({
  id,
  label: m.label,
  provider: m.provider,
  inputCostPer1M: m.inputCostPer1M,
  contextWindow: m.contextWindow,
}));

class SpendLensViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "spendlens.promptPanel";

  constructor(private readonly _extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = this._getHtml();
  }

  private _getHtml(): string {
    const modelsJson = JSON.stringify(MODELS_DATA);
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-sideBar-background); padding: 12px; }
.label { font-size: 11px; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; margin-top: 10px; }
select, textarea { width: 100%; padding: 6px 8px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border, #555); border-radius: 4px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); outline: none; margin-bottom: 10px; }
textarea { min-height: 120px; resize: vertical; }
textarea:focus, select:focus { border-color: var(--vscode-focusBorder); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 10px; }
.stat { background: var(--vscode-input-background); border-radius: 4px; padding: 7px 10px; }
.stat-label { font-size: 10px; opacity: 0.5; margin-bottom: 2px; }
.stat-value { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; }
.ctx-row { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.5; margin-bottom: 4px; }
.track { height: 3px; background: rgba(128,128,128,0.2); border-radius: 99px; overflow: hidden; margin-bottom: 8px; }
.fill { height: 100%; width: 0%; border-radius: 99px; background: #22c55e; transition: width 0.2s, background 0.2s; }
.warn { font-size: 11px; color: #f59e0b; display: none; margin-bottom: 8px; }
button { width: 100%; padding: 6px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; border-radius: 4px; cursor: pointer; font-family: var(--vscode-font-family); margin-top: 4px; }
button:hover { opacity: 0.85; }
</style>
</head>
<body>
<div class="label">Model</div>
<select id="sel"></select>
<div class="label">Prompt</div>
<textarea id="prompt" placeholder="Type or paste your prompt..."></textarea>
<div class="grid">
  <div class="stat"><div class="stat-label">Tokens</div><div class="stat-value" id="t">0</div></div>
  <div class="stat"><div class="stat-label">Est. cost</div><div class="stat-value" id="c">$0.00</div></div>
  <div class="stat"><div class="stat-label">Words</div><div class="stat-value" id="w">0</div></div>
  <div class="stat"><div class="stat-label">Chars</div><div class="stat-value" id="ch">0</div></div>
</div>
<div class="ctx-row"><span>Context window</span><span id="pct">0%</span></div>
<div class="track"><div class="fill" id="fill"></div></div>
<div class="warn" id="warn"></div>
<button onclick="document.getElementById('prompt').value='';update()">Clear</button>

<script>
const MODELS = ${modelsJson};
let model = MODELS.find(m => m.id === 'claude-sonnet-4') || MODELS[0];

// Build select
const sel = document.getElementById('sel');
const grouped = {};
MODELS.forEach(m => { if(!grouped[m.provider]) grouped[m.provider]=[]; grouped[m.provider].push(m); });
const pLabels = {anthropic:'Anthropic',openai:'OpenAI',google:'Google',meta:'Meta'};
Object.entries(grouped).forEach(([p, items]) => {
  const g = document.createElement('optgroup');
  g.label = pLabels[p]||p;
  items.forEach(m => {
    const o = document.createElement('option');
    o.value = m.id;
    o.textContent = m.label + ' — $' + m.inputCostPer1M + '/1M';
    if(m.id === model.id) o.selected = true;
    g.appendChild(o);
  });
  sel.appendChild(g);
});

sel.addEventListener('change', e => {
  model = MODELS.find(m => m.id === e.target.value) || MODELS[0];
  update();
});

function fmt(cost) {
  if(cost===0) return '$0.00';
  if(cost<0.0001) return '$'+cost.toFixed(6);
  if(cost<0.01) return '$'+cost.toFixed(4);
  return '$'+cost.toFixed(2);
}

function update() {
  const text = document.getElementById('prompt').value;
  const tokens = Math.round(text.length / 3.8);
  const cost = (tokens / 1e6) * model.inputCostPer1M;
  const usage = Math.min(tokens / model.contextWindow, 1);
  const pct = (usage*100).toFixed(2);

  document.getElementById('t').textContent = tokens.toLocaleString();
  document.getElementById('c').textContent = fmt(cost);
  document.getElementById('w').textContent = text.trim() ? text.trim().split(/\s+/).length.toLocaleString() : '0';
  document.getElementById('ch').textContent = text.length.toLocaleString();
  document.getElementById('pct').textContent = pct + '%';

  const fill = document.getElementById('fill');
  fill.style.width = pct + '%';
  fill.style.background = usage>=0.9 ? '#ef4444' : usage>=0.6 ? '#f59e0b' : '#22c55e';

  const warn = document.getElementById('warn');
  if(usage>=0.9){
    warn.style.display='block';
    warn.textContent = '⚠ ' + Math.max(model.contextWindow-tokens,0).toLocaleString() + ' tokens remaining';
  } else {
    warn.style.display='none';
  }
}

document.getElementById('prompt').addEventListener('input', update);
update();
</script>
</body>
</html>`;
  }
}

export function activate(context: vscode.ExtensionContext) {
  const provider = new SpendLensViewProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      SpendLensViewProvider.viewType,
      provider
    )
  );

  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right, 100
  );
  statusBar.command = "spendlens.openPanel";
  statusBar.text = "$(symbol-keyword) SpendLens";
  statusBar.tooltip = "Open SpendLens prompt panel";
  statusBar.show();

  const aiExtensions = [
    { id: "GitHub.copilot-chat", name: "GitHub Copilot Chat" },
    { id: "Continue.continue", name: "Continue" },
    { id: "anthropic.claude-vscode", name: "Claude for VS Code" },
    { id: "Codeium.codeium", name: "Codeium" },
  ];

  const activeAI = aiExtensions.find(e => vscode.extensions.getExtension(e.id));
  if (activeAI) {
    statusBar.text = `$(symbol-keyword) SpendLens · ${activeAI.name}`;
    vscode.window.showInformationMessage(
      `SpendLens detected ${activeAI.name} — open the SpendLens panel to estimate prompt costs`
    );
  }

  context.subscriptions.push(
    vscode.commands.registerCommand("spendlens.openPanel", () => {
      vscode.commands.executeCommand("spendlens.promptPanel.focus");
    }),
    vscode.commands.registerCommand("spendlens.switchModel", async () => {
      const items = Object.entries(MODELS).map(([id, m]) => ({
        label: m.label,
        description: `$${m.inputCostPer1M}/1M · ${(m.contextWindow/1000).toFixed(0)}K ctx`,
        id,
      }));
      const picked = await vscode.window.showQuickPick(items, {
        placeHolder: "Select model for token estimation",
      });
      if (picked) {
        vscode.window.showInformationMessage(`SpendLens: switched to ${picked.label}`);
      }
    }),
    statusBar
  );
}

export function deactivate() {}
