let windowCount = 0
let activeWindow = null
let dragState = null
let resizeState = null
let windowZ = 500

const bootLines = [
  'INITIALIZING BATCOMPUTER OS v10.0...',
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  'BIOS: OK                    | UPTIME: 0s',
  'SECURITY PROTOCOL: ACTIVE   | ENCRYPTION: AES-512',
  'QUANTUM CORE: ONLINE        | NEURAL NET: STANDBY',
  '',
  'Loading kernel modules...',
  '  [OK] bat_core.ko',
  '  [OK] justice_protocol.ko',
  '  [OK] batwing_telemetry.ko',
  '  [OK] batcave_environment.ko',
  '  [OK] rogues_gallery_db.ko',
  '  [OK] forensic_analysis.ko',
  '',
  'Establishing secure connection to Justice League network...',
  '  Connection encrypted via quantum key distribution',
  '  Satellite uplink: STABLE',
  '',
  'Identity verification...',
  '  BIOMETRIC SCAN: COMPLETE',
  '  RETINAL PATTERN: VERIFIED',
  '  VOICE PRINT: CONFIRMED',
  '',
  '  ACCESS GRANTED - WELCOME BACK, BRUCE WAYNE',
  '',
  'Starting desktop environment...'
]

const LOGIN_USER = 'bruce'
const LOGIN_PASS = 'gotham'

const loginScanMessages = [
  'VERIFYING OPERATOR CREDENTIALS...',
  'SCANNING BIOMETRIC HASH...',
  'DECRYPTING WAYNE PROTOCOL KEY...',
  'CROSS-REFERENCING ROGUES DATABASE...',
  'RETINAL PATTERN: MATCH',
  'VOICE PRINT: STANDBY',
  'ACCESS LEVEL 10: CONFIRMED'
]

function setLoginStatus(text, className = '') {
  const el = document.getElementById('login-status')
  el.textContent = text
  el.className = 'login-status' + (className ? ` ${className}` : '')
}

function startLoginScan(callback) {
  let i = 0
  setLoginStatus(loginScanMessages[0], 'scanning')
  const btn = document.querySelector('.login-btn')
  btn.disabled = true

  const interval = setInterval(() => {
    i++
    if (i < loginScanMessages.length) {
      setLoginStatus(loginScanMessages[i], 'scanning')
    } else {
      clearInterval(interval)
      setLoginStatus('ACCESS GRANTED — INITIALIZING BATCOMPUTER...', 'scanning')
      setTimeout(callback, 600)
    }
  }, 400)
}

function proceedAfterLogin() {
  document.getElementById('login-screen').classList.add('hidden')
  document.getElementById('boot-screen').classList.remove('hidden')
  runBoot()
}

function showLoginScreen() {
  const login = document.getElementById('login-screen')
  login.classList.remove('hidden', 'shake')
  document.getElementById('boot-screen').classList.add('hidden')
  document.getElementById('boot-text').textContent = ''
  document.getElementById('login-form').reset()
  setLoginStatus('AWAITING CREDENTIALS...')
  document.querySelector('.login-btn').disabled = false
  document.getElementById('login-user').focus()
}

function handleLoginSubmit(e) {
  e.preventDefault()
  const user = document.getElementById('login-user').value.trim().toLowerCase()
  const pass = document.getElementById('login-pass').value

  if (user === LOGIN_USER && pass.toLowerCase() === LOGIN_PASS) {
    if (window.BatOS) BatOS.BatAudio.granted()
    startLoginScan(proceedAfterLogin)
    return
  }

  if (window.BatOS) BatOS.BatAudio.denied()
  const login = document.getElementById('login-screen')
  login.classList.remove('shake')
  void login.offsetWidth
  login.classList.add('shake')
  setLoginStatus('ACCESS DENIED — INVALID CREDENTIALS', 'error')
  document.getElementById('login-pass').value = ''
  document.getElementById('login-pass').focus()
}

function initLogin() {
  document.getElementById('login-form').addEventListener('submit', handleLoginSubmit)
  document.getElementById('login-user').focus()
}

function runBoot() {
  const bootText = document.getElementById('boot-text')
  let lineIndex = 0

  function typeLine() {
    if (lineIndex < bootLines.length) {
      bootText.textContent += bootLines[lineIndex] + '\n'
      lineIndex++
      setTimeout(typeLine, 80 + Math.random() * 120)
    } else {
      setTimeout(() => {
        document.getElementById('boot-screen').classList.add('hidden')
        document.getElementById('desktop').classList.add('active')
        if (typeof syncDesktopIcons === 'function') syncDesktopIcons()
        if (window.BatOS?.BatEvents) BatOS.BatEvents.emit('desktop-ready', {})
        setTimeout(() => {
          showNotification('BATCOMPUTER OS v10.0', 'All systems operational. Welcome back.')
        }, 500)
      }, 800)
    }
  }

  typeLine()
}

function updateClock() {
  const now = new Date()
  const time = now.toLocaleTimeString('en-US', { hour12: false })
  const date = now.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
  document.getElementById('clock').textContent = `${date} ${time}`
}
setInterval(updateClock, 1000)
updateClock()

function showNotification(title, message) {
  const notif = document.getElementById('notification')
  notif.innerHTML = `<strong style="color:var(--yellow)">${title}</strong><br><span style="color:#aaa;font-size:11px">${message}</span>`
  notif.classList.add('show')
  setTimeout(() => notif.classList.remove('show'), 3000)
}

function enterFullscreen() {
  const elem = document.documentElement

  if (elem.requestFullscreen) {
    elem.requestFullscreen()
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen()
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen()
  }
}

function showAlert(title, message) {
  document.getElementById('alert-title').textContent = title
  document.getElementById('alert-message').textContent = message
  document.getElementById('alert-overlay').style.display = 'flex'
}

function closeAlert() {
  document.getElementById('alert-overlay').style.display = 'none'
}

