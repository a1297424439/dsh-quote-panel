// 🐂 牛来桌面桌宠 - 渲染进程逻辑（全屏飞仙版 v1.4）
// 窗口铺满整个屏幕（透明穿透），牛在全屏范围内瞬移飞行
const pet = document.getElementById('pet')
const cow = document.getElementById('cow')
const bubble = document.getElementById('bubble')
const fx = document.getElementById('fx')

const VIEWS = {
  front: 'assets/cow-view-1.png', // 正面（互动/喊牛来）
  side: 'assets/cow-view-3.png',  // 侧面朝左（待机/瞬移）
}

// 互动气泡随机语录
const LINES = [
  '牛来！', '今天我超牛！', '再点一下试试？', '兄弟，满仓了吗？',
  '我赌它红！', '冲鸭——', '这手感不错', '歇会儿，累了',
  '别戳了别戳了', '哞~', '牛市在向我招手', '涨了记得请我吃草',
  '贫道牛来是也~', '掐指一算，要涨！', '渡劫中，勿扰', '本牛已飞升',
  '此处灵气稀薄，换个地方', '御牛飞行，稳', '刚从东方财富回来，累',
]

let state = {
  x: 0,             // pet 左边距 px（全屏坐标）
  by: 0,            // pet 距屏幕底部 px（飞行高度）
  direction: -1,    // 侧面图默认朝左
  idleView: 'side', // 待机姿势：瞬移落地时抽签决定（正面概率大）
  teleporting: false,
  interacting: false,
  dragging: false,
  interactionIndex: 0, // 0 jump 1 squash 2 shake
  bubbleTimer: null,
  teleportTimer: null,
  lastNiuLai: 0,
  mouseOnPet: false,
}

const NIULAI_MIN_INTERVAL = 8000 // 牛来气泡最小间隔
const TELEPORT_MIN = 2600        // 待机瞬移最小间隔
const TELEPORT_MAX = 5200        // 待机瞬移最大间隔

function petWidth() {
  return pet.offsetWidth
}

function petHeight() {
  return pet.offsetHeight
}

function maxX() {
  return Math.max(0, window.innerWidth - petWidth())
}

// 满屏飞行：高度上限到屏幕 82%
function maxY() {
  return Math.max(0, Math.floor(window.innerHeight * 0.82))
}

function clampX(v) {
  return Math.max(0, Math.min(v, maxX()))
}

function clampBy(v) {
  return Math.max(0, Math.min(v, maxY()))
}

function applyPosition() {
  pet.style.left = state.x + 'px'
  pet.style.bottom = state.by + 'px'
}

function setFacing(dir) {
  state.direction = dir
  // 侧面图朝左：向左不翻转，向右水平翻转
  cow.style.transform = dir < 0 ? 'translateX(-50%) scaleX(1)' : 'translateX(-50%) scaleX(-1)'
}

function setFrontNoFlip() {
  cow.style.transform = 'translateX(-50%)'
}

function setView(name) {
  const src = VIEWS[name]
  if (!cow.src.endsWith(src)) cow.src = src
}

// 待机姿势：落地后保持到下一次瞬移/互动
function setIdleView(name) {
  state.idleView = name
  setView(name)
  if (name === 'front') setFrontNoFlip()
  else setFacing(state.direction)
}

// —— 鼠标穿透切换：默认全穿透，悬停牛身上才接管 ——
function setMouseThrough(ignore) {
  if (window.electronAPI && window.electronAPI.setIgnoreMouseEvents) {
    window.electronAPI.setIgnoreMouseEvents(ignore)
  }
}

window.addEventListener('mousemove', (e) => {
  const over = pet.contains(e.target)
  if (over !== state.mouseOnPet) {
    state.mouseOnPet = over
    setMouseThrough(!over)
  }
})

// —— 修仙特效层 ——
function spawnGhost(centerX, bottomY, delayMs) {
  const g = document.createElement('div')
  g.className = 'ghost'
  g.style.left = centerX + 'px'
  g.style.bottom = bottomY + 'px'
  g.style.height = petHeight() + 'px'
  g.style.animationDelay = delayMs + 'ms'
  g.innerHTML = '<img src="' + cow.src + '" alt="" draggable="false">'
  fx.appendChild(g)
  setTimeout(() => g.remove(), 900 + delayMs)
}

