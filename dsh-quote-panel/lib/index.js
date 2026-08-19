// dsh-quote-panel — Host 端（webServer HTTP 路由 + Node fetch）
// 不走 typert/Remote/网关，直接注册两个 HTTP 路由返回 JSON，客户端用同源 fetch 取数。
// 注意：本文件是宿主组合插件，apply 绝不能抛错，否则 web 启动失败。

// 轻量调试日志：错误级默认输出到 dsh 日志；设环境变量 DSHQ_DEBUG=1 输出全部
function flog(msg) {
  try {
    const m = String(msg || '')
    const dbg = typeof process !== 'undefined' && process.env && process.env.DSHQ_DEBUG === '1'
    if (dbg) console.log('[dsh-quote-panel] ' + m)
    else if (/error|fail|throw|不可用|empty/i.test(m)) console.warn('[dsh-quote-panel] ' + m)
  } catch (e) { /* ignore */ }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Node 内置 fetch（宿主根上下文可用）
async function fetchText(url, tries) {
  const n = tries == null ? 2 : tries
  for (let i = 0; i < n; i++) {
    try {
      const controller = new AbortController()
      const t = setTimeout(() => controller.abort(), 8000)
      let res
      try {
        res = await fetch(url, { signal: controller.signal })
      } finally {
        clearTimeout(t)
      }
      const text = await res.text()
      if (text && text.length > 0) return text
      flog('fetch empty: ' + url.slice(0, 80) + ' status=' + res.status)
    } catch (e) {
      flog('fetch threw: ' + url.slice(0, 60) + ' ' + ((e && e.message) || e))
    }
    if (i < n - 1) await sleep(300)
  }
  return null
}

function num(v) {
  const x = typeof v === 'number' ? v : parseFloat(v)
  return isFinite(x) ? x : null
}

function toTencentCn(s) {
  let t = String(s || '').trim().toLowerCase()
  const m = t.match(/^(sh|sz)(\d{6})$/)
  if (m) return m[1] + m[2]
  t = t.replace(/^(sh|sz|bj)/, '')
  if (!/^\d{6}$/.test(t)) return null
  if (t[0] === '6' || t[0] === '5' || t[0] === '9') return 'sh' + t
  return 'sz' + t
}

function toTencentUs(s) {
  const t = String(s || '').trim().toUpperCase()
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(t) ? 'us' + t : null
}

function normCrypto(s) {
  return String(s || '').trim().toUpperCase().replace(/-/g, '').replace(/USDT$/, '')
}

const nameCache = {}
const usSuffixCache = {}

async function fillName(code, symbol) {
  const key = symbol
  if (nameCache[key]) return nameCache[key]
  const text = await fetchText('https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=' + code + ',day,,,1,qfq')
  if (text !== null) {
    try {
      const j = JSON.parse(text)
      const qt = j && j.data && j.data[code] && j.data[code].qt && j.data[code].qt[code]
      if (qt && typeof qt[1] === 'string' && qt[1]) nameCache[key] = qt[1]
    } catch (e) { /* keep uncached */ }
  }
  return nameCache[key] || symbol
}

function localClock() {
  try {
    const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    return d.toISOString().slice(11, 19)
  } catch (e) { return '' }
}

async function tencentQuotes(market, symbols) {
  const codes = []
  const symOf = {}
  for (const s of symbols) {
    const code = market === 'cn' ? toTencentCn(s) : toTencentUs(s)
    if (!code) continue
    codes.push(code)
    symOf[code] = s
  }
  if (!codes.length) return { ok: true, market, items: [], errors: symbols.slice() }
  const text = await fetchText('https://qt.gtimg.cn/q=' + codes.join(','))
  if (text === null) return { ok: false, market, error: '腾讯行情请求失败' }
  const items = []
  const found = {}
  const nameJobs = []
  for (const line of text.split(';')) {
    const m = line.match(/v_([^=]+)="([^"]*)"/)
    if (!m) continue
    const reqCode = m[1]
    const symbol = symOf[reqCode]
    if (!symbol) continue
    const fields = m[2].split('~')
    if (fields.length < 35) continue
    found[reqCode] = true
    const isUs = market === 'us'
    const item = {
      key: symbol,
      code: fields[2] || reqCode,
      name: symbol,
      price: num(fields[3]),
      prevClose: num(fields[4]),
      open: num(fields[5]),
      high: num(fields[33]),
      low: num(fields[34]),
      change: num(fields[31]),
      changePct: num(fields[32]),
      volume: num(fields[36]),
      amount: num(fields[37]),
      time: fields[30] || '',
      currency: isUs ? 'USD' : 'CNY',
    }
    if (isUs) {
      // 腾讯美股字段: field[46]=英文名(Apple Inc.)  field[1]=中文名(苹果)
      const en = ((fields[46] || '').trim() || (fields[1] || '').trim())
      if (en) item.name = en
      else nameJobs.push(fillName('us' + (fields[2] || symbol), symbol).then(n => { item.name = n }))
      if (fields[2]) usSuffixCache[symbol] = fields[2]
    } else {
      nameJobs.push(fillName(reqCode, symbol).then(n => { item.name = n }))
    }
    items.push(item)
  }
  await Promise.all(nameJobs)
  const errors = codes.filter(c => !found[c])
  return { ok: true, market, items, errors, timeText: localClock() }
}