function createWindow(options) {
  const id = `window-${++windowCount}`
  const w = options.width || 550
  const h = options.height || 380
  const layoutReserve = window.BatLayout?.getIconColumnWidth?.() ?? 120
  let x = layoutReserve + 20 + (windowCount % 5) * 40
  let y = 50 + (windowCount % 5) * 35

  const win = document.createElement('div')
  win.className = 'window focused'
  win.id = id
  win.style.width = w + 'px'
  win.style.height = h + 'px'
  win.style.left = x + 'px'
  win.style.top = y + 'px'
  if (options.appId) win.dataset.appId = options.appId
  if (options.noSnap) win.dataset.noSnap = '1'

  win.innerHTML = `
    <div class="win-header" data-winid="${id}">
      <div class="win-title">${escapeHtml(options.title || 'WINDOW')}</div>
      <div class="win-controls">
        <button type="button" class="win-btn minimize" data-min-win="${id}" aria-label="Minimize"></button>
        <button type="button" class="win-btn maximize" data-max-win="${id}" aria-label="Maximize"></button>
        <button type="button" class="win-btn close" data-close-win="${id}" aria-label="Close"></button>
      </div>
    </div>
    <div class="win-body" id="${id}-body">${options.body || ''}</div>
    <div class="resize-edge resize-n" data-winid="${id}" data-dir="n"></div>
    <div class="resize-edge resize-s" data-winid="${id}" data-dir="s"></div>
    <div class="resize-edge resize-e" data-winid="${id}" data-dir="e"></div>
    <div class="resize-edge resize-w" data-winid="${id}" data-dir="w"></div>
    <div class="resize-edge resize-ne" data-winid="${id}" data-dir="ne"></div>
    <div class="resize-edge resize-nw" data-winid="${id}" data-dir="nw"></div>
    <div class="resize-edge resize-se" data-winid="${id}" data-dir="se"></div>
    <div class="resize-edge resize-sw" data-winid="${id}" data-dir="sw"></div>
  `

  document.getElementById('window-area').appendChild(win)
  focusWindow(id)

  const titleBar = win.querySelector('.win-title')
  titleBar.addEventListener('mousedown', (e) => {
    focusWindow(id)
    dragState = {
      winId: id,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: parseInt(win.style.left),
      origTop: parseInt(win.style.top)
    }
    e.preventDefault()
  })

  win.querySelectorAll('.resize-edge').forEach((edge) => {
    edge.addEventListener('mousedown', (e) => {
      focusWindow(id)
      resizeState = {
        winId: id,
        dir: edge.dataset.dir || 'se',
        startX: e.clientX,
        startY: e.clientY,
        origLeft: parseInt(win.style.left, 10),
        origTop: parseInt(win.style.top, 10),
        origW: parseInt(win.style.width, 10),
        origH: parseInt(win.style.height, 10)
      }
      e.preventDefault()
      e.stopPropagation()
    })
  })

  win.addEventListener('mousedown', () => focusWindow(id))

  win.querySelector('[data-close-win]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    e.preventDefault()
    window.closeWindow(id)
  })
  win.querySelector('[data-min-win]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    e.preventDefault()
    window.minimizeWindow(id)
  })
  win.querySelector('[data-max-win]')?.addEventListener('click', (e) => {
    e.stopPropagation()
    e.preventDefault()
    window.maximizeWindow(id)
  })

  if (options.onCreated) options.onCreated(id, win)

  if (window.BatLayout) {
    window.BatLayout.onWindowCreated(win, options)
  }

  return id
}

function focusWindow(id) {
  document.querySelectorAll('.window').forEach((w) => w.classList.remove('focused'))
  const win = document.getElementById(id)
  if (win) {
    win.classList.add('focused')
    win.style.zIndex = ++windowZ
    activeWindow = id
  }
}

function closeWindow(id) {
  const win = document.getElementById(id)
  if (win) win.remove()
}

function minimizeWindow(id) {
  const win = document.getElementById(id)
  if (win) {
    win.style.display = 'none'
  }
}

function maximizeWindow(id) {
  const win = document.getElementById(id)
  if (win) {
    if (win.dataset.maximized === 'true') {
      win.style.left = win.dataset.origLeft
      win.style.top = win.dataset.origTop
      win.style.width = win.dataset.origWidth
      win.style.height = win.dataset.origHeight
      win.dataset.maximized = 'false'
    } else {
      win.dataset.origLeft = win.style.left
      win.dataset.origTop = win.style.top
      win.dataset.origWidth = win.style.width
      win.dataset.origHeight = win.style.height
      win.style.left = '0px'
      win.style.top = '32px'
      win.style.width = '100vw'
      win.style.height = 'calc(100vh - 32px)'
      win.dataset.maximized = 'true'
    }
  }
}

window.createWindow = createWindow
window.closeWindow = closeWindow
window.minimizeWindow = minimizeWindow
window.maximizeWindow = maximizeWindow
window.focusWindow = focusWindow

document.addEventListener('mousemove', (e) => {
  if (dragState) {
    const win = document.getElementById(dragState.winId)
    if (win) {
      win.style.left = dragState.origLeft + e.clientX - dragState.startX + 'px'
      win.style.top = Math.max(32, dragState.origTop + e.clientY - dragState.startY) + 'px'
    }
  }
  if (resizeState) {
    const win = document.getElementById(resizeState.winId)
    if (win) {
      const dx = e.clientX - resizeState.startX
      const dy = e.clientY - resizeState.startY
      const dir = resizeState.dir || 'se'
      let left = resizeState.origLeft
      let top = resizeState.origTop
      let width = resizeState.origW
      let height = resizeState.origH

      if (dir.includes('e')) width = resizeState.origW + dx
      if (dir.includes('w')) {
        width = resizeState.origW - dx
        left = resizeState.origLeft + dx
      }
      if (dir.includes('s')) height = resizeState.origH + dy
      if (dir.includes('n')) {
        height = resizeState.origH - dy
        top = resizeState.origTop + dy
      }

      width = Math.max(350, width)
      height = Math.max(200, height)
      if (dir.includes('w')) left = resizeState.origLeft + (resizeState.origW - width)
      if (dir.includes('n')) top = Math.max(32, resizeState.origTop + (resizeState.origH - height))

      win.style.width = width + 'px'
      win.style.height = height + 'px'
      win.style.left = left + 'px'
      win.style.top = top + 'px'
    }
  }
})

document.addEventListener('mouseup', () => {
  if (dragState && window.BatLayout) {
    window.BatLayout.onDragEnd(dragState.winId)
  }
  dragState = null
  resizeState = null
})

document.getElementById('desktop').addEventListener('contextmenu', (e) => {
  if (e.target.closest('.window') || e.target.closest('.topbar')) return
  e.preventDefault()
  const menu = document.getElementById('context-menu')
  menu.style.display = 'block'
  menu.style.left = e.clientX + 'px'
  menu.style.top = e.clientY + 'px'
})

document.addEventListener('click', (e) => {
  if (!e.target.closest('#context-menu')) {
    document.getElementById('context-menu').style.display = 'none'
  }
})

const commandHistory = (window.commandHistory = window.commandHistory || [])
let historyIndex = -1