function spawnQi(count, centerX, bottomY, gold) {
  for (let i = 0; i < count; i++) {
    const q = document.createElement('div')
    q.className = 'qi' + (gold ? ' gold' : '')
    const ang = Math.random() * Math.PI * 2
    const dist = 16 + Math.random() * 36
    q.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px')
    q.style.setProperty('--dy', (Math.sin(ang) * dist - 26).toFixed(1) + 'px')
    q.style.left = centerX + 'px'
    q.style.bottom = (bottomY + petHeight() * 0.4) + 'px'
    q.style.animationDelay = Math.floor(Math.random() * 120) + 'ms'
    fx.appendChild(q)
    setTimeout(() => q.remove(), 1300)
  }
  const ring = document.createElement('div')
  ring.className = 'qi-ring' + (gold ? ' gold' : '')
  ring.style.left = centerX + 'px'
  ring.style.bottom = (bottomY + 8) + 'px'
  fx.appendChild(ring)
  setTimeout(() => ring.remove(), 800)
}

// —— 瞬移（带残影 + 仙气），全屏范围随便飞 ——
function teleport(opts, cb) {
  if (state.interacting || state.dragging) {
    if (cb) cb()
    return
  }
  if (state.teleporting) return
  state.teleporting = true
  opts = opts || {}

  const oldX = state.x
  const oldBy = state.by
  const targetX = opts.x != null ? opts.x : Math.random() * maxX()
  const targetBy = opts.by != null ? opts.by : Math.random() * maxY()
  const oldCx = oldX + petWidth() / 2
  const newCx = targetX + petWidth() / 2

  // 残影：沿瞬移轨迹摆 4 道
  for (let i = 1; i <= 4; i++) {
    const t = i / 5
    spawnGhost(oldCx + (newCx - oldCx) * t, oldBy + (targetBy - oldBy) * t, i * 45)
  }

  // 消失
  pet.classList.add('vanish')
  setTimeout(() => {
    state.x = clampX(targetX)
    state.by = clampBy(targetBy)
    state.direction = newCx >= oldCx ? 1 : -1
    // 落地亮相：70% 正面亮相（对着你），30% 侧面
    setIdleView(Math.random() < 0.7 ? 'front' : 'side')
    applyPosition()

    // 现身：仙气爆发（飞行中途就是气浪光环）
    pet.classList.remove('vanish')
    pet.classList.add('appear')
    spawnQi(opts.burst ? 14 : 8, state.x + petWidth() / 2, state.by, opts.gold)

    setTimeout(() => {
      pet.classList.remove('appear')
      state.teleporting = false
      if (cb) cb()
    }, 280)
  }, 190)
}

function scheduleTeleport() {
  clearTimeout(state.teleportTimer)
  const wait = TELEPORT_MIN + Math.random() * (TELEPORT_MAX - TELEPORT_MIN)
  state.teleportTimer = setTimeout(() => {
    if (state.teleporting || state.interacting || state.dragging) {
      scheduleTeleport()
      return
    }
    teleport()
    scheduleTeleport()
  }, wait)
}

// —— 气泡（body 层定位；牛在屏幕上半截时气泡挪到脚下，避免出屏）——
function showBubble(main, sub, duration) {
  clearTimeout(state.bubbleTimer)
  bubble.innerHTML = main + (sub ? '<span class="sub">' + sub + '</span>' : '')
  bubble.classList.add('show')
  requestAnimationFrame(() => {
    const w = bubble.offsetWidth
    const h = bubble.offsetHeight
    const cx = state.x + petWidth() / 2
    let left = cx - w / 2
    left = Math.max(4, Math.min(left, window.innerWidth - w - 4))
    bubble.style.left = left + 'px'
    // 牛头顶离屏顶不够放气泡 → 挪到牛脚下
    const petTop = window.innerHeight - state.by - petHeight()
    if (petTop >= h + 16) {
      bubble.style.top = 'auto'
      bubble.style.bottom = (state.by + petHeight() + 6) + 'px'
    } else {
      bubble.style.bottom = 'auto'
      bubble.style.top = (petTop + petHeight() + 6) + 'px'
    }
  })
  state.bubbleTimer = setTimeout(() => bubble.classList.remove('show'), duration || 1800)
}

// —— 互动（点击轮流触发）——
const INTERACTIONS = ['jump', 'squash', 'shake']
const INTERACTION_NAMES = ['跳一下', '压扁回弹', '左右抖动']

