# 📈 DSH Quote Panel

**English | [简体中文](README.md)**

A real-time stock watch panel for [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) (dsh web). Works as a draggable, always-on-top overlay inside your dsh session — no API key, no account, no cost.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Screenshot](docs/screenshot.png)

## ✨ Features

- **A-share (CN)**: default page shows the three major indices — Shanghai Composite (`sh000001`), Shenzhen Component (`sz399001`), ChiNext (`sz399006`); add any A-share code (`600519`, `sh600519`…)
- **US**: default page shows Dow Jones (`DJI`), Nasdaq Composite (`IXIC`), S&P 500 (`INX`); add any US ticker (`AAPL`, `TSLA`…)
- **K-lines**: A-share intraday (分时) / 60-min / daily / weekly / monthly; US daily / weekly / monthly
- **Watchlist**: add / remove symbols per market, persisted in `localStorage`
- **Auto refresh**: quotes refresh every 5 s (CN) / 10 s (US), server-side
- **Always-on-top & draggable**: z-index pinned above any skin/theme overlay; drag the title bar anywhere; position is remembered
- **Zero config**: all data comes from free public endpoints (Tencent Finance, no key)

## 🚀 Installation

> A bundle plugin: no approval prompts, survives restarts.

### From a local checkout (any OS)

1. Clone / copy this repo into your `dsh-plugin-download` folder (or anywhere).
2. Open your web profile `package.json` (default `~/.dsh/profiles/web/package.json`):
   - add to `dependencies`: `"dsh-quote-panel": "link:<absolute-path-to-this-repo>"`
   - add `"dsh-quote-panel"` to `dsh.profile.bundles`
3. Run `pnpm install` inside the profile directory.
4. Restart `dsh web`, then click the **📈 行情** button in the session header.

On Windows, the same steps apply via PowerShell; on a fresh install you can also copy the package into the profile's `node_modules` directly (see the bundled `install.sh` in release assets).

### From npm / GitHub releases (once published)

```bash
# npm
npm i -g dsh-quote-panel
# or add to your profile dependencies like any other dsh bundle plugin
```

## 🛠 Usage

1. Open a dsh session page, click **📈 行情** (top-right of the conversation header).
2. Switch markets with the **A股 / 美股** tabs.
3. Type a symbol in the box and press **添加** to extend the watchlist; hover a row and click **✕** to remove it.
4. Click any row to load its K-line; switch period with the buttons (分时 / 60分 / 日K / 周K / 月K).
5. Drag the panel by its title bar if it covers something — the position is saved.

## 🗂 Data sources & disclaimer

| Market | Quotes | K-lines |
|---|---|---|
| A-share | Tencent `qt.gtimg.cn` | Tencent `ifzq.gtimg.cn` (intraday / m60 / day / week / month) |
| US | Tencent `qt.gtimg.cn` | Tencent `ifzq.gtimg.cn` (day / week / month) |

- All endpoints are free public web APIs. They may change, throttle, or disappear at any time — the panel degrades gracefully and shows the error.
- **Not financial advice.** The data is for study/research only; verify with your broker before making any decision.
- US intraday (分时) is **not** available from the free Tencent endpoints; US K-lines are daily and above.

## ⚙️ Compatibility

- dsh web (server side: Node ≥ 20, needs the `webServer` service — provided by dsh core)
- Browser side: any modern browser / Android WebView (the panel supports touch drag)
- Tested on Linux and Windows deployments

## 🛠 Development

```bash
pnpm check   # node --check both host and client sources
```

## 📄 License

[MIT](LICENSE) © 2026 dsh-quote-panel contributors