function openTerminal() {
  const body = `
    <div class="terminal-body" id="term-body">
      <div class="terminal-output" id="term-output">
        <div style="color: var(--yellow); margin-bottom: 10px;">
  ╔══════════════════════════════════════════════╗
  ║  BATCOMPUTER TERMINAL v10.0                  ║
  ║  SECURITY CLEARANCE: LEVEL 10                ║
  ║  ENCRYPTION: QUANTUM-SECURE                  ║
  ╚══════════════════════════════════════════════╝
        </div>
        <div>Type 'help' for available commands.</div>
        <div style="margin-bottom:5px;">━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</div>
      </div>
      <div class="cmd-input-line">
        <span class="prompt-text">BATCOMPUTER:/root$&nbsp;</span>
        <input type="text" class="cmd-input" id="cmd-input" autofocus spellcheck="false" autocomplete="off">
      </div>
    </div>
  `

  createWindow({
    title: 'TERMINAL',
    appId: 'terminal',
    width: 600,
    height: 400,
    body: body,
    onCreated: (id) => {
      setTimeout(() => {
        const input = document.getElementById('cmd-input')
        if (input) {
          input.addEventListener('keydown', handleCommand)
          input.focus()
        }
      }, 100)
    }
  })
}

function handleCommand(e) {
  if (e.key === 'Enter') {
    const input = e.target
    const cmd = input.value.trim()
    if (cmd) {
      commandHistory.unshift(cmd)
      historyIndex = -1
      executeCommand(cmd)
    }
    input.value = ''
  } else if (e.key === 'ArrowUp') {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++
      e.target.value = commandHistory[historyIndex]
    }
  } else if (e.key === 'ArrowDown') {
    if (historyIndex > 0) {
      historyIndex--
      e.target.value = commandHistory[historyIndex]
    } else {
      historyIndex = -1
      e.target.value = ''
    }
  }
}

function appendOutput(html, className) {
  const output = document.getElementById('term-output')
  if (!output) return
  const div = document.createElement('div')
  div.className = `cmd-line ${className || ''}`
  div.innerHTML = html
  output.appendChild(div)
  const termBody = document.getElementById('term-body')
  if (termBody) termBody.scrollTop = termBody.scrollHeight
}

