// dsh-quote-panel — Client 端（bundle 插件）
// 浏览器模块：__ModuleLoader__.load 注册，exports.apply/inject 挂载。
// 数据通过同源 fetch 调用宿主注册的 /dshq/quotes 与 /dshq/kline 路由。

window.__ModuleLoader__.load({
  id: 'dsh-quote-panel',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')
    const { useState, useEffect } = React
    const h = React.createElement

    const CSS = `
.dshq-panel{--dshq-up:#e5484d;--dshq-down:#12b76a;--dshq-bg:rgba(23,25,32,.96);--dshq-text:#e8eaee;--dshq-dim:#9aa2b0;--dshq-border:rgba(255,255,255,.10);--dshq-hover:rgba(255,255,255,.06);--dshq-accent:#4f8cff;box-sizing:border-box;position:fixed;right:16px;top:56px;width:352px;max-height:calc(100vh - 84px);display:flex;flex-direction:column;border-radius:12px;background:var(--dshq-bg);color:var(--dshq-text);border:1px solid var(--dshq-border);box-shadow:0 14px 44px rgba(0,0,0,.45);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);z-index:2147483000;pointer-events:auto;font-size:13px;line-height:1.4;overflow:hidden;font-family:system-ui,-apple-system,'Segoe UI',Roboto,'PingFang SC','Microsoft YaHei',sans-serif}
.dshq-panel *{box-sizing:border-box}
.dshq-head{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--dshq-border);user-select:none;cursor:move;touch-action:none}
.dshq-title{font-weight:650;font-size:13px;margin-right:auto;white-space:nowrap}
.dshq-tabs{display:flex;gap:4px}
.dshq-tab{padding:3px 10px;border-radius:999px;border:1px solid transparent;background:transparent;color:var(--dshq-dim);cursor:pointer;font-size:12px}
.dshq-tab:hover{color:var(--dshq-text)}
.dshq-tab.on{background:var(--dshq-accent);color:#fff}
.dshq-close{background:transparent;border:none;color:var(--dshq-dim);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:6px;line-height:1}
.dshq-close:hover{background:var(--dshq-hover);color:var(--dshq-text)}
.dshq-body{overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px}
.dshq-add{display:flex;gap:6px}
.dshq-input{flex:1;min-width:0;background:rgba(255,255,255,.06);border:1px solid var(--dshq-border);border-radius:8px;color:var(--dshq-text);padding:5px 9px;font-size:12px;outline:none}
.dshq-input:focus{border-color:var(--dshq-accent)}
.dshq-addbtn{background:var(--dshq-accent);color:#fff;border:none;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12px}
.dshq-addbtn:hover{filter:brightness(1.1)}
.dshq-list{display:flex;flex-direction:column;gap:2px}
.dshq-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:8px;cursor:pointer;border:1px solid transparent}
.dshq-row:hover{background:var(--dshq-hover)}
.dshq-row.sel{border-color:var(--dshq-accent);background:rgba(79,140,255,.12)}
.dshq-name{flex:1;min-width:0;overflow:hidden}
.dshq-name b{font-weight:600;font-size:12px;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dshq-name span{font-size:10px;color:var(--dshq-dim)}
.dshq-price{text-align:right;min-width:88px}
.dshq-price b{font-size:13px;display:block;font-variant-numeric:tabular-nums}
.dshq-price span{font-size:11px;font-variant-numeric:tabular-nums}
.dshq-up{color:var(--dshq-up)}
.dshq-down{color:var(--dshq-down)}
.dshq-flat{color:var(--dshq-dim)}
.dshq-rm{background:transparent;border:none;color:var(--dshq-dim);cursor:pointer;font-size:13px;padding:0 4px;border-radius:4px;visibility:hidden;line-height:1}
.dshq-row:hover .dshq-rm{visibility:visible}
.dshq-rm:hover{color:var(--dshq-up)}
.dshq-foot{display:flex;align-items:center;gap:6px;padding:6px 10px;border-top:1px solid var(--dshq-border);font-size:11px;color:var(--dshq-dim)}
.dshq-refresh{background:transparent;border:1px solid var(--dshq-border);color:var(--dshq-dim);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:11px;margin-left:auto}
.dshq-refresh:hover{color:var(--dshq-text);border-color:var(--dshq-accent)}
.dshq-err{color:#ff9d9d;font-size:11px;padding:2px 4px;word-break:break-all}
.dshq-hint{color:var(--dshq-dim);font-size:11px;text-align:center;padding:10px 0}
.dshq-kline{border-top:1px solid var(--dshq-border);padding-top:8px;display:flex;flex-direction:column;gap:6px}
.dshq-kline-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.dshq-kline-name{font-weight:600;font-size:12px;margin-right:auto}
.dshq-kp{background:transparent;border:1px solid var(--dshq-border);color:var(--dshq-dim);border-radius:6px;padding:2px 8px;font-size:11px;cursor:pointer}
.dshq-kp:hover{color:var(--dshq-text)}
.dshq-kp.on{color:var(--dshq-accent);border-color:var(--dshq-accent)}
.dshq-toggle{background:transparent;border:1px solid var(--dshq-border);color:var(--dshq-dim);border-radius:8px;padding:4px 10px;font-size:12px;cursor:pointer}
.dshq-toggle:hover{color:var(--dshq-text)}
.dshq-toggle.on{color:var(--dshq-accent);border-color:var(--dshq-accent)}
`

    const inject = ['slots', 'timer']

    function apply(ctx) {
      try {
        // 样式注入
        try {
          const tag = document.createElement('style')
          tag.textContent = CSS
          document.head.appendChild(tag)
          ctx.effect(() => () => { try { tag.remove() } catch (e) {} })
        } catch (e) { console.error('dshq css:', e) }

        function loadPos() {
          try {
            const raw = localStorage.getItem('dshq.pos')
            if (raw) {
              const o = JSON.parse(raw)
              if (o && isFinite(o.right) && isFinite(o.top)) {
                return { right: Math.max(0, Math.min(o.right, window.innerWidth - 40)), top: Math.max(0, o.top) }
              }
            }
          } catch (e) {}
          return { right: 16, top: 56 }
        }

        const store = {
          open: false,
          market: 'cn',
          lists: {
            cn: ['sh000001', 'sz399001', 'sz399006'],
            us: ['DJI', 'IXIC', 'INX'],
          },
          quotes: { cn: null, us: null },
          quoteError: null,
          busy: { cn: false, us: false },
          selected: null,
          kline: null,
          klineError: null,
          klinePeriod: 'day',
          klineBusy: false,
          pos: loadPos(),
          remoteReady: false,
        }
        const listeners = new Set()
        const emit = () => { for (const fn of Array.from(listeners)) { try { fn() } catch (e) {} } }
        const subscribe = (fn) => { listeners.add(fn); return () => { listeners.delete(fn) } }

        function useStore() {
          const [, setTick] = useState(0)
          useEffect(() => subscribe(() => setTick(t => t + 1)), [])
        }

        function patch(p) { Object.assign(store, p); emit() }

        function fmtErr(e) {
          if (e == null) return ''
          if (typeof e === 'string') return e
          if (typeof e.message === 'string') return e.message
          try { return JSON.stringify(e) } catch (_) { return String(e) }
        }

        // 直接同源 fetch 宿主 HTTP 路由（v2：不走 Remote/typert/网关）
        async function callQuotes(market, symbols) {
          const url = '/dshq/quotes?market=' + encodeURIComponent(market) + '&symbols=' + encodeURIComponent(symbols.join(','))
          const res = await fetch(url)
          if (!res.ok) throw new Error('HTTP ' + res.status)
          return await res.json()
        }
        async function callKline(market, symbol, period) {
          const url = '/dshq/kline?market=' + encodeURIComponent(market) + '&symbol=' + encodeURIComponent(symbol) + '&period=' + encodeURIComponent(period)
          const res = await fetch(url)
          if (!res.ok) throw new Error('HTTP ' + res.status)
          return await res.json()
        }

        async function refresh(market) {
          const m = market || store.market
          if (store.busy[m]) return
          store.busy[m] = true
          emit()
          try {
            const res = await callQuotes(m, store.lists[m])
            if (res && res.ok) {
              const quotes = Object.assign({}, store.quotes)
              quotes[m] = res
              patch({ quotes, quoteError: null })
            } else {
              patch({ quoteError: fmtErr(res && res.error) || '行情请求失败' })
            }
          } catch (e) {
            patch({ quoteError: fmtErr(e) || '行情请求失败' })
          } finally {
            store.busy[m] = false
            emit()
          }
        }

        async function loadKline(market, symbol, period) {
          store.klineBusy = true
          store.klineError = null
          emit()
          try {
            const res = await callKline(market, symbol, period)
            if (res && res.ok) patch({ kline: res, klinePeriod: period })
            else patch({ klineError: fmtErr(res && res.error) || 'K线请求失败' })
          } catch (e) {
            patch({ klineError: fmtErr(e) || 'K线请求失败' })
          } finally {
            store.klineBusy = false
            emit()
          }
        }

        function normalizeAdd(market, raw) {
          const s = String(raw || '').trim()
          if (market === 'cn') {
            let t = s.toLowerCase().trim()
            if (/^(sh|sz)\d{6}$/.test(t)) return t
            t = t.replace(/^(sh|sz|bj)/, '')
            return /^\d{6}$/.test(t) ? t : null
          }
          const t = s.toUpperCase()
          return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(t) ? t : null
        }

        function fmtPrice(p) {
          if (p == null || !isFinite(p)) return '—'
          return p.toFixed(2)
        }

        function fmtClock(t) {
          const s = String(t || '')
          return s.length >= 4 ? s.slice(0, 2) + ':' + s.slice(2, 4) : s
        }

        function fmtAxis(d) {
          const s = String(d || '')
          if (/^\d{12}$/.test(s)) return s.slice(8, 10) + ':' + s.slice(10, 12)
          if (/^\d{8}$/.test(s)) return s.slice(4, 6) + '-' + s.slice(6, 8)
          if (s.length >= 16) return s.slice(5, 16)
          return s.slice(5)
        }

        function periodLabel(period) {
          if (period === 'min') return '分时'
          if (period === 'm60') return '60分'
          if (period === 'day') return '日K'
          if (period === 'week') return '周K'
          return '月K'
        }

        function MinuteChart(props) {
          const points = props.points || []
          const prev = props.prevClose
          const W = 330, H = 168, padL = 8, padR = 8, padT = 14, padB = 24
          const plotW = W - padL - padR, plotH = H - padT - padB
          const UP = '#e5484d', DOWN = '#12b76a', DIM = '#8a93a3', GRID = '#3a3f47'
          let min = Infinity, max = -Infinity
          for (const p of points) { if (p.price != null && p.price > max) max = p.price; if (p.price != null && p.price < min) min = p.price }
          if (!isFinite(min) || !isFinite(max)) return h('div', { className: 'dshq-hint' }, '暂无分时数据')
          const pad = (max - min) * 0.08 || Math.max(1, max * 0.01)
          min -= pad; max += pad
          const n = points.length
          const step = plotW / n
          const y = (v) => padT + ((max - v) / (max - min)) * plotH
          const last = points[n - 1]
          const color = prev != null && last.price != null && last.price >= prev ? UP : DOWN
          const parts = []
          for (let i = 0; i < n; i++) parts.push((i === 0 ? 'M' : 'L') + (padL + i * step).toFixed(1) + ' ' + y(points[i].price).toFixed(1))
          const linePath = parts.join(' ')
          const areaPath = linePath + ' L' + (padL + (n - 1) * step).toFixed(1) + ' ' + (H - padB) + ' L' + padL + ' ' + (H - padB) + ' Z'
          const els = []
          for (let g = 0; g <= 3; g++) {
            const yy = padT + (plotH * g) / 3
            const val = max - ((max - min) * g) / 3
            els.push(h('line', { key: 'g' + g, x1: padL, y1: yy, x2: W - padR, y2: yy, stroke: GRID, strokeWidth: 1 }))
            els.push(h('text', { key: 'gt' + g, x: W - padR - 2, y: yy - 3, textAnchor: 'end', fontSize: 9, fill: DIM }, fmtPrice(val, store.market)))
          }
          if (prev != null && prev >= min && prev <= max) {
            const py = y(prev)
            els.push(h('line', { key: 'pv', x1: padL, y1: py, x2: W - padR, y2: py, stroke: DIM, strokeWidth: 1, strokeDasharray: '4 3' }))
          }
          els.push(h('path', { key: 'area', d: areaPath, fill: color, fillOpacity: 0.08 }))
          els.push(h('path', { key: 'line', d: linePath, fill: 'none', stroke: color, strokeWidth: 1.5 }))
          const ts = [points[0].time, points[Math.floor((n - 1) / 2)].time, points[n - 1].time]
          for (let i = 0; i < 3; i++) {
            const x = i === 0 ? padL + 2 : i === 1 ? padL + plotW / 2 : W - padR - 2
            const anchor = i === 0 ? 'start' : i === 1 ? 'middle' : 'end'
            els.push(h('text', { key: 't' + i, x: x, y: H - 6, fontSize: 9, fill: DIM, textAnchor: anchor }, fmtClock(ts[i])))
          }
          return h('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: { display: 'block', maxWidth: '100%' } }, els)
        }

        function KlineChart(props) {
          const klines = props.klines
          const W = 330, H = 168, padL = 8, padR = 8, padT = 14, padB = 24, volH = 26
          const plotW = W - padL - padR
          const plotH = H - padT - padB
          const UP = '#e5484d', DOWN = '#12b76a', GRID = '#3a3f47', DIM = '#8a93a3'
          let min = Infinity, max = -Infinity, vmax = 0
          for (const k of klines) {
            if (k.high != null && k.high > max) max = k.high
            if (k.low != null && k.low < min) min = k.low
            if (k.volume != null && k.volume > vmax) vmax = k.volume
          }
          if (!isFinite(min) || !isFinite(max)) return h('div', { className: 'dshq-hint' }, '暂无K线数据')
          const pad = (max - min) * 0.06 || Math.max(1, max * 0.01)
          min -= pad; max += pad
          const n = klines.length
          const step = plotW / n
          const y = (v) => padT + ((max - v) / (max - min)) * plotH
          const els = []
          for (let i = 0; i < n; i++) {
            const k = klines[i]
            if (k.open == null || k.close == null) continue
            const x = padL + i * step
            const cw = Math.max(1.5, step * 0.65)
            const up = k.close >= k.open
            const color = up ? UP : DOWN
            const o = y(k.open), c = y(k.close)
            const hi = y(k.high), lo = y(k.low)
            els.push(h('line', { key: 'w' + i, x1: x + cw / 2, y1: hi, x2: x + cw / 2, y2: lo, stroke: color, strokeWidth: 1 }))
            els.push(h('rect', { key: 'b' + i, x: x, y: Math.min(o, c), width: cw, height: Math.max(1, Math.abs(c - o)), fill: color }))
            if (vmax > 0 && k.volume != null) {
              const vb = volH * (k.volume / vmax)
              els.push(h('rect', { key: 'v' + i, x: x, y: H - padB + (volH - vb), width: cw, height: vb, fill: color, fillOpacity: 0.35 }))
            }
          }
          for (let g = 0; g <= 3; g++) {
            const yy = padT + (plotH * g) / 3
            const val = max - ((max - min) * g) / 3
            els.push(h('line', { key: 'g' + g, x1: padL, y1: yy, x2: W - padR, y2: yy, stroke: GRID, strokeWidth: 1 }))
            els.push(h('text', { key: 'gt' + g, x: W - padR - 2, y: yy - 3, textAnchor: 'end', fontSize: 9, fill: DIM }, fmtPrice(val, store.market)))
          }
          const idxs = [0, Math.floor((n - 1) / 2), n - 1]
          for (const i of idxs) {
            const k = klines[i]
            if (!k) continue
            els.push(h('text', { key: 'd' + i, x: padL + i * step + 2, y: H - 6, fontSize: 9, fill: DIM }, fmtAxis(k.date)))
          }
          const last = klines[n - 1]
          if (last && last.close != null) {
            const ly = y(last.close)
            els.push(h('line', { key: 'lc', x1: padL, y1: ly, x2: W - padR, y2: ly, stroke: UP, strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.55 }))
          }
          return h('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: { display: 'block', maxWidth: '100%' } }, els)
        }

        function Panel() {
          useStore()
          const [addText, setAddText] = useState('')
          const m = store.market
          useEffect(() => {
            if (!store.open) return undefined
            refresh(m)
            const ms = m === 'us' ? 10000 : 5000
            return ctx.interval(() => refresh(store.market), ms)
          }, [m, store.open])
          if (!store.open) return null

          const dragRef = { current: null }
          const onHeadDown = (e) => {
            if (e.button !== 0 && e.pointerType === 'mouse') return
            dragRef.current = { x: e.clientX, y: e.clientY, right: store.pos.right, top: store.pos.top }
            const move = (ev) => {
              const ds = dragRef.current
              if (!ds) return
              patch({
                pos: {
                  right: Math.max(0, ds.right - (ev.clientX - ds.x)),
                  top: Math.max(0, ds.top + (ev.clientY - ds.y)),
                },
              })
            }
            const up = () => {
              dragRef.current = null
              document.removeEventListener('pointermove', move)
              document.removeEventListener('pointerup', up)
              try { localStorage.setItem('dshq.pos', JSON.stringify(store.pos)) } catch (err) {}
            }
            document.addEventListener('pointermove', move)
            document.addEventListener('pointerup', up)
          }

          const res = store.quotes[m]
          const items = (res && res.items) || []
          const errors = (res && res.errors) || []
          const sel = store.selected
          const selSym = sel && sel.market === m ? sel.symbol : null
          const periodDefs = m === 'cn' ? [['min', '分时'], ['m60', '60分'], ['day', '日K'], ['week', '周K'], ['month', '月K']]
            : [['day', '日K'], ['week', '周K'], ['month', '月K']]

          const add = () => {
            const sym = normalizeAdd(m, addText)
            if (!sym) {
              patch({ quoteError: '代码格式不对，如 ' + (m === 'cn' ? '600519 或 sh000001' : 'AAPL') })
              return
            }
            if (store.lists[m].indexOf(sym) === -1) {
              const lists = Object.assign({}, store.lists)
              lists[m] = store.lists[m].concat([sym])
              patch({ lists })
              refresh(m)
            }
            setAddText('')
          }
          const remove = (sym) => {
            const lists = Object.assign({}, store.lists)
            lists[m] = store.lists[m].filter(x => x !== sym)
            patch({ lists })
            refresh(m)
          }
          const select = (sym) => {
            patch({ selected: { market: m, symbol: sym }, klineError: null })
            loadKline(m, sym, store.klinePeriod)
          }
          const setPeriod = (p) => {
            if (!selSym) return
            patch({ klinePeriod: p })
            loadKline(m, selSym, p)
          }

          const rows = items.map(it => {
            const up = it.changePct != null && it.changePct > 0
            const down = it.changePct != null && it.changePct < 0
            const cls = up ? 'dshq-up' : down ? 'dshq-down' : 'dshq-flat'
            const isSel = selSym === it.key
            return h('div', { key: it.key, className: 'dshq-row' + (isSel ? ' sel' : ''), onClick: () => select(it.key) },
              h('div', { className: 'dshq-name' },
                h('b', null, it.name || it.code),
                h('span', null, it.code)),
              h('div', { className: 'dshq-price' },
                h('b', { className: cls }, fmtPrice(it.price, m)),
                h('span', { className: cls }, it.changePct != null ? (it.changePct > 0 ? '+' : '') + it.changePct.toFixed(2) + '%' : '—')),
              h('button', { className: 'dshq-rm', title: '移除', onClick: (e) => { e.stopPropagation(); remove(it.key) } }, '✕'))
          })

          const kline = store.kline && store.kline.market === m && store.kline.symbol === selSym ? store.kline : null
          const selItem = selSym ? items.find(it => it.key === selSym) : null
          let chart = null
          if (kline && kline.kind === 'min' && kline.points && kline.points.length) chart = h(MinuteChart, { points: kline.points, prevClose: selItem ? selItem.prevClose : null })
          else if (kline && kline.klines && kline.klines.length) chart = h(KlineChart, { klines: kline.klines })

          return h('div', { className: 'dshq-panel', style: { right: store.pos.right + 'px', top: store.pos.top + 'px' } },
            h('div', { className: 'dshq-head', onPointerDown: onHeadDown },
              h('span', { className: 'dshq-title' }, '📈 行情看板'),
              h('div', { className: 'dshq-tabs' },
                h('button', { className: 'dshq-tab' + (m === 'cn' ? ' on' : ''), onClick: () => patch({ market: 'cn' }) }, 'A股'),
                h('button', { className: 'dshq-tab' + (m === 'us' ? ' on' : ''), onClick: () => patch({ market: 'us' }) }, '美股')),
              h('button', { className: 'dshq-close', title: '关闭', onClick: () => patch({ open: false }) }, '✕')),
            h('div', { className: 'dshq-body' },
              h('div', { className: 'dshq-add' },
                h('input', { className: 'dshq-input', value: addText, placeholder: m === 'cn' ? '添加代码，如 600519 或 sh000001' : '添加代码，如 AAPL 或 DJI', onChange: (e) => setAddText(e.target.value), onKeyDown: (e) => { if (e.key === 'Enter') add() } }),
                h('button', { className: 'dshq-addbtn', onClick: add }, '添加')),
              store.quoteError ? h('div', { className: 'dshq-err' }, '⚠ ' + store.quoteError) : null,
              errors.length ? h('div', { className: 'dshq-err' }, '未找到: ' + errors.join(', ')) : null,
              rows.length ? h('div', { className: 'dshq-list' }, rows) : h('div', { className: 'dshq-hint' }, '加载中或列表为空…'),
              selSym ? h('div', { className: 'dshq-kline' },
                h('div', { className: 'dshq-kline-head' },
                  h('span', { className: 'dshq-kline-name' }, selSym + ' · ' + periodLabel(store.klinePeriod)),
                  periodDefs.map(pd => h('button', { key: pd[0], className: 'dshq-kp' + (store.klinePeriod === pd[0] ? ' on' : ''), onClick: () => setPeriod(pd[0]) }, pd[1]))),
                store.klineBusy ? h('div', { className: 'dshq-hint' }, '加载K线中…')
                  : store.klineError ? h('div', { className: 'dshq-err' }, '⚠ ' + store.klineError)
                  : chart || h('div', { className: 'dshq-hint' }, '暂无K线数据'))
              : h('div', { className: 'dshq-hint' }, '点击上方代码查看K线')),
            h('div', { className: 'dshq-foot' },
              h('span', null, '更新于 ' + (res && res.timeText ? res.timeText : '—')),
              h('button', { className: 'dshq-refresh', onClick: () => refresh(m) }, '刷新')))
        }

        function ToggleButton() {
          useStore()
          return h('button', { className: 'dshq-toggle' + (store.open ? ' on' : ''), title: '打开/关闭行情面板', onClick: () => patch({ open: !store.open }) }, '📈 行情')
        }

        // 挂载 UI
        const slots = ctx.get('slots')
        if (slots !== undefined) {
          slots.inject('shell.overlay', () => slots.register(
            { name: 'shell.overlay', id: 'dshq-panel' },
            () => h(Panel),
          ))
          slots.inject('conversation.session.header.actions', () => slots.register(
            { name: 'conversation.session.header.actions', id: 'dshq-toggle' },
            () => h(ToggleButton),
          ))
        }
      } catch (e) {
        console.error('dsh-quote-panel client apply failed:', e)
      }
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})
