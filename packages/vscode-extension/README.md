# SpendLens for VS Code

Real-time token count and cost estimation in your status bar — powered by SpendLens.

## Features

- Live token counter in the status bar as you type
- Estimated cost based on the selected model
- Counts selected text only when you highlight it
- Switch between 12 supported models instantly
- Status bar turns amber/red as you approach context limits

## Usage

Once installed, SpendLens automatically appears in the bottom status bar showing:
```
token count · estimated cost · model name
```

### Commands

Open the command palette (`Ctrl+Shift+P`) and type `SpendLens`:

- **SpendLens: Switch Model** — pick a different LLM model
- **SpendLens: Show Token Stats** — see full stats in a popup

### Supported Models

- Claude Sonnet 4, Opus 4, Haiku 4
- GPT-4o, GPT-4o mini, o1, o3-mini
- Gemini 1.5 Pro, 1.5 Flash, 2.0 Flash
- Llama 3.1 8B, 70B

## Settings
```json
{
  "spendlens.defaultModel": "claude-sonnet-4"
}
```

## Links

- [npm package](https://www.npmjs.com/package/spendlens)
- [GitHub](https://github.com/boyzliberty360/spendlens)