function executeCommand(cmd) {
  const prompt = window.BatOS?.BatFS?.getPrompt?.() || 'BATCOMPUTER:/root$'
  appendOutput(`<span class="prompt-text">${prompt}</span> ${escapeHtml(cmd)}`)

  const parts = cmd.split(/\s+/)
  const command = parts[0].toLowerCase()
  const args = parts.slice(1)

  switch (command) {
    case 'help':
      showHelp()
      break
    case 'clear':
      document.getElementById('term-output').innerHTML = ''
      break
    case 'whoami':
      appendOutput('bruce_wayne // BATMAN // CLASSIFIED', 'success')
      appendOutput('Clearance: Level 10 - Maximum Security', 'info')
      break
    case 'date':
      appendOutput(new Date().toString(), 'info')
      break
    case 'batstatus':
      showBatStatus()
      break
    case 'scan':
      scanCommand(args)
      break
    case 'matrix':
      matrixEffect()
      break
    case 'alert':
      showAlert(
        '⚠ SYSTEM ALERT',
        args.length
          ? args.join(' ')
          : 'Intrusion detected in sector 7-G. All security protocols engaged.'
      )
      break
    case 'access':
      accessCommand(args)
      break
    case 'reboot':
      rebootSystem()
      break
    case 'ls':
      listFiles(args[0])
      break
    case 'cat':
      catCommand(args[0])
      break
    case 'ping':
      pingCommand(args[0] || 'batcave.wayne-enterprises.local')
      break
    case 'netstat':
      netstatCommand()
      break
    case 'encrypt':
      encryptCommand(args.join(' '))
      break
    case 'decrypt':
      decryptCommand(args.join(' '))
      break
    case 'track':
    case 'locate':
      trackCommand(args.join(' '))
      break
    case 'rogue':
      rogueCommand(args[0])
      break
    case 'joker':
      appendOutput(
        '<span style="color:#00ff00">⚠ WARNING: Joker protocols activated</span>',
        'warning'
      )
      appendOutput('All security systems heightened to MAXIMUM.', 'warning')
      break
    case 'alfred':
      appendOutput('Connecting to Alfred Pennyworth...', 'info')
      setTimeout(
        () =>
          appendOutput(
            'ALFRED: "Master Bruce, I hope you\'re not neglecting dinner again."',
            'success'
          ),
        1000
      )
      break
    case 'batmobile':
      batmobileStatus()
      break
    case 'echo':
      appendOutput(escapeHtml(args.join(' ')), '')
      break
    case 'cowsay':
      batCowSay(args.join(' ') || "I'm Batman")
      break
    case 'uptime':
      appendOutput('up 42 days, 7 hours, 13 minutes', 'info')
      break
    case 'neofetch':
      neoFetch()
      break
    case 'cls':
      document.getElementById('term-output').innerHTML = ''
      break
    default:
      appendOutput(
        `Command not found: ${escapeHtml(command)}. Type 'help' for available commands.`,
        'error'
      )
      document.getElementById('window-' + windowCount)?.classList.add('access-denied-flash')
      setTimeout(() => {
        document.getElementById('window-' + windowCount)?.classList.remove('access-denied-flash')
      }, 500)
  }
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function showHelp() {
  const cmds = [
    ['help', 'Show this help message'],
    ['clear/cls', 'Clear terminal screen'],
    ['whoami', 'Display current user identity'],
    ['date', 'Show current date and time'],
    ['uptime', 'Show system uptime'],
    ['batstatus', 'Display Batcomputer system status'],
    ['scan [target]', 'Run security scan on target'],
    ['matrix', 'Toggle matrix rain effect'],
    ['alert [message]', 'Trigger system alert'],
    ['access [target]', 'Attempt access to secure area'],
    ['ls [path]', 'List directory contents'],
    ['cat [file]', 'Display file contents'],
    ['touch [file]', 'Create empty file'],
    ['mkdir [dir]', 'Create directory'],
    ['rm [path]', 'Remove file or directory'],
    ['cd [dir]', 'Change working directory'],
    ['pwd', 'Print working directory'],
    ['nano [file]', 'Edit file in popup editor'],
    ['tree', 'Display filesystem hierarchy'],
    ['find [name]', 'Search files and folders'],
    ['history', 'Show command history'],
    ['open [app]', 'Open an OS application'],
    ['mission', 'Receive random mission briefing'],
    ['detective [sample]', 'Analyze evidence sample'],
    ['hack [target]', 'Simulate intrusion sequence'],
    ['weather', 'Gotham weather report'],
    ['fortune', 'Random Batman quote'],
    ['ping [host]', 'Ping remote host'],
    ['netstat', 'Show network connections'],
    ['encrypt [text]', 'Encrypt a message'],
    ['decrypt [hash]', 'Attempt decryption'],
    ['track [target]', 'Track target location'],
    ['rogue [name]', 'View rogue gallery file'],
    ['joker', '⚠ Joker protocol'],
    ['alfred', 'Contact Alfred'],
    ['batmobile', 'Check Batmobile status'],
    ['echo [text]', 'Print text'],
    ['cowsay [text]', 'Bat-cow say'],
    ['neofetch', 'System info display'],
    ['reboot', 'Reboot Batcomputer']
  ]

  let out = '<span style="color:var(--yellow)">AVAILABLE COMMANDS:</span>\n'
  out += '<span style="color:#666">────────────────────────────────────</span>\n'
  cmds.forEach(([cmd, desc]) => {
    out += `  <span style="color:#00ff00">${cmd.padEnd(20)}</span> ${desc}\n`
  })
  out += '<span style="color:#666">────────────────────────────────────</span>'
  appendOutput(out)
}

function showBatStatus() {
  const out = `
<span style="color:var(--yellow);font-size:14px">╔══════════════════════════════════════╗
║     BATCOMPUTER SYSTEM STATUS        ║
╚══════════════════════════════════════╝</span>

<span style="color:#00ff00">● QUANTUM PROCESSOR</span>    OPERATIONAL
<span style="color:#00ff00">● NEURAL NETWORK</span>       ONLINE - 99.97% ACCURACY
<span style="color:#00ff00">● SATELLITE UPLINK</span>     ACTIVE - 14 SATELLITES
<span style="color:#00ff00">● DATABASE</span>               4.2PB - ROGUES, FORENSICS, INTEL
<span style="color:#00ff00">● SECURITY</span>               MAXIMUM - QUANTUM ENCRYPTED
<span style="color:#00ff00">● BATWING TELEMETRY</span>      SYNCED
<span style="color:#00ff00">● JUSTICE LEAGUE LINK</span>    CONNECTED
<span style="color:#00ff00">● BATCAVE SENSORS</span>        ALL ACTIVE

<span style="color:var(--yellow)">System integrity: 100%</span>
<span style="color:var(--yellow)">Last maintenance: 6 hours ago</span>
`
  appendOutput(out)
}

function scanCommand(args) {
  const target = args[0] || 'GOTHAM_SECTOR_7'
  appendOutput(
    `Initiating deep scan of <span style="color:var(--yellow)">${escapeHtml(target)}</span>...`
  )

  const steps = [
    '[████████████████████████░░░░░░░░] 65%',
    '[████████████████████████████░░░░] 85%',
    '[████████████████████████████████] 100%'
  ]

  let i = 0
  const interval = setInterval(() => {
    if (i < steps.length) {
      appendOutput(steps[i], 'info')
      i++
    } else {
      clearInterval(interval)
      appendOutput(``, '')
      appendOutput(`<span style="color:#00ff00">SCAN COMPLETE</span>`)
      appendOutput(`Threats found: ${Math.floor(Math.random() * 5)}`)
      appendOutput(`Anomalies detected: ${Math.floor(Math.random() * 3) + 1}`)
      appendOutput(`All data logged to secure database.`, 'info')
    }
  }, 600)
}

function matrixEffect() {
  const body = document.getElementById('term-body')
  if (!body) return

  let canvas = body.querySelector('#matrix-canvas')
  if (canvas && canvas.style.display === 'block') {
    canvas.remove()
    body.style.position = ''
    return
  }

  canvas = document.createElement('canvas')
  canvas.id = 'matrix-canvas'
  canvas.style.display = 'block'
  canvas.style.position = 'absolute'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.opacity = '0.3'
  canvas.style.pointerEvents = 'none'
  body.appendChild(canvas)
  body.style.position = 'relative'

  canvas.width = canvas.parentElement.offsetWidth
  canvas.height = canvas.parentElement.offsetHeight

  const ctx = canvas.getContext('2d')
  const fontSize = 14
  const columns = Math.floor(canvas.width / fontSize)
  const drops = new Array(columns).fill(1)
  const chars =
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'

  function drawMatrix() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0F0'
    ctx.font = fontSize + 'px monospace'

    for (let i = 0; i < drops.length; i++) {
      const text = chars[Math.floor(Math.random() * chars.length)]
      ctx.fillStyle = Math.random() > 0.98 ? '#f5c518' : '#00ff00'
      ctx.fillText(text, i * fontSize, drops[i] * fontSize)
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0
      }
      drops[i]++
    }

    if (canvas.parentElement && canvas.parentElement.contains(canvas)) {
      requestAnimationFrame(drawMatrix)
    }
  }

  drawMatrix()
  appendOutput(
    '<span style="color:var(--yellow)">Matrix rain toggled ON. Click again to disable.</span>',
    'warning'
  )
}

function accessCommand(args) {
  const target = args[0] || 'mainframe'
  appendOutput(
    `Attempting access to <span style="color:var(--yellow)">${escapeHtml(target)}</span>...`
  )

  setTimeout(() => {
    if (Math.random() > 0.5) {
      appendOutput(`<span style="color:#00ff00">ACCESS GRANTED</span>`)
      appendOutput(`Decryption key applied. Bypassing firewall...`)
      appendOutput(`Secure tunnel established.`, 'success')
    } else {
      appendOutput(`<span style="color:#ff4444">ACCESS DENIED</span>`)
      appendOutput(`Counter-intrusion measures activated!`, 'error')
      appendOutput(`Tracing origin... Just kidding, you're the Bat.`, 'warning')
    }
  }, 1500)
}

function rebootSystem() {
  appendOutput('<span style="color:var(--yellow)">⚠ INITIATING SYSTEM REBOOT...</span>')
  appendOutput('Saving all data...')

  setTimeout(() => appendOutput('Closing all processes...'), 500)
  setTimeout(() => appendOutput('Flushing quantum cache...'), 1000)
  setTimeout(() => appendOutput('Shutting down neural network...'), 1500)
  setTimeout(() => {
    appendOutput('<span style="color:#ff4444">SYSTEM OFFLINE</span>')
    setTimeout(() => {
      document.getElementById('desktop').classList.remove('active')
      document.getElementById('window-area').innerHTML = ''
      windowCount = 0
      showLoginScreen()
    }, 1500)
  }, 2000)
}

