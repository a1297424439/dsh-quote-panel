# 📈 DSH Quote Panel

**English | [简体中文](README.md)**

A real-time stock watch panel for [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) (dsh web). Works as a draggable, always-on-top overlay inside your dsh session — no API key, no account, no cost.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/dsh-quote-panel?color=orange)](https://www.npmjs.com/package/dsh-quote-panel)
[![dsh-plugin](https://img.shields.io/badge/dsh-plugin-4f8cff)](https://github.com/topics/dsh-plugin)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](package.json)

![Screenshot](docs/screenshot.png)

## ✨ Features

- **A-share (CN)**: default page shows the three major indices — Shanghai Composite (`sh000001`), Shenzhen Component (`sz399001`), ChiNext (`sz399006`); add any A-share code (`600519`, `sh600519`…)
- **US**: default page shows Dow Jones (`DJI`), Nasdaq Composite (`IXIC`), S&P 500 (`INX`); add any US ticker (`AAPL`, `TSLA`…)
- **K-lines**: A-share intraday (分时) / 60-min / daily / weekly / monthly; US daily / weekly / monthly
- **Watchlist**: add / remove symbols per market, persisted in `localStorage`
- **Auto refresh**: quotes refresh every 5 s (CN) / 10 s (US), server-side
- **Always-on-top & draggable**: z-index pinned above any skin/theme overlay; drag the title bar anywhere; position is remembered
- **🐂 Cow Pet / 牛来 (added in v1.1)**: click the **🐂 牛来** button in the panel header to summon a cow that roams the page. Whenever **any symbol in your watchlist has `changePct > 0`**, the cow immediately does a two-step run + shouts `\\牛来/` in a yellow speech bubble (twice, 320 ms apart). Two flavors:
  - **Web mode** (default): floats inside your DSH session page; auto-syncs with your watchlist.
  - **Desktop mode**: opens a chrome-less popup window via `window.open` (≈480×360); same-origin so it still hits `/dshq/quotes` in real time. Pin it on top of your screen as a true desktop pet.
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

## 🐂 Cow Pet / 牛来

Click **🐂 牛来** in the panel header to summon a small cow that roams the bottom of the page. Whenever **any symbol in your watchlist is currently up (changePct > 0)**, the cow will:

1. Run two quick steps (≈1.6 s, ~78 px horizontal hop, two jumps)
2. Pause
3. Pop a yellow speech bubble with bold `\\牛来/` plus a sub-line listing the up symbols (e.g. `Kweichow Moutai +1.32% · SSE Composite +0.21%`)
4. Throttle the same wave to ≈1.8 s so it doesn't spam
5. When nothing is up anymore, return to idle wandering and the bubble fades

Data source is shared with the main panel — `/dshq/quotes` — so **no extra endpoints** and **no extra cost**.

### Two modes

| Mode | Entry point | Use case |
|---|---|---|
| Web (default) | Click **🐂 牛来** in the panel header | Always-on while you use DSH; lightest |
| Desktop (popup) | Click **🪟 弹出独立窗口** in the pet overlay | Long-lived desktop pet; pin the popup on top of your screen |

The desktop popup uses `window.open` with no chrome; same origin so it still hits `/dshq/quotes` in real time. If you double-click `lib/desk-pet/standalone.html` directly (off DSH origin), the popup falls back to **Demo mode**: the cow still wanders and pops bubbles, but the data is fake and the status bar reminds you to launch from the DSH session for live quotes.

### Turning the pet off

Click the highlighted **🐂 关掉牛** button in the panel header, or the **✕** button on the overlay.

## 🐮 Electron desktop pet (v1.2 → v1.4)

The repo also ships a standalone **Electron app** (`desktop-pet/`) — a real transparent, frameless, always-on-top window with the cow standing directly on your desktop:

- **Full-screen flying (v1.4)**: the window is now a transparent layer covering your whole workspace; the cow teleports around the full screen (up to 82% height) instead of pacing in a small box
- **Mouse pass-through**: the transparent layer forwards clicks to the apps below (`setIgnoreMouseEvents` + forward); only hovering over the cow takes over interaction — zero interference with normal use, and it stays off the taskbar (`skipTaskbar`)
- **Teleport with afterimages (v1.3)**: idle movement is now a "cultivator-style" teleport — 4 fading afterimages along the path + spirit particles + a shockwave ring on landing
- **Transparent frameless always-on-top window**; the character sheet is auto-matted (white background removed, all 5 views: `desktop-pet/assets/cow-view-*.png`)
- **Left-drag** the cow to move it anywhere on screen
- **NiuLai on green ticks**: watches your watchlist via the free Tencent Finance public API; when any symbol has `changePct > 0` it golden-flashes and teleports to mid-screen, then jumps and shouts `\牛来/` (8 s throttle + 70% probability, no spam)
- **Click interactions**: tap the cow to cycle jump → squash-rebound → shake, each with a random funny Chinese speech bubble (opaque, above the character; bubble moves below the cow when it flies high)
- **Right-click menu**: choose watchlist (presets + custom codes), resize (S/M/L, controls cow body size), always-on-top toggle, quit

```bash
cd desktop-pet
npm install
npm start
npm run dist   # build executables with electron-builder
```

Settings (watchlist, size, on-top) persist across restarts in the OS userData directory.

## 🗂 Data sources & disclaimer

| Market | Quotes | K-lines |
|---|---|---|
| A-share | Tencent `qt.gtimg.cn` | Tencent `ifzq.gtimg.cn` (intraday / m60 / day / week / month) |
| US | Tencent `qt.gtimg.cn` | Tencent `ifzq.gtimg.cn` (day / week / month) |

- All endpoints are free public web APIs. They may change, throttle, or disappear at any time — the panel degrades gracefully and shows the error.
- **Not financial advice.** The data is for study/research only; verify with your broker before making any decision.
- US intraday (分时) is **not** available from the free Tencent endpoints; US K-lines are daily and above.

## 💬 FAQ

**Q: Do I need an API key?**
A: No. All quotes come from Tencent Finance's free public endpoints — zero config, zero cost.

**Q: Why is there no US intraday chart?**
A: The free Tencent endpoints don't provide US intraday data; US K-lines are daily and above. This is a data-source limitation, not a bug.

**Q: Quotes stopped updating / show an error?**
A: Free endpoints may be throttled or temporarily down. The panel shows the error and retries automatically; you can also hit the bottom **刷新** button. If it stays broken for a long time, it's likely a provider-side limit.

**Q: Why doesn't the cow always shout?**
A: The pet only triggers when **any watchlist symbol is up (`changePct > 0`)**, with per-wave throttling (web 1.8 s; desktop 8 s + 70% probability). It wandering quietly during a flat/holiday session is expected.

**Q: Where is my watchlist stored?**
A: In browser `localStorage` (`dshq.lists.cn/us`). It survives refreshes and browser restarts; only clearing site data removes it.

**Q: Which browsers are supported?**
A: Any modern browser (Chrome / Edge / Quark / Firefox / Safari) and Android WebView; the panel supports touch-drag.

## 🤝 Contributing

PRs and Issues are welcome!

- Code style: ESLint defaults, 2-space indent; `lib/` is host & client source, `desktop-pet/` is the standalone Electron app
- Run `pnpm check` (or `npm run check`) before submitting
- Mention your test environment in the PR description for data-source / compatibility changes
- Chinese is fine in Issues

## 🗺 Roadmap

- [ ] Watchlist groups & drag-to-reorder
- [ ] More markets (HK stocks, crypto)
- [ ] K-line indicators (MA / MACD / KDJ)
- [ ] Customizable bubble style & shout phrases
- [ ] Pre-built Electron installers for Windows/macOS

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