async function cryptoQuotes(symbols) {
  const pairs = symbols.map(s => normCrypto(s) + 'USDT')
  if (!pairs.length) return { ok: true, market: 'crypto', items: [], errors: [] }
  const url = 'https://data-api.binance.vision/api/v3/ticker/24hr?symbols=' + encodeURIComponent(JSON.stringify(pairs))
  const text = await fetchText(url)
  if (text === null) return { ok: false, market: 'crypto', error: '币安行情请求失败' }
  let arr
  try { arr = JSON.parse(text) } catch (e) { return { ok: false, market: 'crypto', error: '币安行情解析失败' } }
  if (!Array.isArray(arr)) return { ok: false, market: 'crypto', error: '币安行情返回异常' }
  const byPair = {}
  for (const t of arr) if (t && t.symbol) byPair[t.symbol] = t
  const items = []
  const errors = []
  for (let i = 0; i < symbols.length; i++) {
    const pair = pairs[i]
    const t = byPair[pair]
    if (!t) { errors.push(pair); continue }
    const base = normCrypto(symbols[i])
    items.push({
      key: base,
      code: pair,
      name: base + '/USDT',
      price: num(t.lastPrice),
      prevClose: num(t.prevClosePrice),
      open: num(t.openPrice),
      high: num(t.highPrice),
      low: num(t.lowPrice),
      change: num(t.priceChange),
      changePct: num(t.priceChangePercent),
      volume: num(t.volume),
      amount: num(t.quoteVolume),
      time: '',
      currency: 'USDT',
    })
  }
  return { ok: true, market: 'crypto', items, errors, timeText: localClock() }
}

async function getQuotes(market, symbols) {
  try {
    if (market === 'crypto') return await cryptoQuotes(symbols)
    if (market === 'cn' || market === 'us') return await tencentQuotes(market, symbols)
    return { ok: false, error: '未知市场: ' + market }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}

async function guessUsSuffix(symbol) {
  const text = await fetchText('https://qt.gtimg.cn/q=us' + symbol)
  if (text !== null) {
    const m = text.match(/v_[^=]+="([^"]*)"/)
    const f = m && m[1] ? m[1].split('~') : []
    if (f[2]) {
      usSuffixCache[symbol] = f[2]
      return f[2]
    }
  }
  return null
}