function listFiles(path) {
  const files = {
    '/root': [
      { name: 'batcomputer_config.sys', size: '4.2KB', type: 'file' },
      { name: 'justice_league/', size: '--', type: 'dir' },
      { name: 'rogues_gallery.db', size: '1.2GB', type: 'file' },
      { name: 'forensic_reports/', size: '--', type: 'dir' },
      { name: 'wayne_enterprises/', size: '--', type: 'dir' },
      { name: 'encounters.log', size: '847KB', type: 'file' },
      { name: 'batwing_specs.cls', size: '156KB', type: 'file' },
      { name: 'gotham_map.dat', size: '2.1GB', type: 'file' }
    ]
  }

  const items = files[path] || files['/root']
  let out = `<span style="color:var(--yellow)">${escapeHtml(path)}</span>\n`
  items.forEach((item) => {
    const icon = item.type === 'dir' ? '📁' : '📄'
    out += `${icon} ${item.name.padEnd(30)} ${item.size}\n`
  })
  appendOutput(out)
}

function catCommand(file) {
  const files = {
    'batcomputer_config.sys':
      '# Batcomputer OS Configuration\nVERSION=10.0\nSECURITY_LEVEL=10\nENCRYPTION=AES-512\nQUANTUM_CORE=ENABLED\nALFRED_MODE=ON\nJUSTICE_LEAGUE_LINK=TRUE\nBATWING_SYNC=TRUE',
    'encounters.log':
      '[2026-01-15 23:42] Joker - Arkham Asylum - Escaped (Contained)\n[2026-02-03 01:17] Penguin - Iceberg Lounge - Suspicious activity\n[2026-02-28 02:55] Riddler - Gotham Observatory - Riddle left at scene\n[2026-03-14 03:33] Catwoman - Wayne Enterprises - Security breach (non-hostile)\n[2026-04-01 23:59] Scarecrow - Old Gotham Subway - Fear toxin incident'
  }

  if (files[file]) {
    appendOutput(files[file])
  } else if (file) {
    appendOutput(`File not found: ${escapeHtml(file)}`, 'error')
  } else {
    appendOutput('Usage: cat <filename>', 'warning')
  }
}

async function pingCommand(host) {
  appendOutput(`PING ${escapeHtml(host)}: 56 data bytes`)
  for (let i = 0; i < 4; i++) {
    await new Promise((r) => setTimeout(r, 300))
    const ms = Math.floor(Math.random() * 50 + 10)
    appendOutput(`64 bytes from ${escapeHtml(host)}: icmp_seq=${i} ttl=64 time=${ms}ms`)
  }
  appendOutput(`\n--- ${escapeHtml(host)} ping statistics ---`)
  appendOutput('4 packets transmitted, 4 received, 0% packet loss', 'success')
}

function netstatCommand() {
  appendOutput(`Active Connections:
<span style="color:#666">Proto  Local Address          Remote Address           State</span>
TCP    10.0.0.1:443           10.0.0.2:8443            ESTABLISHED
TCP    10.0.0.1:443           10.0.0.3:9001            ESTABLISHED
UDP    10.0.0.1:53            10.0.0.1:53              LISTENING
TCP    10.0.0.1:8080          172.16.0.5:4444          ESTABLISHED
TCP    10.0.0.1:22            0.0.0.0:*                LISTENING
TCP    10.0.0.1:3389          10.0.0.100:54321         TIME_WAIT

<span style="color:#00ff00">All connections encrypted. No unauthorized access detected.</span>`)
}

function encryptCommand(text) {
  if (!text) {
    appendOutput('Usage: encrypt <message>', 'warning')
    return
  }
  const chars = text
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) + 3))
    .join('')
  appendOutput(`Original: ${escapeHtml(text)}`)
  appendOutput(`Encrypted (ROT3): <span style="color:var(--yellow)">${chars}</span>`)
  appendOutput('Note: Real Batcomputer uses quantum encryption.', 'info')
}

function decryptCommand(text) {
  if (!text) {
    appendOutput('Usage: decrypt <encrypted_text>', 'warning')
    return
  }
  const chars = text
    .split('')
    .map((c) => String.fromCharCode(c.charCodeAt(0) - 3))
    .join('')
  appendOutput(`Encrypted: ${escapeHtml(text)}`)
  appendOutput(`Decrypted: <span style="color:#00ff00">${chars}</span>`)
}

function trackCommand(target) {
  if (!target) {
    appendOutput('Usage: track <target_name>', 'warning')
    appendOutput('Examples: track joker, track penguin, track catwoman', 'info')
    return
  }
  appendOutput(`Initiating GPS track on "${escapeHtml(target)}"...`)

  setTimeout(() => {
    const locations = [
      'Docks - Warehouse 4B',
      'Narrows - 3rd Street',
      'Old Subway Tunnels',
      'Abandoned Amusement Park',
      'Arkham Asylum - East Wing'
    ]
    appendOutput(
      `Target located: <span style="color:var(--yellow)">${locations[Math.floor(Math.random() * locations.length)]}</span>`
    )
    appendOutput(`Signal strength: ${(Math.random() * 30 + 70).toFixed(1)}%`)
    appendOutput('Coordinates logged and transmitted to Batwing.', 'success')
  }, 2000)
}

function rogueCommand(name) {
  const rogues = {
    joker:
      'Name: THE JOKER\nReal Name: Unknown\nStatus: AT LARGE\nThreat Level: EXTREME\nLast Sighting: Gotham Amusement Mile\nModus: Chaos, fear toxin, elaborate schemes',
    penguin:
      'Name: THE PENGUIN\nReal Name: Oswald Cobblepot\nStatus: CONTAINED (Iceberg Lounge)\nThreat Level: HIGH\nLast Sighting: East End Docks\nModus: Weapons trafficking, smuggling',
    riddler:
      'Name: THE RIDDLER\nReal Name: Edward Nygma\nStatus: AT LARGE\nThreat Level: HIGH\nLast Sighting: Gotham Observatory\nModus: Puzzles, riddles, psychological warfare',
    catwoman:
      'Name: CATWOMAN\nReal Name: Selina Kyle\nStatus: AT LARGE\nThreat Level: MODERATE\nLast Sighting: Upper East Side\nModus: Burglary, theft (non-violent)',
    bane: 'Name: BANE\nReal Name: Unknown\nStatus: AT LARGE\nThreat Level: EXTREME\nLast Sighting: Pena Duro Prison (breakout)\nModus: Brutal force, Venom enhancement, tactical genius',
    'two-face':
      'Name: TWO-FACE\nReal Name: Harvey Dent\nStatus: CONTAINED (Arkham)\nThreat Level: HIGH\nLast Sighting: Gotham Courthouse\nModus: Coin-flip decisions, duality obsession',
    scarecrow:
      'Name: SCARECROW\nReal Name: Dr. Jonathan Crane\nStatus: AT LARGE\nThreat Level: EXTREME\nLast Sighting: Abandoned Chemical Plant\nModus: Fear toxin, psychological torture'
  }

  if (rogues[name]) {
    appendOutput(rogues[name])
  } else if (name) {
    appendOutput(`No file on "${escapeHtml(name)}" in Rogue Gallery.`, 'warning')
    appendOutput(
      'Known rogues: joker, penguin, riddler, catwoman, bane, two-face, scarecrow',
      'info'
    )
  } else {
    appendOutput('Usage: rogue <name>', 'warning')
    appendOutput(
      'Known rogues: joker, penguin, riddler, catwoman, bane, two-face, scarecrow',
      'info'
    )
  }
}

