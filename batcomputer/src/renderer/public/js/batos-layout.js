;(function (global) {
  const GAP = 10
  const TOPBAR = 32
  const DOCK_PAD = 48
  const MIN_W = 350
  const MIN_H = 200
  const GRID_COLS = 2
  const GRID_ROWS = 4
  const SNAP_EXEMPT_APPS = new Set(['settings'])

  const SLOT_IDS = []
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      SLOT_IDS.push(`r${row}c${col}`)
    }
  }

  const TITLE_TO_APP = {
    TERMINAL: 'terminal',
    'RADAR SCAN': 'radar',
    'SYSTEM MONITOR': 'sysmon',
    'FILE BROWSER': 'files',
    'ROGUE GALLERY - ENCOUNTERS': 'encounters',
    'ROGUE GALLERY — ENCOUNTERS': 'encounters',
    'WEAPON GALLERY': 'weapons',
    'INVESTIGATION BOARD': 'board',
    'ORACLE AI': 'oracle',
    'GOTHAM SURVEILLANCE': 'map',
    'DECRYPT INTERFACE': 'crack',
    'BAT-NET BROWSER': 'browser',
    'DARK WEB / ENCRYPTED NET': 'darkweb',
    'SECURITY FEEDS': 'cameras',
    'CRIMINAL DATABASE': 'criminaldb',
    'EVIDENCE ANALYZER': 'evidence',
    'RIDDLER PROTOCOL': 'riddler',
    BATMOBILE: 'batmobile',
    'AUDIO / MEDIA': 'media',
    'SATELLITE FEED': 'satellites',
    SETTINGS: 'settings',
    'BIOMETRIC SCAN': 'biometric'
  }

  const APP_LAUNCHERS = {
    terminal: () => global.openTerminal?.(),
    radar: () => global.openRadar?.(),
    sysmon: () => global.openSysMon?.(),
    files: () => global.openFiles?.(),
    encounters: () => global.openEncounters?.(),
    weapons: () => global.openWeaponGallery?.(),
    board: () => global.openInvestigationBoard?.(),
    oracle: () => global.openOracle?.(),
    map: () => global.openGothamMap?.(),
    crack: () => global.openCrack?.(),
    browser: () => global.openBrowser?.(),
    darkweb: () => global.openDarkWeb?.(),
    cameras: () => global.openCameras?.(),
    criminaldb: () => global.openCriminalDB?.(),
    evidence: () => global.openEvidence?.(),
    riddler: () => global.openRiddlerProtocol?.(),
    batmobile: () => global.openBatmobilePanel?.(),
    media: () => global.openMedia?.(),
    satellites: () => global.openSatellites?.(),
    biometric: () => global.openFacialScan?.()
  }

  function isSnapEnabled() {
    return global.BatOS?.BatState?.settings?.windowSnap !== false
  }

  function isSnapExempt(win) {
    if (!win) return false
    const appId =
      win.dataset.appId || TITLE_TO_APP[win.querySelector('.win-title')?.textContent || '']
    return win.dataset.noSnap === '1' || SNAP_EXEMPT_APPS.has(appId)
  }

  function getIconColumnWidth() {
    const desktop = document.getElementById('desktop')
    const icons = document.querySelector('.desktop-icons')
    if (!desktop || !icons) return 120
    const dRect = desktop.getBoundingClientRect()
    const iRect = icons.getBoundingClientRect()
    return Math.ceil(iRect.right - dRect.left + GAP)
  }

  function getBounds() {
    const desktop = document.getElementById('desktop')
    const reserve = getIconColumnWidth()
    const totalW = desktop?.clientWidth || window.innerWidth
    const w = totalW - reserve
    const h = (desktop?.clientHeight || window.innerHeight) - TOPBAR - DOCK_PAD
    return {
      left: reserve,
      top: TOPBAR,
      width: Math.max(w, 400),
      height: Math.max(h, 240)
    }
  }

  function getVisibleWindows() {
    return [...document.querySelectorAll('#window-area > .window')].filter(
      (w) => w.style.display !== 'none' && w.dataset.maximized !== 'true'
    )
  }

  function getSnapWindows() {
    return getVisibleWindows().filter((w) => !isSnapExempt(w))
  }

  function parseSlotId(slotId) {
    const m = /^r(\d+)c(\d+)$/.exec(slotId || '')
    if (!m) return null
    return { row: parseInt(m[1], 10), col: parseInt(m[2], 10) }
  }

  function computeSlotRect(slotId) {
    const pos = parseSlotId(slotId)
    if (!pos) return null
    const b = getBounds()
    const slotW = Math.floor((b.width - GAP * (GRID_COLS + 1)) / GRID_COLS)
    const slotH = Math.floor((b.height - GAP * (GRID_ROWS + 1)) / GRID_ROWS)
    return {
      left: b.left + GAP + pos.col * (slotW + GAP),
      top: b.top + GAP + pos.row * (slotH + GAP),
      width: Math.max(MIN_W, slotW),
      height: Math.max(MIN_H, slotH),
      slotId
    }
  }

  function applyRect(win, rect) {
    if (!win || win.dataset.maximized === 'true') return
    win.style.left = `${rect.left}px`
    win.style.top = `${rect.top}px`
    win.style.width = `${rect.width}px`
    win.style.height = `${rect.height}px`
    if (rect.slotId) win.dataset.snapSlot = rect.slotId
  }

  function placeSettingsFree(win) {
    const b = getBounds()
    const w = parseInt(win.style.width, 10) || 440
    win.style.left = `${Math.max(b.left, b.left + b.width - w - GAP)}px`
    win.style.top = `${b.top + GAP}px`
    win.dataset.noSnap = '1'
  }

  function getWindowBySlot(slotId) {
    if (!slotId) return null
    return getSnapWindows().find((w) => w.dataset.snapSlot === slotId) || null
  }

  function findFirstFreeSlot() {
    for (const slotId of SLOT_IDS) {
      if (!getWindowBySlot(slotId)) return slotId
    }
    return null
  }

  function applyGeometry(win, geom) {
    if (!win || win.dataset.maximized === 'true') return
    applyRect(win, {
      left: geom.left,
      top: geom.top,
      width: geom.width,
      height: geom.height,
      slotId: geom.slotId || undefined
    })
  }

  function assignWindowToSlot(win, slotId) {
    if (!win || !slotId || !isSnapEnabled() || isSnapExempt(win)) return
    const rect = computeSlotRect(slotId)
    if (!rect) return
    delete win.dataset.layoutRestored
    win.dataset.snapSlot = slotId
    applyRect(win, rect)
    persistSlotMap()
  }

  function clearWindowSlot(win) {
    if (!win) return
    delete win.dataset.snapSlot
    persistSlotMap()
  }

  function getSlotMap() {
    const map = {}
    getSnapWindows().forEach((win) => {
      const slotId = win.dataset.snapSlot
      const appId =
        win.dataset.appId || TITLE_TO_APP[win.querySelector('.win-title')?.textContent || '']
      if (slotId && appId) map[slotId] = appId
    })
    return map
  }

  function persistSlotMap() {
    if (!global.BatOS?.BatState?.settings) return
    global.BatOS.BatState.settings.layoutSlots = getSlotMap()
  }

  function relayoutSlots() {
    if (!isSnapEnabled()) return
    getSnapWindows().forEach((win) => {
      if (win.dataset.layoutRestored === '1') return
      const slotId = win.dataset.snapSlot
      if (!slotId) return
      const rect = computeSlotRect(slotId)
      if (rect) applyRect(win, rect)
    })
  }

  function getWindowCenter(win) {
    return {
      x: parseInt(win.style.left, 10) + parseInt(win.style.width, 10) / 2,
      y: parseInt(win.style.top, 10) + parseInt(win.style.height, 10) / 2
    }
  }

  function getSlotAtPoint(x, y) {
    for (const slotId of SLOT_IDS) {
      const rect = computeSlotRect(slotId)
      if (!rect) continue
      if (
        x >= rect.left &&
        x <= rect.left + rect.width &&
        y >= rect.top &&
        y <= rect.top + rect.height
      ) {
        return slotId
      }
    }
    return null
  }

  function dropWindowIntoSlot(win, targetSlotId) {
    if (!win || !targetSlotId || isSnapExempt(win)) return

    const sourceSlotId = win.dataset.snapSlot || null
    if (sourceSlotId === targetSlotId) {
      assignWindowToSlot(win, targetSlotId)
      return
    }

    const occupant = getWindowBySlot(targetSlotId)
    if (!occupant) {
      assignWindowToSlot(win, targetSlotId)
      return
    }

    if (occupant === win) {
      assignWindowToSlot(win, targetSlotId)
      return
    }

    if (sourceSlotId) {
      assignWindowToSlot(occupant, sourceSlotId)
    } else {
      delete occupant.dataset.snapSlot
    }
    assignWindowToSlot(win, targetSlotId)
  }

  function snapToNearestSlot(win) {
    if (!win || !isSnapEnabled() || isSnapExempt(win)) return
    const { x, y } = getWindowCenter(win)
    const targetSlotId = getSlotAtPoint(x, y) || win.dataset.snapSlot || findFirstFreeSlot()
    if (targetSlotId) dropWindowIntoSlot(win, targetSlotId)
  }

  function resolveAppId(options, win) {
    if (options?.appId) return options.appId
    const title = options?.title || win?.querySelector('.win-title')?.textContent || ''
    return TITLE_TO_APP[title] || null
  }

  function onWindowCreated(win, options) {
    const appId = resolveAppId(options, win)
    if (appId) win.dataset.appId = appId
    if (options?.noSnap || SNAP_EXEMPT_APPS.has(appId)) {
      win.dataset.noSnap = '1'
      placeSettingsFree(win)
      return
    }

    const pending = global._layoutRestorePending?.get(appId)
    if (pending) {
      applyGeometry(win, pending)
      win.dataset.layoutRestored = '1'
      global._layoutRestorePending.delete(appId)
      persistSlotMap()
      return
    }

    if (!isSnapEnabled()) return

    const savedSlots = global.BatOS?.BatState?.settings?.layoutSlots
    if (savedSlots && appId) {
      const savedSlotId = Object.keys(savedSlots).find((slotId) => savedSlots[slotId] === appId)
      if (savedSlotId && !getWindowBySlot(savedSlotId)) {
        assignWindowToSlot(win, savedSlotId)
        return
      }
    }

    const freeSlot = findFirstFreeSlot()
    if (freeSlot) assignWindowToSlot(win, freeSlot)
  }

  function onWindowClosed(winId) {
    const win = document.getElementById(winId)
    if (win) clearWindowSlot(win)
  }

  function onDragEnd(winId) {
    const win = document.getElementById(winId)
    if (win && !isSnapExempt(win)) snapToNearestSlot(win)
  }

  function collectLayout() {
    const windows = getSnapWindows()
      .map((win) => {
        const appId =
          win.dataset.appId || TITLE_TO_APP[win.querySelector('.win-title')?.textContent || '']
        if (!appId || SNAP_EXEMPT_APPS.has(appId)) return null
        return {
          appId,
          left: parseInt(win.style.left, 10) || 0,
          top: parseInt(win.style.top, 10) || 0,
          width: parseInt(win.style.width, 10) || 400,
          height: parseInt(win.style.height, 10) || 300,
          slotId: win.dataset.snapSlot || null
        }
      })
      .filter(Boolean)
    if (!windows.length) return null
    const slots = {}
    windows.forEach((w) => {
      if (w.slotId) slots[w.slotId] = w.appId
    })
    return { version: 3, savedAt: Date.now(), windows, slots }
  }

  function saveLayout() {
    const payload = collectLayout()
    if (!payload) return { ok: false, message: 'No windows to save.' }
    try {
      localStorage.setItem('batcomputer_layout_v3', JSON.stringify(payload))
      if (global.BatOS?.BatState?.settings) {
        global.BatOS.BatState.settings.savedLayout = payload
        global.BatOS.BatState.settings.layoutSlots = payload.slots
        global.BatOS.persistState?.()
      }
      return { ok: true, count: payload.windows.length }
    } catch (e) {
      return { ok: false, message: e.message }
    }
  }

  function nearestSlotForRect(left, top, width, height) {
    const cx = left + width / 2
    const cy = top + height / 2
    return getSlotAtPoint(cx, cy)
  }

  function readSavedPayload() {
    for (const key of ['batcomputer_layout_v3', 'batcomputer_layout_v2', 'batcomputer_layout_v1']) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) return JSON.parse(raw)
      } catch (_) {}
    }
    return global.BatOS?.BatState?.settings?.savedLayout || null
  }

  function normalizeRestoreEntries(payload) {
    if (!payload) return []

    if (payload.version >= 3 && payload.windows?.length) {
      return payload.windows.filter(
        (e) => e.appId && !SNAP_EXEMPT_APPS.has(e.appId) && APP_LAUNCHERS[e.appId]
      )
    }

    if (payload.version === 1 && payload.windows?.length) {
      return payload.windows
        .filter((e) => e.appId && !SNAP_EXEMPT_APPS.has(e.appId) && APP_LAUNCHERS[e.appId])
        .map((e) => ({
          appId: e.appId,
          left: e.left,
          top: e.top,
          width: e.width,
          height: e.height,
          slotId: nearestSlotForRect(e.left, e.top, e.width, e.height)
        }))
    }

    if (payload.slots) {
      return Object.entries(payload.slots)
        .filter(([, appId]) => appId && !SNAP_EXEMPT_APPS.has(appId) && APP_LAUNCHERS[appId])
        .map(([slotId, appId]) => {
          const rect = computeSlotRect(slotId)
          return {
            appId,
            left: rect?.left ?? 0,
            top: rect?.top ?? TOPBAR,
            width: rect?.width ?? 400,
            height: rect?.height ?? 300,
            slotId
          }
        })
    }

    return []
  }

  async function loadLayout() {
    const payload = readSavedPayload()
    const entries = normalizeRestoreEntries(payload)

    if (!entries.length) {
      return { ok: false, message: 'No saved layout found.' }
    }

    const slots = {}
    entries.forEach((e) => {
      if (e.slotId) slots[e.slotId] = e.appId
    })
    if (global.BatOS?.BatState?.settings) {
      global.BatOS.BatState.settings.layoutSlots = slots
    }

    global._layoutRestorePending = new Map(
      entries.map((e) => [
        e.appId,
        {
          left: e.left,
          top: e.top,
          width: e.width,
          height: e.height,
          slotId: e.slotId || undefined
        }
      ])
    )

    const toClose = getVisibleWindows()
    for (const w of toClose) {
      const id = w.id
      if (id && typeof global.closeWindow === 'function') {
        await global.closeWindow(id)
      }
    }

    entries.forEach((entry, i) => {
      setTimeout(() => APP_LAUNCHERS[entry.appId](), i * 120)
    })

    const expected = entries.length
    const finishRestore = () => {
      let matched = 0
      entries.forEach((entry) => {
        const win = [...document.querySelectorAll('#window-area > .window')].find(
          (w) => w.dataset.appId === entry.appId
        )
        if (!win) return
        matched++
        if (win.dataset.layoutRestored !== '1') {
          applyGeometry(win, entry)
          win.dataset.layoutRestored = '1'
        }
      })
      if (matched < expected) {
        setTimeout(finishRestore, 200)
        return
      }
      global._layoutRestorePending = null
      persistSlotMap()
      if (typeof global.showNotification === 'function') {
        global.showNotification('LAYOUT', `Restored ${matched} window(s).`)
      }
    }

    setTimeout(finishRestore, entries.length * 120 + 250)
    return { ok: true, count: entries.length }
  }

  function init() {
    window.addEventListener('resize', () => {
      if (isSnapEnabled()) relayoutSlots()
    })
  }

  global.BatLayout = {
    isSnapEnabled,
    isSnapExempt,
    getIconColumnWidth,
    getBounds,
    onWindowCreated,
    onWindowClosed,
    onDragEnd,
    relayoutSlots,
    relayoutAll: relayoutSlots,
    saveLayout,
    loadLayout,
    SLOT_IDS,
    TITLE_TO_APP,
    init
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})(window)