async function sinaUsDaily(symbol) {
  const text = await fetchText('https://stock.finance.sina.com.cn/usstock/api/jsonp_v2.php/var%20_data=/US_MinKService.getDailyK?symbol=' + symbol)
  if (text === null) return null
  const i0 = text.indexOf('[')
  const i1 = text.lastIndexOf(']')
  if (i0 < 0 || i1 <= i0) return null
  try {
    const arr = JSON.parse(text.slice(i0, i1 + 1))
    if (!Array.isArray(arr)) return null
    return arr.slice(-180).map(r => ({ date: r.d, open: num(r.o), high: num(r.h), low: num(r.l), close: num(r.c), volume: num(r.v) }))
  } catch (e) { return null }
}

async function tencentKline(market, symbol, period) {
  const p = period === 'week' ? 'week' : period === 'month' ? 'month' : 'day'
  let code
  if (market === 'us') {
    const suffix = usSuffixCache[symbol] || (await guessUsSuffix(symbol))
    code = 'us' + (suffix || symbol)
  } else {
    code = toTencentCn(symbol)
  }
  if (!code) return { ok: false, error: '无效代码: ' + symbol }
  const text = await fetchText('https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=' + code + ',' + p + ',,,200,qfq')
  if (text === null) return { ok: false, error: 'K线请求失败' }
  let json
  try { json = JSON.parse(text) } catch (e) { return { ok: false, error: 'K线解析失败' } }
  const d = json && json.data && json.data[code]
  const rows = d && (d['qfq' + p] || d[p])
  if (rows && rows.length) {
    return {
      ok: true, market, symbol, period: p,
      klines: rows.slice(-180).map(r => ({ date: r[0], open: num(r[1]), close: num(r[2]), high: num(r[3]), low: num(r[4]), volume: num(r[5]) })),
    }
  }
  if (market === 'us' && p === 'day') {
    const st = await sinaUsDaily(symbol)
    if (st && st.length) return { ok: true, market, symbol, period: p, klines: st }
  }
  return { ok: false, error: '无K线数据' }
}

async function minuteKline(market, symbol) {
  if (market !== 'cn') return { ok: false, error: '该市场暂无分时数据' }
  const code = toTencentCn(symbol)
  if (!code) return { ok: false, error: '无效代码: ' + symbol }
  const text = await fetchText('https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=' + code)
  if (text === null) return { ok: false, error: '分时请求失败' }
  let json
  try { json = JSON.parse(text) } catch (e) { return { ok: false, error: '分时解析失败' } }
  const d = json && json.data && json.data[code] && json.data[code].data
  const rows = d && Array.isArray(d.data) ? d.data : null
  if (!rows || !rows.length) return { ok: false, error: '暂无分时数据' }
  const points = []
  for (const r of rows) {
    const parts = String(r).split(' ')
    if (parts.length >= 2) {
      const p = num(parts[1])
      if (p != null) points.push({ time: parts[0], price: p, volume: num(parts[2]), amount: num(parts[3]) })
    }
  }
  if (!points.length) return { ok: false, error: '暂无分时数据' }
  return { ok: true, market, symbol, period: 'min', kind: 'min', points, date: (d && d.date) || '' }
}