function batmobileStatus() {
  appendOutput(`
<span style="color:var(--yellow)">╔══════════════════════════════╗
║       BATMOBILE STATUS         ║
╚══════════════════════════════╝</span>

Status: <span style="color:#00ff00">READY</span>
Fuel: 94%
Armor: INTACT
Weapons: ARMED
Stealth Mode: OFF
Location: Batcave - Bay 1
Engine: Jet Turbine - STANDBY

<span style="color:var(--yellow)">Voice command available: "Batmobile, engage."</span>
`)
}

function batCowSay(text) {
  const bat = `
                T\\ T\\
                | \\| \\
                |  |  :
           _____I__I  |
         .'            '.
       .'                '
       |   ..             '
       |  /__.            |
       :.' -'             |
      /__.                |
     /__, \\               |
        |__\\        _|    |
        :  '\\     .'|     |
        |___|_,,,/  |     |    _..--.
     ,--_-   |     /'      \\../ /  /\\\\
    ,'|_ I---|    7    ,,,_/ / ,  / _\\\\
  ,-- 7 \\|  / ___..,,/   /  ,  ,_/   '-----.
 /   ,   \\  |/  ,____,,,__,,__/            '\\
,   ,     \\__,,/                             |
| '.       _..---.._                         !.
! |      .' z_M__s. '.                        |
.:'      | (-_ _--')  :          L            !
.'.       '.  Y    _.'             \\,         :
 .          '-----'                 !          .
 .           /  \\                   .          .
 ${text.padEnd(27)}
`

  appendOutput(bat.replace(/\n/g, '<br>'))
}

function neoFetch() {
  const output =
    '<span style="color:var(--yellow)">' +
    '           _                         _' +
    '<br>' +
    '      _==/          i     i          \\==' +
    '<br>' +
    '    /XX/            |\\___/|            \\XX\\' +
    '<br>' +
    '  /XXXX\\            |XXXXX|            /XXXX\\' +
    '<br>' +
    ' |XXXXXX\\_         _XXXXXXX_         _/XXXXXX|' +
    '<br>' +
    'XXXXXXXXXXXxxxxxxxXXXXXXXXXXXxxxxxxxXXXXXXXXXXX' +
    '<br>' +
    '|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|' +
    '<br>' +
    'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX' +
    '<br>' +
    '|XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX|' +
    '<br>' +
    ' XXXXXX/^^^^^"\\XXXXXXXXXXXXXXXXXXXXX/^^^^^\\XXXXXX' +
    '<br>' +
    '  |XXX|       \\XXX/^^\\XXXXX/^^\\XXX/       |XXX|' +
    '<br>' +
    '    \\XX\\       \\X/    \\XXX/    \\X/       /XX/' +
    '<br>' +
    '       "\\       "      \\X/      "       /"' +
    '<br>' +
    '<br>' +
    '  BATCOMPUTER OS v10.0</span>' +
    '<span style="color:#00ff00">' +
    '<br>' +
    'OS: Batcomputer OS v10.0' +
    '<br>' +
    'Kernel: Quantum-5.15.0-bat' +
    '<br>' +
    'Uptime: 42 days, 7 hours' +
    '<br>' +
    'Shell: batsh 10.0' +
    '<br>' +
    'Resolution: ' +
    window.innerWidth +
    'x' +
    window.innerHeight +
    '<br>' +
    'CPU: Wayne Quantum Core @ 100 THz' +
    '<br>' +
    'Memory: 512 PB / 1024 PB' +
    '<br>' +
    'GPU: Batwing Neural Renderer' +
    '<br>' +
    'Security: MAXIMUM (Level 10)' +
    '<br>' +
    'Theme: Batcave Dark' +
    '</span>';
  appendOutput(output);
}


function openRadar() {
  const body = `
    <div class="radar-container">
      <div class="radar-box">
        <div class="radar-cross-h"></div>
        <div class="radar-cross-v"></div>
        <div class="radar-ring"></div>
        <div class="radar-ring"></div>
        <div class="radar-ring"></div>
        <div class="radar-sweep"></div>
        <div class="radar-dot" style="top:30%;left:60%"></div>
        <div class="radar-dot" style="top:55%;left:25%;animation-delay:0.5s"></div>
        <div class="radar-dot" style="top:70%;left:75%;animation-delay:1s"></div>
      </div>
      <div class="radar-status">
        <div>SECTOR: GOTHAM METROPOLITAN</div>
        <div>RANGE: 25KM</div>
        <div class="blink-text">● LIVE TRACKING ACTIVE</div>
      </div>
    </div>
  `
  createWindow({ title: 'RADAR SCAN', width: 350, height: 450, body })
}

