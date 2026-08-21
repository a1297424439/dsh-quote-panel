// dsh-quote-panel — 🐂 牛来 桌面版（独立窗口 · 瞬移飞行版）
// 由 client.js 通过 window.open() 弹出；共享同源可继续走 /dshq/quotes
// 行为对齐 Electron 桌面版 v1.4：满场瞬移 + 残影 + 仙气 + 金光喊牛来 + 70% 正面亮相
// 兜底：拿不到同源接口则进入 demo 模式（仅视觉演示，不接实时数据）

(function () {
  'use strict'

  var DEFAULT_CN = ['sh000001', 'sz399001', 'sz399006']
  var DEFAULT_US = ['DJI', 'IXIC', 'INX']
  var POLL_MS = 5000
  var NIULAI_MIN_INTERVAL = 8000 // 喊牛来最小间隔
  var TELEPORT_MIN = 2600        // 待机瞬移最小间隔
  var TELEPORT_MAX = 5200        // 待机瞬移最大间隔
  var NIULAI_CHANCE = 0.7        // 有票在涨时的喊话概率

  var VIEWS = {
    front: './assets/cow-view-1.png', // 正面（互动/喊牛来/大概率落地亮相）
    side: './assets/cow-view-3.png',  // 侧面朝左（小概率落地）
  }

  var LINES = [
    '牛来！', '今天我超牛！', '再点一下试试？', '兄弟，满仓了吗？',
    '我赌它红！', '冲鸭——', '这手感不错', '歇会儿，累了',
    '别戳了别戳了', '哞~', '牛市在向我招手', '涨了记得请我吃草',
    '贫道牛来是也~', '掐指一算，要涨！', '渡劫中，勿扰', '本牛已飞升',
    '此处灵气稀薄，换个地方', '御牛飞行，稳',
  ]

  var SIZES = [
    { key: 'small', label: '小' },
    { key: 'medium', label: '中' },
    { key: 'large', label: '大' },
  ]

  var stage = document.getElementById('stage')
  var pet = document.getElementById('pet')
  var cow = document.getElementById('cow')
  var bubble = document.getElementById('bubble')
  var fx = document.getElementById('fx')
  var statusEl = document.getElementById('status')
  var btnPause = document.getElementById('btn-pause')
  var btnReload = document.getElementById('btn-reload')
  var btnSize = document.getElementById('btn-size')

  var state = {
    cn: (function () {
      try {
        var v = JSON.parse(localStorage.getItem('dshq.lists.cn'))
        return Array.isArray(v) && v.length ? v : DEFAULT_CN
      } catch (e) { return DEFAULT_CN }
    })(),
    us: (function () {
      try {
        var v = JSON.parse(localStorage.getItem('dshq.lists.us'))
        return Array.isArray(v) && v.length ? v : DEFAULT_US
      } catch (e) { return DEFAULT_US }
    })(),
    lastUp: [],
    busy: false,
    paused: false,
    demoMode: false,

    // —— 飞行状态 ——
    x: 0,            // pet 左边距 px（舞台坐标）
    by: 0,           // pet 距舞台底部 px（飞行高度）
    direction: -1,   // 侧面图朝向：-1 左 / 1 右
    idleView: 'side',// 待机姿势（瞬移落地抽签，正面概率大）
    teleporting: false,
    interacting: false,
    dragging: false,
    interactionIndex: 0,
    bubbleTimer: null,
    teleportTimer: null,
    lastNiuLai: 0,
    sizeIndex: 1,
  }

  // —— 坐标工具（全部相对舞台） ——
  function petW() { return pet.offsetWidth }
  function petH() { return pet.offsetHeight }
  function maxX() { return Math.max(0, stage.clientWidth - petW()) }
  function maxY() { return Math.max(0, Math.floor(stage.clientHeight * 0.82)) }
  function clampX(v) { return Math.max(0, Math.min(v, maxX())) }
  function clampBy(v) { return Math.max(0, Math.min(v, maxY())) }

  function applyPosition() {
    pet.style.left = state.x + 'px'
    pet.style.bottom = state.by + 'px'
  }

  // —— 姿势切换 ——
  function setView(name) {
    var src = VIEWS[name]
    if (!cow.src.endsWith(src)) cow.src = src
  }

  function setFacing(dir) {
    state.direction = dir
    cow.style.transform = dir < 0 ? 'translateX(-50%) scaleX(1)' : 'translateX(-50%) scaleX(-1)'
  }

  function setFrontNoFlip() {
    cow.style.transform = 'translateX(-50%)'
  }

  // 待机姿势：落地后保持到下一次瞬移/互动
  function setIdleView(name) {
    state.idleView = name
    setView(name)
    if (name === 'front') setFrontNoFlip()
    else setFacing(state.direction)
  }

  // —— 修仙特效 ——
  function spawnGhost(centerX, bottomY, delayMs) {
    var g = document.createElement('div')
    g.className = 'ghost'
    g.style.left = centerX + 'px'
    g.style.bottom = bottomY + 'px'
    g.style.height = petH() + 'px'
    g.style.animationDelay = delayMs + 'ms'
    g.innerHTML = '<img src="' + cow.src + '" alt="" draggable="false">'
    fx.appendChild(g)
    setTimeout(function () { if (g.parentNode) g.parentNode.removeChild(g) }, 900 + delayMs)
  }

  function spawnQi(count, centerX, bottomY, gold) {
    for (var i = 0; i < count; i++) {
      var q = document.createElement('div')
      q.className = 'qi' + (gold ? ' gold' : '')
      var ang = Math.random() * Math.PI * 2
      var dist = 16 + Math.random() * 36
      q.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px')
      q.style.setProperty('--dy', (Math.sin(ang) * dist - 26).toFixed(1) + 'px')
      q.style.left = centerX + 'px'
      q.style.bottom = (bottomY + petH() * 0.4) + 'px'
      q.style.animationDelay = Math.floor(Math.random() * 120) + 'ms'
      fx.appendChild(q)
      setTimeout(function () { var el = this; if (el.parentNode) el.parentNode.removeChild(el) }.bind(q), 1300)
    }
    var ring = document.createElement('div')
    ring.className = 'qi-ring' + (gold ? ' gold' : '')
    ring.style.left = centerX + 'px'
    ring.style.bottom = (bottomY + 8) + 'px'
    fx.appendChild(ring)
    setTimeout(function () { if (ring.parentNode) ring.parentNode.removeChild(ring) }, 800)
  }

  // —— 瞬移（带残影 + 仙气），舞台范围随便飞 ——
  function teleport(opts, cb) {
    if (state.interacting || state.dragging || state.paused) {
      if (cb) cb()
      return
    }
    if (state.teleporting) return
    state.teleporting = true
    opts = opts || {}

    var oldX = state.x
    var oldBy = state.by
    var targetX = opts.x != null ? opts.x : Math.random() * maxX()
    var targetBy = opts.by != null ? opts.by : Math.random() * maxY()
    var oldCx = oldX + petW() / 2
    var newCx = targetX + petW() / 2

    // 残影：沿瞬移轨迹摆 4 道
    for (var i = 1; i <= 4; i++) {
      var t = i / 5
      spawnGhost(oldCx + (newCx - oldCx) * t, oldBy + (targetBy - oldBy) * t, i * 45)
    }

    // 消失
    pet.classList.add('vanish')
    setTimeout(function () {
      state.x = clampX(targetX)
      state.by = clampBy(targetBy)
      state.direction = newCx >= oldCx ? 1 : -1
      // 落地亮相：70% 正面（对着你），30% 侧面
      setIdleView(Math.random() < 0.7 ? 'front' : 'side')
      applyPosition()

      // 现身：仙气爆发
      pet.classList.remove('vanish')
      pet.classList.add('appear')
      spawnQi(opts.burst ? 14 : 8, state.x + petW() / 2, state.by, opts.gold)

      setTimeout(function () {
        pet.classList.remove('appear')
        state.teleporting = false
        if (cb) cb()
      }, 280)
    }, 190)
  }

  function scheduleTeleport() {
    clearTimeout(state.teleportTimer)
    var wait = TELEPORT_MIN + Math.random() * (TELEPORT_MAX - TELEPORT_MIN)
    state.teleportTimer = setTimeout(function () {
      if (state.teleporting || state.interacting || state.dragging || state.paused) {
        scheduleTeleport()
        return
      }
      teleport()
      scheduleTeleport()
    }, wait)
  }

  // —— 气泡（舞台内定位，牛在舞台上半截时气泡挪到脚下）——
  function showBubble(main, sub, duration) {
    clearTimeout(state.bubbleTimer)
    bubble.innerHTML = ''
    var m = document.createElement('div')
    m.className = 'b-main'
    m.textContent = main
    bubble.appendChild(m)
    if (sub) {
      var s = document.createElement('span')
      s.className = 'sub'
      s.textContent = sub
      bubble.appendChild(s)
    }
    bubble.classList.add('show')
    requestAnimationFrame(function () {
      var w = bubble.offsetWidth
      var h = bubble.offsetHeight
      var cx = state.x + petW() / 2
      var left = Math.max(4, Math.min(cx - w / 2, stage.clientWidth - w - 4))
      bubble.style.left = left + 'px'
      // 牛头顶离舞台顶不够放气泡 → 挪到牛脚下
      var petTop = stage.clientHeight - state.by - petH()
      if (petTop >= h + 12) {
        bubble.style.top = 'auto'
        bubble.style.bottom = (state.by + petH() + 6) + 'px'
      } else {
        bubble.style.bottom = 'auto'
        bubble.style.top = (petTop + petH() + 6) + 'px'
      }
    })
    state.bubbleTimer = setTimeout(function () { bubble.classList.remove('show') }, duration || 1800)
  }

  // —— 互动（点击轮流触发）——
  var INTERACTIONS = ['jump', 'squash', 'shake']
  var INTERACTION_NAMES = ['跳一下', '压扁回弹', '左右抖动']

  function playInteraction() {
    if (state.interacting || state.teleporting) return
    state.interacting = true
    var idx = state.interactionIndex % INTERACTIONS.length
    var cls = INTERACTIONS[idx]
    var name = INTERACTION_NAMES[idx]
    state.interactionIndex++

    setView('front')
    setFrontNoFlip()
    pet.classList.add(cls)
    showBubble(LINES[Math.floor(Math.random() * LINES.length)], name, 1800)

    setTimeout(function () {
      pet.classList.remove(cls)
      state.interacting = false
      if (!state.dragging) setIdleView(state.idleView)
    }, 600)
  }

  // —— 牛来（股票上涨：金光爆闪瞬移 + 喊话）——
  function shoutNow(sub) {
    setView('front')
    setFrontNoFlip()
    pet.classList.add('jump')
    setTimeout(function () { pet.classList.remove('jump') }, 600)
    showBubble('\\牛来/', sub, 2600)
    setTimeout(function () {
      if (!state.interacting && !state.dragging) setIdleView(state.idleView)
    }, 700)
  }

  function buildSub(list) {
    if (!list.length) return '行情全面上扬'
    var top = list.slice(0, 3)
    var more = list.length > 3 ? ' 等' + list.length + '只' : ''
    return top.map(function (s) {
      return s.name + ' +' + s.changePct.toFixed(2) + '%'
    }).join(' · ') + more
  }

  function niuLai(ups) {
    var now = Date.now()
    if (now - state.lastNiuLai < NIULAI_MIN_INTERVAL) return
    state.lastNiuLai = now
    var sub = buildSub(ups)
    if (state.interacting || state.dragging || state.teleporting || state.paused) {
      shoutNow(sub)
      return
    }
    // 金光爆闪：飞到舞台中上部显眼位置再喊
    teleport(
      {
        x: maxX() * 0.15 + Math.random() * maxX() * 0.7,
        by: Math.floor(stage.clientHeight * (0.2 + Math.random() * 0.35)),
        burst: true,
        gold: true,
      },
      function () { setTimeout(function () { shoutNow(sub) }, 60) }
    )
  }

  // —— 行情 ——
  async function fetchQuotes(market, symbols) {
    if (!symbols || !symbols.length) return { ok: true, items: [] }
    var url = '/dshq/quotes?market=' + encodeURIComponent(market) + '&symbols=' + encodeURIComponent(symbols.join(','))
    var res = await fetch(url, { credentials: 'same-origin' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    return await res.json()
  }

  function upStocks(q) {
    var items = (q && q.items) || []
    var out = []
    for (var i = 0; i < items.length; i++) {
      var it = items[i]
      var cp = it && it.changePct
      if (typeof cp === 'number' && cp > 0) {
        out.push({ key: it.key, name: it.name || it.code, code: it.code, changePct: cp, price: it.price })
      }
    }
    return out
  }

  function setStatus(text, up) {
    if (!statusEl) return
    statusEl.textContent = text
    statusEl.className = 'status' + (up ? ' up' : '')
  }

  async function pollOnce() {
    if (state.paused || state.busy) return
    state.busy = true
    try {
      var cnRes = await fetchQuotes('cn', state.cn)
      var usRes = await fetchQuotes('us', state.us)
      var ups = upStocks(cnRes).concat(upStocks(usRes))
      state.lastUp = ups.slice()
      if (ups.length > 0) {
        setStatus('🟢 ' + ups.length + ' 只标的上涨', true)
        if (Math.random() < NIULAI_CHANCE) niuLai(ups)
      } else {
        setStatus('— 当前没有上涨的标的 —', false)
      }
    } catch (e) {
      // 同源不可用 → demo 模式
      if (!state.demoMode) {
        state.demoMode = true
        showDemoNotice()
      }
      setStatus('⚠ 无法连接 DSH 行情服务（请从 DSH 会话页面启动）', false)
      // demo 模式：随机让一只假装上涨
      niuLai([{
        key: 'DEMO',
        name: 'Demo 上涨',
        changePct: +(Math.random() * 1.5 + 0.4).toFixed(2),
        price: 100 + Math.random() * 10
      }])
    } finally {
      state.busy = false
    }
  }

  function showDemoNotice() {
    var n = document.createElement('div')
    n.className = 'notice'
    n.innerHTML = '<div><b>🎬 Demo 模式</b></div><div style="margin-top:8px;max-width:280px;line-height:1.5">未检测到同源 /dshq/quotes（典型情况：你双击打开了 standalone.html）。<br>请从 DSH 会话页面点 🪟 启动此窗口以获得实时行情。</div>'
    stage.appendChild(n)
    setTimeout(function () {
      if (n && n.parentNode) {
        n.style.transition = 'opacity .6s'
        n.style.opacity = '0'
        setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n) }, 700)
      }
    }, 5000)
  }

  // —— 控制按钮 ——
  btnPause.addEventListener('click', function () {
    state.paused = !state.paused
    btnPause.textContent = state.paused ? '▶ 继续' : '⏸ 暂停'
  })
  btnReload.addEventListener('click', function () { pollOnce() })

  function applySize() {
    stage.className = 'stage size-' + SIZES[state.sizeIndex].key
    btnSize.textContent = '📐 ' + SIZES[state.sizeIndex].label
    // 牛本体尺寸变了，位置可能超界，收敛一下
    state.x = clampX(state.x)
    state.by = clampBy(state.by)
    applyPosition()
  }
  btnSize.addEventListener('click', function () {
    state.sizeIndex = (state.sizeIndex + 1) % SIZES.length
    applySize()
  })

  // —— 拖动（左键）：舞台内直接改牛坐标 ——
  var dragStart = null
  var moveAccum = 0

  pet.addEventListener('pointerdown', function (e) {
    if (e.button !== 0) return
    dragStart = { px: e.clientX, py: e.clientY, x: state.x, by: state.by }
    moveAccum = 0
    try { pet.setPointerCapture(e.pointerId) } catch (err) {}
  })

  pet.addEventListener('pointermove', function (e) {
    if (!dragStart) return
    var dx = e.clientX - dragStart.px
    var dy = e.clientY - dragStart.py
    moveAccum = Math.abs(dx) + Math.abs(dy)
    if (moveAccum > 5) {
      state.dragging = true
      state.x = clampX(dragStart.x + dx)
      state.by = clampBy(dragStart.by - dy)
      applyPosition()
    }
  })

  pet.addEventListener('pointerup', function (e) {
    if (!dragStart) return
    var wasDrag = state.dragging
    dragStart = null
    state.dragging = false
    try { pet.releasePointerCapture(e.pointerId) } catch (err) {}
    if (!wasDrag) {
      // 没拖动 = 单击 → 触发互动
      playInteraction()
    } else if (!state.interacting) {
      setIdleView(state.idleView)
    }
  })

  pet.addEventListener('pointercancel', function () {
    dragStart = null
    state.dragging = false
  })

  // —— 启动 ——
  setIdleView('side')
  state.x = clampX(Math.floor(stage.clientWidth * 0.72))
  state.by = 16
  applyPosition()
  scheduleTeleport()
  pollOnce()
  setInterval(pollOnce, POLL_MS)

  window.addEventListener('resize', function () {
    state.x = clampX(state.x)
    state.by = clampBy(state.by)
    applyPosition()
  })
})()