async function hourlyKline(market, symbol) {
  if (market === 'crypto') {
    const pair = normCrypto(symbol) + 'USDT'
    const text = await fetchText('https://data-api.binance.vision/api/v3/klines?symbol=' + pair + '&interval=1h&limit=96')
    if (text === null) return { ok: false, error: 'K线请求失败' }
    let arr
    try { arr = JSON.parse(text) } catch (e) { return { ok: false, error: 'K线解析失败' } }
    if (!Array.isArray(arr) || !arr.length) return { ok: false, error: '无K线数据' }
    return {
      ok: true, market, symbol, period: 'm60', kind: 'kline',
      klines: arr.map(r => ({ date: new Date(r[0]).toISOString().slice(0, 16).replace('T', ' '), open: num(r[1]), high: num(r[2]), low: num(r[3]), close: num(r[4]), volume: num(r[5]) })),
    }
  }
  if (market === 'us') return { ok: false, error: '该市场暂无60分钟K线' }
  const code = toTencentCn(symbol)
  if (!code) return { ok: false, error: '无效代码: ' + symbol }
  const text = await fetchText('https://ifzq.gtimg.cn/appstock/app/kline/mkline?param=' + code + ',m60,,96')
  if (text === null) return { ok: false, error: 'K线请求失败' }
  let json
  try { json = JSON.parse(text) } catch (e) { return { ok: false, error: 'K线解析失败' } }
  const d = json && json.data && json.data[code]
  const rows = d && d.m60
  if (!rows || !rows.length) return { ok: false, error: '无K线数据' }
  return {
    ok: true, market, symbol, period: 'm60', kind: 'kline',
    klines: rows.map(r => ({ date: String(r[0]), open: num(r[1]), close: num(r[2]), high: num(r[3]), low: num(r[4]), volume: num(r[5]) })),
  }
}

async function cryptoKline(symbol, period) {
  const pair = normCrypto(symbol) + 'USDT'
  const interval = period === 'week' ? '1w' : period === 'month' ? '1M' : '1d'
  const text = await fetchText('https://data-api.binance.vision/api/v3/klines?symbol=' + pair + '&interval=' + interval + '&limit=200')
  if (text === null) return { ok: false, error: 'K线请求失败' }
  let arr
  try { arr = JSON.parse(text) } catch (e) { return { ok: false, error: 'K线解析失败' } }
  if (!Array.isArray(arr) || !arr.length) return { ok: false, error: '无K线数据' }
  return {
    ok: true, market: 'crypto', symbol, period,
    klines: arr.map(r => ({ date: new Date(r[0]).toISOString().slice(0, 10), open: num(r[1]), high: num(r[2]), low: num(r[3]), close: num(r[4]), volume: num(r[5]) })),
  }
}

async function getKline(market, symbol, period) {
  const sym = String(symbol || '').trim()
  const per = period || 'day'
  try {
    if (per === 'min') return await minuteKline(market, sym)
    if (per === 'm60') return await hourlyKline(market, sym)
    if (market === 'crypto') return await cryptoKline(sym, per)
    return await tencentKline(market, sym, per)
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}

export const inject = ['webServer']

export function apply(ctx) {
  try {
    const webServer = ctx.get('webServer')
    if (webServer === undefined) {
      flog('apply: webServer 不可用')
      return
    }
    flog('apply: 注册 /dshq/quotes 与 /dshq/kline 路由')

    const respond = (res, status, obj) => {
      try {
        res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify(obj))
      } catch (e) { /* ignore */ }
    }

    webServer.register({
      kind: 'exact',
      path: '/dshq/quotes',
      handler: async (req, res) => {
        try {
          const u = new URL(req.url, 'http://localhost')
          const market = u.searchParams.get('market') || 'cn'
          const symbols = (u.searchParams.get('symbols') || '').split(',').map(s => s.trim()).filter(Boolean)
          const result = await getQuotes(market, symbols)
          respond(res, 200, result)
        } catch (e) {
          respond(res, 500, { ok: false, error: String((e && e.message) || e) })
        }
      },
    })

    webServer.register({
      kind: 'exact',
      path: '/dshq/kline',
      handler: async (req, res) => {
        try {
          const u = new URL(req.url, 'http://localhost')
          const market = u.searchParams.get('market') || 'cn'
          const symbol = u.searchParams.get('symbol') || ''
          const period = u.searchParams.get('period') || 'day'
          const result = await getKline(market, symbol, period)
          respond(res, 200, result)
        } catch (e) {
          respond(res, 500, { ok: false, error: String((e && e.message) || e) })
        }
      },
    })
  } catch (e) {
    flog('apply failed: ' + ((e && e.message) || e))
  }
}