function playInteraction() {
  if (state.interacting || state.teleporting) return
  state.interacting = true
  const cls = INTERACTIONS[state.interactionIndex % INTERACTIONS.length]
  const name = INTERACTION_NAMES[state.interactionIndex % INTERACTIONS.length]
  state.interactionIndex++

  setView('front')
  setFrontNoFlip()
  pet.classList.add(cls)

  // 随机趣味气泡
  showBubble(LINES[Math.floor(Math.random() * LINES.length)], name, 1800)

  setTimeout(() => {
    pet.classList.remove(cls)
    state.interacting = false
    if (!state.dragging) {
      setIdleView(state.idleView)
    }
  }, 600)
}

// —— 牛来（股票上涨：金光爆闪瞬移 + 喊话）——
function shoutNow(sub) {
  setView('front')
  setFrontNoFlip()
  pet.classList.add('jump')
  setTimeout(() => pet.classList.remove('jump'), 600)
  showBubble('\\牛来/', sub, 2600)
  setTimeout(() => {
    if (!state.interacting && !state.dragging) {
      setIdleView(state.idleView)
    }
  }, 700)
}

function niuLai(ups) {
  const now = Date.now()
  if (now - state.lastNiuLai < NIULAI_MIN_INTERVAL) return
  state.lastNiuLai = now
  const top = ups[0]
  const sub = top ? top.name + ' +' + top.changePct.toFixed(2) + '%' : ''
  if (state.interacting || state.dragging || state.teleporting) {
    shoutNow(sub)
    return
  }
  // 金光爆闪：飞到屏幕中上部显眼位置再喊
  teleport(
    {
      x: maxX() * 0.15 + Math.random() * maxX() * 0.7,
      by: Math.floor(window.innerHeight * (0.2 + Math.random() * 0.35)),
      burst: true,
      gold: true,
    },
    () => setTimeout(() => shoutNow(sub), 60)
  )
}

// —— 行情更新 ——
if (window.electronAPI) {
  window.electronAPI.onStocksUpdate(({ quotes, ups }) => {
    if (ups && ups.length > 0) {
      // 有票在涨：70% 概率喊（还要过最小间隔节流）
      if (Math.random() < 0.7) niuLai(ups)
    }
  })
  window.electronAPI.onSizeChanged((size) => {
    document.body.className = 'size-' + size
    // 牛本体的尺寸变了，位置可能超界，收敛一下
    state.x = clampX(state.x)
    state.by = clampBy(state.by)
    applyPosition()
  })
  window.electronAPI.getInitialState().then((s) => {
    if (s && s.size) document.body.className = 'size-' + s.size
  })
}

// —— 拖动（左键）：全屏窗口内直接改牛的屏幕坐标 ——
let dragStart = null
let moveAccum = 0

pet.addEventListener('pointerdown', (e) => {
  if (e.button !== 0) return
  dragStart = {
    px: e.clientX,
    py: e.clientY,
    x: state.x,
    by: state.by,
  }
  moveAccum = 0
  pet.setPointerCapture(e.pointerId)
})

pet.addEventListener('pointermove', (e) => {
  if (!dragStart) return
  const dx = e.clientX - dragStart.px
  const dy = e.clientY - dragStart.py
  moveAccum = Math.abs(dx) + Math.abs(dy)
  if (moveAccum > 5) {
    state.dragging = true
    state.x = clampX(dragStart.x + dx)
    state.by = clampBy(dragStart.by - dy)
    applyPosition()
  }
})

pet.addEventListener('pointerup', (e) => {
  if (!dragStart) return
  const wasDrag = state.dragging
  dragStart = null
  state.dragging = false
  try { pet.releasePointerCapture(e.pointerId) } catch (err) {}
  if (!wasDrag) {
    // 没拖动 = 单击 → 触发互动
    playInteraction()
  } else {
    if (!state.interacting) {
      setIdleView(state.idleView)
    }
  }
})

pet.addEventListener('pointercancel', () => {
  dragStart = null
  state.dragging = false
})

// —— 右键菜单 ——
pet.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  if (window.electronAPI) window.electronAPI.showContextMenu()
})

// —— 启动 ——
setIdleView('side')
state.x = clampX(Math.floor(window.innerWidth * 0.72))
state.by = 20
applyPosition()
scheduleTeleport()

window.addEventListener('resize', () => {
  state.x = clampX(state.x)
  state.by = clampBy(state.by)
  applyPosition()
})