function openSysMon() {
  const body = `
    <div class="sys-mon" id="sysmon-data">
      <h3>SYSTEM RESOURCES</h3>
      <div class="mon-row">
        <div class="mon-label"><span>CPU - QUANTUM CORE 1</span><span id="cpu1-val">67%</span></div>
        <div class="mon-bar"><div class="mon-fill" id="cpu1-bar" style="width:67%"></div></div>
      </div>
      <div class="mon-row">
        <div class="mon-label"><span>CPU - QUANTUM CORE 2</span><span id="cpu2-val">45%</span></div>
        <div class="mon-bar"><div class="mon-fill" id="cpu2-bar" style="width:45%"></div></div>
      </div>
      <div class="mon-row">
        <div class="mon-label"><span>QUANTUM MEMORY</span><span id="mem-val">72%</span></div>
        <div class="mon-bar"><div class="mon-fill" id="mem-bar" style="width:72%"></div></div>
      </div>
      <div class="mon-row">
        <div class="mon-label"><span>NEURAL NETWORK</span><span id="neural-val">89%</span></div>
        <div class="mon-bar"><div class="mon-fill" id="neural-bar" style="width:89%"></div></div>
      </div>
      <div class="mon-row">
        <div class="mon-label"><span>SATELLITE BANDWIDTH</span><span id="sat-val">34%</span></div>
        <div class="mon-bar"><div class="mon-fill" id="sat-bar" style="width:34%"></div></div>
      </div>
      <div class="mon-row">
        <div class="mon-label"><span>BATCAVE POWER</span><span id="pwr-val">91%</span></div>
        <div class="mon-bar"><div class="mon-fill" id="pwr-bar" style="width:91%"></div></div>
      </div>
    </div>
  `

  createWindow({
    title: 'SYSTEM MONITOR',
    width: 400,
    height: 380,
    body: body,
    onCreated: () => {
      setInterval(updateSysMon, 2000)
    }
  })
}

function updateSysMon() {
  const vals = [
    ['cpu1-bar', 'cpu1-val'],
    ['cpu2-bar', 'cpu2-val'],
    ['mem-bar', 'mem-val'],
    ['neural-bar', 'neural-val'],
    ['sat-bar', 'sat-val'],
    ['pwr-bar', 'pwr-val']
  ]

  vals.forEach(([barId, valId]) => {
    const bar = document.getElementById(barId)
    const val = document.getElementById(valId)
    if (bar && val) {
      const newVal = Math.floor(Math.random() * 40 + 30)
      bar.style.width = newVal + '%'
      val.textContent = newVal + '%'

      if (newVal > 80) {
        bar.style.background = 'linear-gradient(90deg, #ff4444, #ff8800)'
      } else {
        bar.style.background = ''
      }
    }
  })
}

function openFiles() {
  const body = `
    <div class="file-browser">
      <div class="fb-path">/root</div>
      <ul class="fb-list">
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/></svg>
          <span class="fb-name">justice_league</span>
          <span class="fb-size">DIR</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/></svg>
          <span class="fb-name">rogues_gallery</span>
          <span class="fb-size">DIR</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/></svg>
          <span class="fb-name">forensic_reports</span>
          <span class="fb-size">DIR</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/></svg>
          <span class="fb-name">wayne_enterprises</span>
          <span class="fb-size">DIR</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/><text x="20" y="24" text-anchor="middle" fill="#f5c518" font-size="12">F</text></svg>
          <span class="fb-name">batcomputer_config.sys</span>
          <span class="fb-size">4.2KB</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/><text x="20" y="24" text-anchor="middle" fill="#f5c518" font-size="12">F</text></svg>
          <span class="fb-name">rogues_gallery.db</span>
          <span class="fb-size">1.2GB</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/><text x="20" y="24" text-anchor="middle" fill="#f5c518" font-size="12">F</text></svg>
          <span class="fb-name">encounters.log</span>
          <span class="fb-size">847KB</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/><text x="20" y="24" text-anchor="middle" fill="#f5c518" font-size="12">F</text></svg>
          <span class="fb-name">batwing_specs.cls</span>
          <span class="fb-size">156KB</span>
        </li>
        <li class="fb-item">
          <svg viewBox="0 0 40 40"><rect x="5" y="8" width="30" height="24" rx="2" stroke="#f5c518" stroke-width="2" fill="none"/><text x="20" y="24" text-anchor="middle" fill="#f5c518" font-size="12">F</text></svg>
          <span class="fb-name">gotham_map.dat</span>
          <span class="fb-size">2.1GB</span>
        </li>
      </ul>
    </div>
  `
  createWindow({ title: 'FILE BROWSER', width: 400, height: 400, body })
}

function openEncounters() {
  const body = `
    <div class="encounter-log">
      <div class="encounter-entry">
        <div class="name"> The Joker</div>
        <div class="status active">● ACTIVE - Arkham Asylum Breakout</div>
        <div style="font-size:11px;color:#888;margin-top:4px">Location: Gotham Amusement Mile | Threat: EXTREME</div>
      </div>
      <div class="encounter-entry">
        <div class="name"> The Penguin</div>
        <div class="status active">● ACTIVE - Weapons Shipment</div>
        <div style="font-size:11px;color:#888;margin-top:4px">Location: East End Docks | Threat: HIGH</div>
      </div>
      <div class="encounter-entry">
        <div class="name"> The Riddler</div>
        <div class="status inactive">○ INACTIVE - Arkham Asylum</div>
        <div style="font-size:11px;color:#888;margin-top:4px">Location: Contained | Threat: HIGH</div>
      </div>
      <div class="encounter-entry">
        <div class="name"> Catwoman</div>
        <div class="status inactive">○ INACTIVE - Unknown</div>
        <div style="font-size:11px;color:#888;margin-top:4px">Location: Upper East Side | Threat: MODERATE</div>
      </div>
      <div class="encounter-entry">
        <div class="name"> Bane</div>
        <div class="status active">● ACTIVE - Unknown Location</div>
        <div style="font-size:11px;color:#888;margin-top:4px">Location: Tracking... | Threat: EXTREME</div>
      </div>
      <div class="encounter-entry">
        <div class="name">🎭 Two-Face</div>
        <div class="status inactive">○ INACTIVE - Arkham Asylum</div>
        <div style="font-size:11px;color:#888;margin-top:4px">Location: Contained | Threat: HIGH</div>
      </div>
    </div>
  `
  createWindow({ title: 'ROGUE GALLERY - ENCOUNTERS', width: 380, height: 450, body })
}

