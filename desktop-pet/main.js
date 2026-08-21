const { app, BrowserWindow, ipcMain, Menu, dialog, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')

// 远程桌面/无 GPU/受限沙箱环境下禁用硬件加速，防止 GPU 进程崩溃
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-gpu-compositing')
app.commandLine.appendSwitch('no-sandbox')
app.commandLine.appendSwitch('use-gl', 'swiftshader')

const SETTINGS_PATH = path.join(app.getPath('userData'), 'dshq-pet-settings.json')

const DEFAULT_STOCKS = ['sh000001', 'sz399001', 'sz399006']

function loadSettings() {
  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf8')
    return Object.assign({ stocks: DEFAULT_STOCKS, size: 'medium', alwaysOnTop: true }, JSON.parse(data))
  } catch (e) {
    return { stocks: DEFAULT_STOCKS, size: 'medium', alwaysOnTop: true }
  }
}

function saveSettings(settings) {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true })
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2))
  } catch (e) { console.error(e) }
}

let win
let settings = loadSettings()
let stockTimer = null

function createWindow() {
  // 全屏透明窗口：整个工作区都是牛的活动范围
  const { workArea } = screen.getPrimaryDisplay()
  win = new BrowserWindow({
    x: workArea.x,
    y: workArea.y,
    width: workArea.width,
    height: workArea.height,
    transparent: true,
    frame: false,
    alwaysOnTop: settings.alwaysOnTop,
    skipTaskbar: true,
    resizable: false,
    fullscreenable: false,
    maximizable: false,
    minimizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.setAlwaysOnTop(settings.alwaysOnTop, 'screen-saver')
  // 默认鼠标穿透（事件继续转发给下层应用），鼠标悬停到牛身上时由渲染进程关闭穿透
  win.setIgnoreMouseEvents(true, { forward: true })
  win.loadFile(path.join(__dirname, 'renderer.html'))

  win.on('closed', () => { win = null })
}

// 把用户输入的代码规范化为腾讯格式（sh600519 / sz000001）
function normalizeSymbol(symbol) {
  const s = String(symbol).toLowerCase().trim().replace(/\.SS$/, '').replace(/\.SZ$/, '')
  if (/^(sh|sz|bj)/.test(s)) return s
  const digits = s.replace(/\D/g, '')
  if (/^6/.test(digits) || /^5/.test(digits) || /^9/.test(digits)) return 'sh' + digits
  if (/^0/.test(digits) || /^2/.test(digits) || /^3/.test(digits)) return 'sz' + digits
  if (/^8/.test(digits) || /^4/.test(digits)) return 'bj' + digits
  return s
}

function fetchQuotes(symbols) {
  return new Promise((resolve, reject) => {
    const list = symbols.map(normalizeSymbol).join(',')
    const url = `https://qt.gtimg.cn/q=${encodeURIComponent(list)}`
    https.get(url, { timeout: 8000 }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        try {
          const buf = Buffer.concat(chunks)
          let text
          try {
            text = new TextDecoder('gbk').decode(buf)
          } catch (e) {
            text = buf.toString('utf8')
          }
          const quotes = []
          const re = /v_(\w+)="([^"]*)"/g
          let m
          while ((m = re.exec(text)) !== null) {
            const parts = m[2].split('~')
            if (parts.length < 34) continue
            const price = parseFloat(parts[3])
            const changePct = parseFloat(parts[33])
            quotes.push({
              code: m[1],
              name: parts[1] || m[1],
              price: isNaN(price) ? null : price,
              changePct: isNaN(changePct) ? null : changePct,
            })
          }
          resolve(quotes)
        } catch (e) {
          reject(e)
        }
      })
    }).on('error', reject)
  })
}

async function pollStocks() {
  if (!win) return
  try {
    const quotes = await fetchQuotes(settings.stocks)
    const ups = quotes.filter((q) => q.changePct != null && q.changePct > 0)
    win.webContents.send('stocks-update', { quotes, ups })
  } catch (e) {
    // silent fail: renderer stays in demo/idle
    win.webContents.send('stocks-update', { quotes: [], ups: [], error: e.message })
  }
}

function startStockPolling() {
  if (stockTimer) clearInterval(stockTimer)
  pollStocks()
  stockTimer = setInterval(pollStocks, 5000)
}

function buildContextMenu() {
  return Menu.buildFromTemplate([
    {
      label: '关注股票',
      submenu: [
        { label: '默认 A 股指数', click: () => setStocks(DEFAULT_STOCKS) },
        { label: '白酒', click: () => setStocks(['sh600519', 'sz000858', 'sh600809']) },
        { label: '科技', click: () => setStocks(['sz002230', 'sh603501', 'sz000938']) },
        { label: '新能源', click: () => setStocks(['sz300750', 'sh601012', 'sz002594']) },
        { type: 'separator' },
        { label: '自定义…', click: showCustomStockDialog },
      ],
    },
    {
      label: '调整大小',
      submenu: [
        { label: '小', type: 'radio', checked: settings.size === 'small', click: () => setSize('small') },
        { label: '中', type: 'radio', checked: settings.size === 'medium', click: () => setSize('medium') },
        { label: '大', type: 'radio', checked: settings.size === 'large', click: () => setSize('large') },
      ],
    },
    {
      label: '置顶',
      type: 'checkbox',
      checked: settings.alwaysOnTop,
      click: (item) => setAlwaysOnTop(item.checked),
    },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
}

function setStocks(list) {
  settings.stocks = list
  saveSettings(settings)
  if (win) win.webContents.send('stocks-changed', list)
  pollStocks()
}

function setSize(size) {
  settings.size = size
  saveSettings(settings)
  // 全屏窗口尺寸不变，大小档位只影响牛本体的渲染尺寸
  if (win) win.webContents.send('size-changed', size)
}

function setAlwaysOnTop(v) {
  settings.alwaysOnTop = v
  saveSettings(settings)
  if (win) {
    win.setAlwaysOnTop(v, 'screen-saver')
    win.webContents.send('always-on-top-changed', v)
  }
}

let customWin = null
function showCustomStockDialog() {
  if (customWin && !customWin.isDestroyed()) {
    customWin.focus()
    return
  }
  // 全屏透明主窗口没法当定位参照，弹窗居中显示
  const wa = screen.getPrimaryDisplay().workArea
  customWin = new BrowserWindow({
    width: 360,
    height: 180,
    x: Math.floor(wa.x + (wa.width - 360) / 2),
    y: Math.floor(wa.y + (wa.height - 180) / 2),
    parent: win,
    modal: true,
    alwaysOnTop: true,
    title: '自定义关注股票',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'custom-stock-preload.js'),
      contextIsolation: true,
    },
  })
  customWin.loadFile(path.join(__dirname, 'custom-stock.html'))
  customWin.on('closed', () => { customWin = null })
}

ipcMain.on('set-ignore-mouse-events', (event, ignore) => {
  if (win) win.setIgnoreMouseEvents(!!ignore, { forward: true })
})

ipcMain.on('show-context-menu', () => {
  buildContextMenu().popup()
})

ipcMain.on('quit-app', () => app.quit())

ipcMain.handle('get-initial-state', () => settings)

ipcMain.on('custom-stocks', (event, text) => {
  const list = text.split(/[,，\s]+/).filter(Boolean)
  if (list.length) {
    setStocks(list)
  }
  if (customWin && !customWin.isDestroyed()) customWin.close()
})

app.whenReady().then(() => {
  createWindow()
  startStockPolling()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
