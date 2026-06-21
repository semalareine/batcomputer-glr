;(function (global) {
  const listeners = {}

  const BatEvents = {
    on(event, fn) {
      ;(listeners[event] ||= []).push(fn)
    },
    emit(event, data) {
      ;(listeners[event] || []).forEach((fn) => fn(data))
      ;(listeners['*'] || []).forEach((fn) => fn(event, data))
    },
    off(event, fn) {
      if (!listeners[event]) return
      listeners[event] = listeners[event].filter((f) => f !== fn)
    }
  }

  const BatState = {
    sound: true,
    crt: false,
    detective: false,
    lockdown: false,
    profile: 'bruce',
    theme: 'batcave',
    volume: 1,
    threat: 'LOW',
    intrusionTimer: null,
    settings: {
      particles: true,
      dataStream: true,
      scanlines: true,
      ambientHum: false,
      windowSnap: true,
      groqApiKey: '',
      unlockedThemes: [],
      savedLayout: null,
      layoutSlots: null
    }
  }

  function persistState() {
    if (global.BatTheme) BatTheme.save(BatState)
  }

  const BatAudio = (() => {
    let ctx = null
    function ac() {
      if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
      return ctx
    }
    function tone(freq, dur, type = 'square', vol = 0.08, ramp = true) {
      if (!BatState.sound) return
      const volScale = BatState.volume ?? 1
      try {
        const c = ac()
        const o = c.createOscillator()
        const g = c.createGain()
        o.type = type
        o.frequency.value = freq
        g.gain.value = vol * volScale
        o.connect(g)
        g.connect(c.destination)
        o.start()
        if (ramp) g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur)
        o.stop(c.currentTime + dur)
      } catch (_) {}
    }
    return {
      click: () => tone(880, 0.04, 'sine', 0.06),
      denied: () => {
        tone(180, 0.15, 'sawtooth', 0.1)
        setTimeout(() => tone(120, 0.2, 'sawtooth', 0.08), 100)
      },
      granted: () => {
        tone(523, 0.08)
        setTimeout(() => tone(784, 0.12), 80)
      },
      boot: () => {
        tone(220, 0.1)
        setTimeout(() => tone(330, 0.1), 100)
        setTimeout(() => tone(440, 0.15), 200)
      },
      alert: () => {
        tone(400, 0.2, 'sawtooth', 0.12)
        setTimeout(() => tone(300, 0.25, 'sawtooth', 0.1), 150)
      },
      radar: () => tone(1200, 0.06, 'sine', 0.04),
      hack: () => tone(600 + Math.random() * 400, 0.03, 'square', 0.03),
      scan: () => {
        tone(800, 0.05)
        setTimeout(() => tone(1000, 0.05), 60)
      },
      windowOpen: () => tone(440, 0.06, 'sine', 0.05),
      lockdown: () => {
        tone(100, 0.4, 'sawtooth', 0.15)
        setTimeout(() => tone(80, 0.5, 'sawtooth', 0.12), 200)
      }
    }
  })()

  const FS_STORAGE_KEY = 'batcomputer_filesystem_v1'
  const LORE_FILE_TEXT = [
    "Hi bats.. let's play a little game :) I have installed malware on your system. Solve the riddles before something interesting might happen... and maybe unlock a nice well-done gift... <?>",
    'https://4xerces.github.io/Riddler_Terminal/',
    "To start with... He is supposed to be no one's son. U might know him as Jason. Who-oh who bats?",
    ' - team meteor://strike '
  ].join('\n\n')
  const LORE_FILE_HTML = `
    <div class="file-viewer-rich-copy">
      <p>Hi bats.. let's play a little game :) I have installed malware on your system. Solve the riddles before something interesting might happen... and maybe unlock a nice well-done gift... &lt;?&gt;</p>
      <p>
        <a
          href="https://4xerces.github.io/Riddler_Terminal/"
          class="file-viewer-link"
          data-open-browser="https://4xerces.github.io/Riddler_Terminal/"
        >https://4xerces.github.io/Riddler_Terminal/</a>
      </p>
      <p>To start with... He is supposed to be no one's son. U might know him as <span class="text-red">Jason</span>. Who-oh who bats?</p>
      <p> - team meteor://strike </p>
    </div>`
  const JASON_TODD_TEXT =
    'Jason Todd (otherwise known as Red Hood) was the second Robin and was taken in and trained by Batman after growing up on the streets. He was captured by the Joker, who beat him badly and caused an explosion that seemingly killed him. Later, he was brought back to life and became the Red Hood, a more violent vigilante who often clashes with Batman because of their different views on justice.'
  const JASON_TODD_HTML = `
    <div class="file-viewer-rich-copy">
      <p>Jason Todd (otherwise known as <span class="text-red">Red Hood</span>) was the second Robin and was taken in and trained by Batman after growing up on the streets. He was captured by the Joker, who beat him badly and caused an explosion that seemingly killed him. Later, he was brought back to life and became the <span class="text-red">Red Hood</span>, a more violent vigilante who often clashes with Batman because of their different views on justice.</p>
    </div>`

  function formatVirtualSize(content) {
    const len = (content || '').length
    if (len < 1024) return `${len}B`
    if (len < 1024 * 1024) return `${(len / 1024).toFixed(1)}KB`
    return `${(len / (1024 * 1024)).toFixed(1)}MB`
  }

  function createLoreFileNode() {
    return {
      type: 'file',
      size: formatVirtualSize(LORE_FILE_TEXT),
      content: LORE_FILE_TEXT,
      richContent: LORE_FILE_HTML
    }
  }

  function createJasonToddFileNode() {
    return {
      type: 'file',
      size: formatVirtualSize(JASON_TODD_TEXT),
      content: JASON_TODD_TEXT,
      richContent: JASON_TODD_HTML
    }
  }

  function ensureLoreEntry() {
    const root = FILE_TREE['/root']
    if (!root?.children) return
    if (!root.children.lore || root.children.lore.type !== 'dir') {
      root.children.lore = { type: 'dir', children: {} }
    }
    const loreDir = root.children.lore
    loreDir.children = loreDir.children || {}
    const loreFile = loreDir.children['<?>']
    if (!loreFile || loreFile.type !== 'file') loreDir.children['<?>'] = createLoreFileNode()
    else {
      loreFile.content = LORE_FILE_TEXT
      loreFile.richContent = LORE_FILE_HTML
      loreFile.size = formatVirtualSize(loreFile.content)
    }

    const jasonToddFile = loreDir.children['Jason Peter Todd']
    if (!jasonToddFile || jasonToddFile.type !== 'file') {
      loreDir.children['Jason Peter Todd'] = createJasonToddFileNode()
    } else {
      jasonToddFile.content = JASON_TODD_TEXT
      jasonToddFile.richContent = JASON_TODD_HTML
      jasonToddFile.size = formatVirtualSize(jasonToddFile.content)
    }
  }

  const FILE_TREE = {
    '/root': {
      type: 'dir',
      children: {
        'readme.txt': { type: 'file', size: '28B', content: 'Welcome to the Batcomputer.' },
        investigations: {
          type: 'dir',
          children: {
            'joker.log': { type: 'file', size: '32B', content: 'Joker sighted near Arkham.' },
            'riddler.log': {
              type: 'file',
              size: '48B',
              content: 'Riddle left at GCPD headquarters.'
            }
          }
        },
        evidence: { type: 'dir', children: {} },
        classified: { type: 'dir', children: {} },
        lore: {
          type: 'dir',
          children: {
            '<?>': createLoreFileNode(),
            'Jason Peter Todd': createJasonToddFileNode()
          }
        },
        'batcomputer_config.sys': {
          type: 'file',
          size: '4.2KB',
          content:
            '# Batcomputer OS Configuration\nVERSION=10.0\nSECURITY_LEVEL=10\nENCRYPTION=AES-512\nQUANTUM_CORE=ENABLED\nALFRED_MODE=ON\nJUSTICE_LEAGUE_LINK=TRUE\nBATWING_SYNC=TRUE\n# CLASSIFIED: oracle_key=0xBAT0'
        },
        'encounters.log': {
          type: 'file',
          size: '847KB',
          content:
            '[2026-01-15 23:42] Joker - Arkham - Escaped (Contained)\n[2026-02-03 01:17] Penguin - Iceberg Lounge\n[2026-02-28 02:55] Riddler - Observatory\n[2026-03-14 03:33] Catwoman - Wayne Enterprises\n[2026-04-01 23:59] Scarecrow - Old Subway'
        },
        'rogues_gallery.db': {
          type: 'file',
          size: '1.2GB',
          content: 'BINARY DATABASE — use rogue <name> or Criminal DB app'
        },
        'batwing_specs.cls': {
          type: 'file',
          size: '156KB',
          content:
            'BATWING MK-VII\nMax speed: Mach 2.4\nStealth coating: ACTIVE\nArmament: Missiles, sonar buoys'
        },
        'gotham_map.dat': {
          type: 'file',
          size: '2.1GB',
          content: 'GEO DATA — open Gotham Map application'
        },
        'case_47b.lore': {
          type: 'file',
          size: '12KB',
          content:
            'CASE FILE #47-B — COURT OF OWLS\nVictim found in Old Gotham. Symbol: owl talon.\nDetective Mode may reveal hidden metadata.',
          detective: true
        },
        justice_league: {
          type: 'dir',
          children: {
            'members.enc': {
              type: 'file',
              size: '2KB',
              content:
                'CLASSIFIED ROSTER\n- Batman (Gotham)\n- Superman (Metropolis)\n- Wonder Woman\n- Flash\n- Green Lantern'
            }
          }
        },
        forensic_reports: {
          type: 'dir',
          children: {
            'fiber_sample_12.txt': {
              type: 'file',
              size: '3KB',
              content:
                'Fiber analysis: synthetic blend, Wayne Tech patent pending.\nConclusion: Possible insider access.',
              detective: true
            }
          }
        },
        wayne_enterprises: {
          type: 'dir',
          children: {
            'rd_projects.md': {
              type: 'file',
              size: '8KB',
              content: 'R&D: Applied Sciences division.\nProject: TDK — tactical drone kit.'
            }
          }
        },
        rogues_gallery: {
          type: 'dir',
          children: {
            'joker.intel': {
              type: 'file',
              size: '4MB',
              content:
                'THE JOKER — EXTREME THREAT\nLast: Amusement Mile\nNote: Unpredictable. Do not engage alone.'
            }
          }
        }
      }
    }
  }

  const BatFS = {
    cwd: '/root',

    normalize(path) {
      if (!path || path === '~') return '/root'
      let p = path.replace(/\\/g, '/')
      if (!p.startsWith('/')) p = '/root/' + p
      if (p.endsWith('/') && p.length > 1) p = p.slice(0, -1)
      return p
    },

    resolvePath(path, base) {
      const start = base || BatFS.cwd
      let raw = (path || '').replace(/\\/g, '/')
      if (!raw) return start
      if (raw.startsWith('~')) raw = '/root' + raw.slice(1)
      if (!raw.startsWith('/')) raw = `${start}/${raw}`
      const parts = raw.split('/').filter(Boolean)
      const stack = []
      for (const part of parts) {
        if (part === '.') continue
        if (part === '..') {
          stack.pop()
          continue
        }
        stack.push(part)
      }
      if (!stack.length || stack[0] !== 'root') return '/root/' + stack.join('/')
      return '/' + stack.join('/')
    },

    resolve(path) {
      const abs = BatFS.resolvePath(path)
      const parts = abs.split('/').filter(Boolean)
      let node = FILE_TREE
      let current = ''
      for (const part of parts) {
        current += '/' + part
        if (part === 'root' && parts[0] === 'root') {
          node = FILE_TREE['/root']
          continue
        }
        if (!node || node.type !== 'dir' || !node.children || !node.children[part]) {
          return { error: `No such path: ${current}` }
        }
        node = node.children[part]
      }
      return { node, path: abs }
    },

    resolveParent(path) {
      const abs = BatFS.resolvePath(path)
      const parts = abs.split('/').filter(Boolean)
      if (parts.length <= 1) return { error: 'Cannot modify root' }
      const name = parts.pop()
      const parentPath = '/' + parts.join('/')
      const parent = BatFS.resolve(parentPath)
      if (parent.error) return parent
      if (parent.node.type !== 'dir') return { error: 'Not a directory' }
      return { parent: parent.node, parentPath, name }
    },

    formatSize(content) {
      const len = (content || '').length
      if (len < 1024) return `${len}B`
      return `${(len / 1024).toFixed(1)}KB`
    },

    list(path) {
      const target = path ? BatFS.resolvePath(path) : BatFS.cwd
      const r = BatFS.resolve(target)
      if (r.error) return r
      if (r.node.type !== 'dir') return { error: 'Not a directory' }
      return Object.entries(r.node.children || {}).map(([name, meta]) => ({
        name: name + (meta.type === 'dir' ? '/' : ''),
        size: meta.size || '--',
        type: meta.type,
        rawName: name,
        detective: !!meta.detective
      }))
    },

    read(path) {
      const r = BatFS.resolve(path)
      if (r.error) return r
      if (r.node.type === 'dir') return { error: 'Is a directory' }
      return {
        content: r.node.content || '',
        richContent: r.node.richContent || '',
        path: r.path,
        detective: r.node.detective
      }
    },

    write(path, content) {
      const r = BatFS.resolve(path)
      if (r.error) return r
      if (r.node.type === 'dir') return { error: 'Is a directory' }
      r.node.content = content ?? ''
      delete r.node.richContent
      r.node.size = BatFS.formatSize(r.node.content)
      BatFS.persist()
      return { ok: true, path: r.path }
    },

    touch(name) {
      const parent = BatFS.resolveParent(BatFS.resolvePath(name))
      if (parent.error) return parent
      if (parent.parent.children[parent.name]) {
        return { error: `File already exists: ${parent.name}` }
      }
      parent.parent.children[parent.name] = {
        type: 'file',
        content: '',
        size: '0B'
      }
      BatFS.persist()
      return { ok: true, name: parent.name, path: `${parent.parentPath}/${parent.name}` }
    },

    mkdir(name) {
      const parent = BatFS.resolveParent(BatFS.resolvePath(name))
      if (parent.error) return parent
      if (parent.parent.children[parent.name]) {
        return { error: `Directory already exists: ${parent.name}` }
      }
      parent.parent.children[parent.name] = { type: 'dir', children: {} }
      BatFS.persist()
      return { ok: true, name: parent.name, path: `${parent.parentPath}/${parent.name}` }
    },

    rm(name) {
      const parent = BatFS.resolveParent(BatFS.resolvePath(name))
      if (parent.error) return parent
      if (!parent.parent.children[parent.name]) {
        return { error: `No such file or directory: ${parent.name}` }
      }
      delete parent.parent.children[parent.name]
      BatFS.persist()
      return { ok: true, name: parent.name }
    },

    cd(path) {
      if (!path || path === '~') {
        BatFS.cwd = '/root'
        return { ok: true, cwd: BatFS.cwd }
      }
      if (path === '/') {
        BatFS.cwd = '/root'
        return { ok: true, cwd: BatFS.cwd }
      }
      const target = BatFS.resolvePath(path)
      const r = BatFS.resolve(target)
      if (r.error) return r
      if (r.node.type !== 'dir') return { error: 'Not a directory' }
      BatFS.cwd = r.path
      return { ok: true, cwd: BatFS.cwd }
    },

    pwd() {
      return BatFS.cwd
    },

    getPrompt() {
      const display = BatFS.cwd === '/root' ? '/root' : BatFS.cwd.replace(/^\/root/, '') || '/'
      return `BATCOMPUTER:${display}$`
    },

    find(query) {
      const matches = []
      const q = (query || '').toLowerCase()
      if (!q) return matches

      function walk(node, currentPath) {
        if (node.type === 'file') {
          const base = currentPath.split('/').pop()
          if (base.toLowerCase().includes(q)) matches.push(currentPath)
          return
        }
        Object.entries(node.children || {}).forEach(([name, child]) => {
          const childPath = `${currentPath}/${name}`
          if (name.toLowerCase().includes(q)) matches.push(childPath)
          if (child.type === 'dir') walk(child, childPath)
        })
      }

      walk(FILE_TREE['/root'], '/root')
      return matches
    },

    tree(path) {
      const target = path ? BatFS.resolvePath(path) : BatFS.cwd
      const r = BatFS.resolve(target)
      if (r.error) return r
      const lines = []
      const rootLabel = target === '/root' ? 'root' : target.split('/').pop()

      function walk(node, prefix, name, isLast) {
        const branch = prefix ? (isLast ? '└── ' : '├── ') : ''
        lines.push(`${prefix}${branch}${name}`)
        if (node.type !== 'dir') return
        const children = Object.keys(node.children || {}).sort()
        const nextPrefix = prefix ? prefix + (isLast ? '    ' : '│   ') : ''
        children.forEach((child, i) => {
          walk(node.children[child], nextPrefix, child, i === children.length - 1)
        })
      }

      walk(r.node, '', rootLabel, true)
      return lines
    },

    persist() {
      try {
        localStorage.setItem(FS_STORAGE_KEY, JSON.stringify(FILE_TREE['/root']))
      } catch (_) {}
    },

    loadPersisted() {
      try {
        const raw = localStorage.getItem(FS_STORAGE_KEY)
        if (raw) FILE_TREE['/root'] = JSON.parse(raw)
      } catch (_) {}
    },

    getTree() {
      return FILE_TREE
    }
  }

  BatFS.loadPersisted()
  ensureLoreEntry()

  const ROGUES = {
    joker: {
      name: 'THE JOKER',
      threat: 'EXTREME',
      status: 'AT LARGE',
      loc: 'Coney Island — Amusement Mile',
      lat: 40.5755,
      lng: -73.97
    },
    penguin: {
      name: 'THE PENGUIN',
      threat: 'HIGH',
      status: 'ACTIVE',
      loc: 'Red Hook — East End Docks',
      lat: 40.6782,
      lng: -74.0119
    },
    riddler: {
      name: 'THE RIDDLER',
      threat: 'HIGH',
      status: 'AT LARGE',
      loc: 'Gotham Observatory (AMNH)',
      lat: 40.7813,
      lng: -73.974
    },
    catwoman: {
      name: 'CATWOMAN',
      threat: 'MODERATE',
      status: 'UNKNOWN',
      loc: 'Upper East Side',
      lat: 40.7736,
      lng: -73.9566
    },
    bane: {
      name: 'BANE',
      threat: 'EXTREME',
      status: 'TRACKING',
      loc: 'Financial District',
      lat: 40.7074,
      lng: -74.0113
    },
    'two-face': {
      name: 'TWO-FACE',
      threat: 'HIGH',
      status: 'CONTAINED',
      loc: 'Arkham Island (Roosevelt)',
      lat: 40.7622,
      lng: -73.9499
    },
    scarecrow: {
      name: 'SCARECROW',
      threat: 'EXTREME',
      status: 'AT LARGE',
      loc: 'Ace Chemical — Jersey City',
      lat: 40.7282,
      lng: -74.0776
    }
  }

  const ORACLE_REPLIES = [
    {
      keys: ['status', 'report', 'situation'],
      reply: 'Gotham is stable. 3 active threats in sector 7-G. Recommend radar sweep.'
    },
    {
      keys: ['joker', 'clown'],
      reply: 'Joker activity elevated near Amusement Mile. Counter-terror protocols suggested.'
    },
    {
      keys: ['batwing', 'fly'],
      reply: 'Batwing is fueled and synced. Weather over Gotham: overcast, low visibility.'
    },
    {
      keys: ['alfred', 'tea'],
      reply: 'Alfred reports dinner at 8 PM. He says—and I quote—"Master Bruce, no excuses."'
    },
    {
      keys: ['help', 'commands'],
      reply: 'Try: scan, track, locate, crack, lockdown, detective, oracle, satellites.'
    },
    { keys: ['bruce', 'wayne'], reply: 'Identity confirmed. All systems nominal, Bruce.' },
    {
      keys: ['case', 'owl', 'court'],
      reply: 'Case 47-B flagged. Check case_47b.lore in /root with Detective Mode enabled.'
    }
  ]

  const BatFX = {
    particlesId: null,
    streamId: null,
    humId: null,

    init() {
      BatFX.initParticles()
      BatFX.initDataStream()
    },

    initParticles() {
      const canvas = document.getElementById('fx-particles')
      if (!canvas || !BatState.settings.particles) return
      const ctx = canvas.getContext('2d')
      const resize = () => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
      }
      resize()
      window.addEventListener('resize', resize)
      const pts = Array.from({ length: 60 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2 + 0.5,
        a: Math.random() * 0.6 + 0.15,
        va: Math.random() * 0.008 + 0.002
      }))
      const draw = () => {
        if (
          !BatState.settings.particles ||
          document.getElementById('desktop')?.classList.contains('active') === false
        ) {
          BatFX.particlesId = requestAnimationFrame(draw)
          return
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const theme = document.documentElement.getAttribute('data-theme')
        const yrgb =
          getComputedStyle(document.documentElement).getPropertyValue('--yellow-rgb').trim() ||
          '255, 208, 0'
        if (theme === 'riddler') {
          pts.forEach((p) => {
            p.x += p.vx
            p.y += p.vy
            p.a -= p.va
            if (p.a <= 0.05) p.a = Math.random() * 0.6 + 0.2
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1
            const size = 10 + p.r * 5
            ctx.font = `${size}px 'Share Tech Mono', monospace`
            ctx.fillStyle = `rgba(${yrgb}, ${p.a})`
            ctx.fillText('?', p.x, p.y)
          })
        } else {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.35)'
          pts.forEach((p) => {
            p.x += p.vx
            p.y += p.vy
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1
            ctx.beginPath()
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
            ctx.fill()
          })
        }
        BatFX.particlesId = requestAnimationFrame(draw)
      }
      draw()
    },

    initDataStream() {
      const el = document.getElementById('data-stream')
      if (!el || !BatState.settings.dataStream) return
      const lines = () => {
        const ip = `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
        const hex = Math.random().toString(16).slice(2, 10).toUpperCase()
        return `${new Date().toISOString().slice(11, 19)} | ${ip} | ENC:${Math.floor(Math.random() * 100)}% | 0x${hex}`
      }
      setInterval(() => {
        if (!document.getElementById('desktop')?.classList.contains('active')) return
        const span = document.createElement('div')
        span.className = 'stream-line'
        span.textContent = lines()
        el.appendChild(span)
        if (el.children.length > 8) el.removeChild(el.firstChild)
      }, 1200)
    },

    glitch(el, ms = 400) {
      if (!el) return
      el.classList.add('glitch-active')
      setTimeout(() => el.classList.remove('glitch-active'), ms)
    },

    pulseRadar() {
      document.querySelectorAll('.radar-box').forEach((b) => {
        b.classList.add('radar-pulse')
        setTimeout(() => b.classList.remove('radar-pulse'), 800)
      })
    },

    spikeSysMon() {
      ;['cpu1-bar', 'cpu2-bar', 'neural-bar'].forEach((id) => {
        const bar = document.getElementById(id)
        const val = document.getElementById(id.replace('-bar', '-val'))
        if (bar) {
          bar.style.width = '95%'
          bar.style.background = 'linear-gradient(90deg, var(--red), #ff8800)'
        }
        if (val) val.textContent = '95%'
      })
    },

    syncFxVisibility() {
      const canvas = document.getElementById('fx-particles')
      const stream = document.getElementById('data-stream')
      const scan = document.querySelector('.scanlines')
      if (canvas) canvas.style.display = BatState.settings.particles ? 'block' : 'none'
      if (stream) stream.style.display = BatState.settings.dataStream ? 'block' : 'none'
      if (scan) scan.style.display = BatState.settings.scanlines !== false ? 'block' : 'none'
    },

    setParticles(on) {
      BatState.settings.particles = on
      BatFX.syncFxVisibility()
      persistState()
    },

    setDataStream(on) {
      BatState.settings.dataStream = on
      BatFX.syncFxVisibility()
      persistState()
    },

    setScanlines(on) {
      BatState.settings.scanlines = on
      BatFX.syncFxVisibility()
      persistState()
    },

    setCRT(on) {
      BatState.crt = on
      document.body.classList.toggle('crt-mode', on)
      persistState()
    },

    setDetective(on) {
      BatState.detective = on
      document.getElementById('desktop')?.classList.toggle('detective-mode', on)
      document.querySelectorAll('.fb-item[data-detective="true"]').forEach((el) => {
        el.classList.toggle('detective-clue', on)
      })
      if (typeof showNotification === 'function') {
        showNotification('DETECTIVE MODE', on ? 'Evidence highlights enabled.' : 'Disabled.')
      }
      persistState()
    },

    setLockdown(on) {
      BatState.lockdown = on
      const ov = document.getElementById('lockdown-overlay')
      if (ov) ov.classList.toggle('active', on)
      document.getElementById('desktop')?.classList.toggle('lockdown-active', on)
      if (on) BatAudio.lockdown()
      else BatAudio.granted()
    },

    randomIP() {
      return `10.${Math.floor(Math.random() * 200 + 10)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    },

    militaryTime() {
      return new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
    }
  }

  const BatDock = {
    items: new Map(),
    el: null,
    init() {
      BatDock.el = document.getElementById('taskbar-dock')
    },
    add(winId, title) {
      if (!BatDock.el) BatDock.init()
      if (!BatDock.el || BatDock.items.has(winId)) return
      const btn = document.createElement('button')
      btn.className = 'dock-item'
      btn.dataset.win = winId
      btn.textContent = title.slice(0, 12)
      btn.title = title
      btn.onclick = () => {
        const w = document.getElementById(winId)
        if (!w) return
        if (w.style.display === 'none') w.style.display = 'flex'
        if (typeof focusWindow === 'function') focusWindow(winId)
        if (typeof global.restoreBrowserView === 'function') global.restoreBrowserView(w)
      }
      BatDock.el.appendChild(btn)
      BatDock.items.set(winId, btn)
    },
    remove(winId) {
      const btn = BatDock.items.get(winId)
      if (btn) btn.remove()
      BatDock.items.delete(winId)
    }
  }

  global.BatOS = {
    BatEvents,
    BatAudio,
    BatFS,
    BatState,
    BatFX,
    BatDock,
    ROGUES,
    ORACLE_REPLIES,
    FILE_TREE,
    persistState
  }
})(window)
