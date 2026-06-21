;(function (global) {
  const { BatEvents, BatAudio, BatFS, BatFX, BatDock } = global.BatOS
  const A = global.BatApps

  const EXTRA_ICONS = [
    ['openOracle', 'Oracle'],
    ['openGothamMap', 'Map'],
    ['openCrack', 'Decrypt'],
    ['openCriminalDB', 'Criminal DB'],
    ['openCameras', 'Cameras'],
    ['openSatellites', 'Satellites'],
    ['openBrowser', 'Browser'],
    ['openDarkWeb', 'Dark Web'],
    ['openEvidence', 'Evidence'],
    ['openBatmobilePanel', 'Batmobile'],
    ['openMedia', 'Media'],
    ['openFacialScan', 'Biometric']
  ]

  function syncDesktopIcons() {
    try {
      global.BatIcons?.scheduleDesktopIconRefresh?.()
    } catch (e) {
      console.warn('syncDesktopIcons:', e)
    }
  }

  function addDesktopIcons() {
    const container = document.querySelector('.desktop-icons')
    if (!container) return

    const missing = EXTRA_ICONS.filter(([fn]) => !container.querySelector(`[ondblclick="${fn}()"]`))
    missing.forEach(([fn, label]) => {
      try {
        if (global.BatIcons?.createExtraDeskIcon) {
          container.appendChild(global.BatIcons.createExtraDeskIcon(fn, label))
        }
      } catch (e) {
        console.warn('Desk icon inject:', fn, e)
      }
    })

    syncDesktopIcons()
  }

  function getBrowserApi() {
    return global.api?.batBrowser || global.parent?.api?.batBrowser
  }

  function getBrowserFrameBounds(win) {
    const frameWrap = win?.querySelector('#browser-frame-wrap')
    if (!frameWrap) return null
    const r = frameWrap.getBoundingClientRect()
    return {
      x: Math.round(r.left),
      y: Math.round(r.top),
      width: Math.max(Math.round(r.width), 200),
      height: Math.max(Math.round(r.height), 200)
    }
  }

  function hideBrowserView(win) {
    const api = getBrowserApi()
    if (!win?._browserViewId || !api?.setBounds) return
    api.setBounds(win._browserViewId, { x: 0, y: 0, width: 0, height: 0 })
  }

  function restoreBrowserView(win) {
    const api = getBrowserApi()
    if (!win?._browserViewId || !api?.setBounds || win.style.display === 'none') return
    const bounds = getBrowserFrameBounds(win)
    if (bounds) api.setBounds(win._browserViewId, bounds)
  }

  function wireWindowControls() {
    if (global.__batWindowControlsWired) return
    global.__batWindowControlsWired = true

    document.addEventListener(
      'click',
      (e) => {
        const closeBtn = e.target.closest('[data-close-win]')
        if (closeBtn) {
          e.preventDefault()
          e.stopPropagation()
          const id = closeBtn.getAttribute('data-close-win')
          if (id && typeof global.closeWindow === 'function') void global.closeWindow(id)
          return
        }
        const minBtn = e.target.closest('[data-min-win]')
        if (minBtn) {
          e.preventDefault()
          e.stopPropagation()
          const id = minBtn.getAttribute('data-min-win')
          if (id && typeof global.minimizeWindow === 'function') global.minimizeWindow(id)
          return
        }
        const maxBtn = e.target.closest('[data-max-win]')
        if (maxBtn) {
          e.preventDefault()
          e.stopPropagation()
          const id = maxBtn.getAttribute('data-max-win')
          if (id && typeof global.maximizeWindow === 'function') global.maximizeWindow(id)
        }
      },
      true
    )
  }

  function patchWindowSystem() {
    if (typeof global.createWindow !== 'function') {
      console.error('[BatOS] createWindow missing — window controls disabled')
      return
    }
    if (global.__batWindowSystemPatched) return
    global.__batWindowSystemPatched = true

    const origCreate = global.createWindow
    const origClose = global.closeWindow
    const origMinimize = global.minimizeWindow
    const origMaximize = global.maximizeWindow

    global.restoreBrowserView = restoreBrowserView
    global.hideBrowserView = hideBrowserView

    global.createWindow = function (options) {
      const id = origCreate(options)
      if (id) {
        BatDock.add(id, options.title || 'WINDOW')
        const win = document.getElementById(id)
        if (win) win.classList.add('window-opening')
      }
      return id
    }

    global.minimizeWindow = function (id) {
      hideBrowserView(document.getElementById(id))
      if (typeof origMinimize === 'function') origMinimize(id)
    }

    global.maximizeWindow = function (id) {
      if (typeof origMaximize === 'function') origMaximize(id)
      const win = document.getElementById(id)
      if (win) restoreBrowserView(win)
    }

    global.closeWindow = async function (id) {
      const w = document.getElementById(id)
      const browserViewId = w?._browserViewId
      const browserApi = getBrowserApi()

      if (browserViewId && browserApi?.setBounds) {
        try {
          browserApi.setBounds(browserViewId, { x: 0, y: 0, width: 0, height: 0 })
        } catch (_) {}
      }

      BatDock.remove(id)
      global.BatLayout?.onWindowClosed?.(id)
      if (typeof origClose === 'function') origClose(id)

      if (!w) return

      try {
        if (w._mapResizeObs) {
          w._mapResizeObs.disconnect()
          w._mapResizeObs = null
          global.BatMap?.destroyMap()
        }
        if (w._invCleanup) w._invCleanup()
        if (w._browserCleanup) await Promise.resolve(w._browserCleanup())
        else if (browserViewId && browserApi?.destroy) await browserApi.destroy(browserViewId)
      } catch (e) {
        console.warn('Window cleanup:', e)
      }
    }
  }

  function exposeGlobals() {
    const apps = global.BatApps || A || {}
    Object.keys(apps).forEach((name) => {
      if (name.startsWith('open') && typeof apps[name] === 'function') {
        global[name] = apps[name]
      }
    })
  }

  function patchFilesystem() {
    global.listFiles = function (path) {
      const target = path || BatFS.cwd
      const items = BatFS.list(target)
      if (items.error) {
        appendOutput(items.error, 'error')
        return
      }
      items.forEach((item) => {
        const tag = item.type === 'dir' ? '[D]' : '[F]'
        appendOutput(`${tag} ${item.rawName}`, 'info')
      })
    }

    global.catCommand = function (file) {
      if (!file) {
        appendOutput('Usage: cat <filename>', 'warning')
        return
      }
      const paths = [BatFS.resolvePath(file), BatFS.resolvePath(file.replace(/\/$/, ''))]
      for (const p of paths) {
        const r = BatFS.read(p)
        if (!r.error) {
          let content = r.content
          if (BatOS.BatState.detective && r.detective) {
            content += '\n\n[DETECTIVE MODE] Hidden metadata: Court of Owls talon mark detected.'
          }
          appendOutput(content)
          return
        }
      }
      appendOutput(`File not found: ${escapeHtml(file)}`, 'error')
    }

    global.rogueCommand = function (name) {
      const r = BatOS.ROGUES[name]
      if (r) {
        appendOutput(`${r.name}\nStatus: ${r.status}\nThreat: ${r.threat}\nLocation: ${r.loc}`)
        BatEvents.emit('locate', { target: name, rogue: r })
      } else if (name) {
        appendOutput(
          `No file on "${escapeHtml(name)}". Known: ${Object.keys(BatOS.ROGUES).join(', ')}`,
          'warning'
        )
      } else {
        appendOutput('Usage: rogue <name>', 'warning')
      }
    }
  }

  function patchCommands() {
    const origScan = global.scanCommand
    const origTrack = global.trackCommand
    const origExecute = global.executeCommand
    const origHelp = global.showHelp

    global.scanCommand = function (args) {
      BatEvents.emit('scan', args[0] || 'GOTHAM_SECTOR_7')
      origScan(args)
    }

    global.trackCommand = function (target) {
      const t = Array.isArray(target) ? target.join(' ') : target
      const key = String(t || '')
        .toLowerCase()
        .replace(/\s+/g, '-')
        .split('-')[0]
      const rogue =
        BatOS.ROGUES[key] ||
        Object.entries(BatOS.ROGUES).find(([k]) => t?.toLowerCase().includes(k))?.[1]
      if (rogue) {
        appendOutput(`Target: ${rogue.name}`, 'info')
        appendOutput(`Location: ${rogue.loc}`, 'success')
        appendOutput(`GPS: ${rogue.lat.toFixed(5)}, ${rogue.lng.toFixed(5)}`, 'info')
        appendOutput(`Threat: ${rogue.threat} | Status: ${rogue.status}`, 'info')
        BatEvents.emit('locate', { target: key, rogue })
        if (!BatMap.getMap() && BatApps.openGothamMap) BatApps.openGothamMap()
        else BatMap.flyToRogue(key)
        BatAudio.radar()
        return
      }
      origTrack(t)
    }

    global.locateCommand = global.trackCommand

    global.executeCommand = function (cmd) {
      const parts = cmd.trim().split(/\s+/)
      const command = parts[0].toLowerCase()
      const args = parts.slice(1)

      const extras = {
        oracle: () => A.openOracle(),
        crack: () => A.openCrack(),
        lockdown: () => A.toggleLockdown(true),
        unlock: () => A.toggleLockdown(false),
        detective: () => {
          if (args.length) global.detectiveAnalyzeCommand?.(args.join(' '))
          else A.toggleDetective()
        },
        settings: () => A.openSettings(),
        map: () => A.openGothamMap(),
        satellites: () => A.openSatellites(),
        cameras: () => A.openCameras(),
        browser: () => A.openBrowser(),
        darkweb: () => A.openDarkWeb(),
        evidence: () => A.openEvidence(),
        board: () => A.openInvestigationBoard(),
        caseboard: () => A.openInvestigationBoard(),
        voice: () => A.toggleVoice(),
        locate: () => global.locateCommand(args)
      }

      if (extras[command]) {
        const prompt = BatFS.getPrompt()
        appendOutput(`<span class="prompt-text">${prompt}</span> ${escapeHtml(cmd)}`)
        extras[command]()
        BatAudio.click()
        return
      }
      origExecute(cmd)
    }

    global.showHelp = function () {
      origHelp()
      appendOutput(
        '\n<span style="color:var(--cyan)">EXTENDED:</span> oracle, crack, lockdown, unlock, detective, settings, map, satellites, cameras, browser, darkweb, evidence, board, voice, locate',
        'info'
      )
    }
  }

  function patchLifecycle() {
    const origProceed = global.proceedAfterLogin
    const origRunBoot = global.runBoot
    const origShowAlert = global.showAlert
    const origShowNotif = global.showNotification
    global.proceedAfterLogin = function () {
      BatAudio.granted()
      origProceed()
    }

    global.runBoot = function () {
      BatAudio.boot()
      origRunBoot()
      const origTypeLineEnd = setInterval(() => {
        const boot = document.getElementById('boot-screen')
        if (boot?.classList.contains('hidden')) {
          clearInterval(origTypeLineEnd)
          BatEvents.emit('desktop-ready', {})
          addDesktopIcons()
          BatDock.init()
          if (!document.getElementById('taskbar-dock')) {
            const dock = document.createElement('div')
            dock.id = 'taskbar-dock'
            document.body.appendChild(dock)
            BatDock.init()
          }
          setTimeout(() => {
            if (Math.random() > 0.7) {
              showNotification('BATCOMPUTER', 'Intrusion monitoring active.')
            }
          }, 2000)
        }
      }, 500)
    }

    global.showAlert = function (title, message) {
      BatAudio.alert()
      origShowAlert(title, message)
    }

    global.showNotification = function (title, message) {
      BatAudio.click()
      origShowNotif(title, message)
    }
  }

  function expandContextMenu() {
    const menu = document.getElementById('context-menu')
    if (!menu) return
    const items = [
      ['Oracle', 'openOracle'],
      ['Gotham Map', 'openGothamMap'],
      ['Criminal DB', 'openCriminalDB'],
      ['Decrypt Tool', 'openCrack'],
      ['Investigation Board', 'openInvestigationBoard']
    ]
    const sep = document.createElement('div')
    sep.className = 'ctx-sep'
    menu.appendChild(sep)
    items.forEach(([label, fn]) => {
      const d = document.createElement('div')
      d.className = 'ctx-item'
      d.textContent = label
      d.onclick = () => global[fn]?.()
      menu.appendChild(d)
    })
  }

  function init() {
    if (!global.api && global.parent?.api) {
      global.api = global.parent.api
    }
    if (global.BatTheme) BatTheme.init()
    BatEvents.on('desktop-ready', () => {
      exposeGlobals()
      syncDesktopIcons()
      const browserApi = global.api?.batBrowser || global.parent?.api?.batBrowser
      browserApi?.destroyAll?.().catch(() => {})
    })
    global.syncDesktopIcons = syncDesktopIcons
    exposeGlobals()
    try {
      patchWindowSystem()
      wireWindowControls()
    } catch (e) {
      console.error('[BatOS] Window system init failed:', e)
    }
    patchFilesystem()
    patchCommands()
    patchLifecycle()
    expandContextMenu()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})(window)