const weaponModels = {
  batarang: {
    name: 'Batarang',
    desc: 'A throwing weapon shaped like a bat, used to disarm enemies or trigger mechanisms remotely. Often equipped with explosive charges or electric shocks.',
    build: (scene) => {
      const group = new THREE.Group()
      const shape = new THREE.Shape()
      shape.moveTo(0, 0.5)
      shape.lineTo(0.4, 0.2)
      shape.lineTo(0.5, 0)
      shape.lineTo(0.2, -0.1)
      shape.lineTo(0, -0.3)
      shape.lineTo(-0.2, -0.1)
      shape.lineTo(-0.5, 0)
      shape.lineTo(-0.4, 0.2)
      shape.lineTo(0, 0.5)
      const geom = new THREE.ExtrudeGeometry(shape, {
        depth: 0.02,
        bevelEnabled: true,
        bevelThickness: 0.01,
        bevelSize: 0.01
      })
      const mat = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.2
      })
      const mesh = new THREE.Mesh(geom, mat)
      mesh.rotation.x = Math.PI / 2
      group.add(mesh)
      return group
    }
  },
  grapple: {
    name: 'Grapple Gun',
    desc: 'High-tensile mono-filament line launcher. Capable of supporting over 350 lbs. Used for rapid vertical ascents and traversal across Gotham rooftops.',
    build: (scene) => {
      const group = new THREE.Group()
      const handle = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8)
      const mat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5 })
      const hMesh = new THREE.Mesh(handle, mat)
      hMesh.rotation.x = Math.PI / 2
      group.add(hMesh)
      const body = new THREE.BoxGeometry(0.1, 0.15, 0.1)
      const bMesh = new THREE.Mesh(body, mat)
      bMesh.position.y = 0.1
      group.add(bMesh)
      return group
    }
  },
  smoke: {
    name: 'Smoke Pellet',
    desc: 'Concussion device that releases a dense, blinding smoke cloud upon impact. Used to disorient enemies and facilitate stealth escapes.',
    build: (scene) => {
      const group = new THREE.Group()
      const geom = new THREE.SphereGeometry(0.15, 16, 16)
      const mat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.2 })
      group.add(new THREE.Mesh(geom, mat))
      return group
    }
  },
  gel: {
    name: 'Explosive Gel',
    desc: 'Malleable adhesive explosive that can be molded into any shape. Remotely detonated via Batcomputer signal. Highly volatile.',
    build: (scene) => {
      const group = new THREE.Group()
      const geom = new THREE.CylinderGeometry(0.15, 0.15, 0.05, 8)
      const mat = new THREE.MeshStandardMaterial({ color: 0x222222 })
      group.add(new THREE.Mesh(geom, mat))
      return group
    }
  }
}

function openWeaponGallery() {
  const body = `
                <div class="weapon-gallery">
                    <div class="weapon-list" id="weapon-list">
                        ${Object.keys(weaponModels)
                          .map(
                            (k) =>
                              `<div class="weapon-item ${k === 'batarang' ? 'active' : ''}" data-id="${k}">${weaponModels[k].name}</div>`
                          )
                          .join('')}
                    </div>
                    <div class="weapon-display">
                        <div class="weapon-3d-container" id="weapon-3d-view">
                            <div class="weapon-loading">INITIALIZING 3D MODULE...</div>
                        </div>
                        <div class="weapon-info">
                            <h3 id="weapon-title">SELECT WEAPON</h3>
                            <p id="weapon-desc">Select an item from the list to view schematics and backstory data.</p>
                        </div>
                    </div>
                </div>
            `
  createWindow({
    title: 'WEAPON GALLERY',
    appId: 'weapons',
    width: 750,
    height: 500,
    body: body,
    onCreated: (id, win) => {
      setTimeout(() => initWeapon3D(id, win), 100)
      win.querySelectorAll('.weapon-item').forEach((item) => {
        item.addEventListener('click', () => {
          win.querySelectorAll('.weapon-item').forEach((i) => i.classList.remove('active'))
          item.classList.add('active')
          loadWeaponModel(item.dataset.id, win)
        })
      })
      loadWeaponModel('batarang', win)
    }
  })
}

function initWeapon3D(winId, win) {
  const container = win.querySelector('#weapon-3d-view')
  if (!container) return

  const w = container.clientWidth
  const h = container.clientHeight

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  const gridHelper = new THREE.GridHelper(4, 20, 0x1a1a1a, 0x0a0a0a)
  scene.add(gridHelper)

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
  camera.position.set(0, 0.5, 1.5)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(window.devicePixelRatio)
  container.appendChild(renderer.domElement)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  scene.add(ambientLight)
  const pointLight = new THREE.PointLight(0xf5c518, 1, 10)
  pointLight.position.set(2, 2, 2)
  scene.add(pointLight)
  const pointLight2 = new THREE.PointLight(0x00ff00, 0.5, 10)
  pointLight2.position.set(-2, 1, -2)
  scene.add(pointLight2)

  weaponGalleryState = {
    scene,
    camera,
    renderer,
    currentWeapon: null,
    rotation: { x: 0.5, y: 0.5 },
    isDragging: false,
    container,
    win
  }

  container.addEventListener('mousedown', () => (weaponGalleryState.isDragging = true))
  window.addEventListener('mouseup', () => {
    if (weaponGalleryState) weaponGalleryState.isDragging = false
  })

  window.addEventListener('mousemove', (e) => {
    if (weaponGalleryState && weaponGalleryState.isDragging) {
      weaponGalleryState.rotation.y += e.movementX * 0.01
      weaponGalleryState.rotation.x += e.movementY * 0.01
    }
  })

  const resizeObserver = new ResizeObserver((entries) => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
  })
  resizeObserver.observe(container)
  weaponGalleryState.resizeObserver = resizeObserver

  function animate() {
    if (!document.getElementById(winId)) {
      resizeObserver.disconnect()
      renderer.dispose()
      return
    }
    requestAnimationFrame(animate)
    if (weaponGalleryState && weaponGalleryState.currentWeapon) {
      weaponGalleryState.currentWeapon.rotation.x = weaponGalleryState.rotation.x
      weaponGalleryState.currentWeapon.rotation.y = weaponGalleryState.rotation.y
    }
    renderer.render(scene, camera)
  }
  animate()
}

function loadWeaponModel(id, win) {
  if (!weaponGalleryState) return
  const { scene, rotation, container } = weaponGalleryState

  if (weaponGalleryState.currentWeapon) {
    scene.remove(weaponGalleryState.currentWeapon)
    weaponGalleryState.currentWeapon.traverse((child) => {
      if (child.geometry) child.geometry.dispose()
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
        else child.material.dispose()
      }
    })
  }

  const loadingEl = container.querySelector('.weapon-loading')
  if (loadingEl) loadingEl.style.display = 'none'

  const titleEl = win.querySelector('#weapon-title')
  const descEl = win.querySelector('#weapon-desc')
  if (titleEl) titleEl.textContent = weaponModels[id].name
  if (descEl) descEl.textContent = weaponModels[id].desc

  const newModel = weaponModels[id].build(scene)
  weaponGalleryState.currentWeapon = newModel
  scene.add(newModel)
  rotation.x = 0.5
  rotation.y = 0.5
}

window.addEventListener('load', () => {
  initLogin()
})
