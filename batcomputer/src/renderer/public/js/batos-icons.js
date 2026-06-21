;(function (global) {
  const S = (parts) => parts.join('')

  const ICONS = {
    terminal: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect fill="none" height="26" rx="2" stroke="var(--yellow)" stroke-width="1.5" width="36" x="2" y="5"/>',
        '<path d="M8 13 L16 19 L8 25" fill="none" stroke="var(--yellow)" stroke-linecap="round" stroke-width="2"/>',
        '<line stroke="var(--yellow)" stroke-linecap="round" stroke-width="2" x1="19" x2="28" y1="25" y2="25"/>',
        '</svg>'
      ]),
    radar: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<circle cx="20" cy="20" fill="none" r="15" stroke="var(--yellow)" stroke-width="1.5"/>',
        '<circle cx="20" cy="20" fill="none" opacity="0.5" r="10" stroke="var(--yellow)" stroke-width="0.8"/>',
        '<circle cx="20" cy="20" fill="none" opacity="0.3" r="5" stroke="var(--yellow)" stroke-width="0.8"/>',
        '<line opacity="0.4" stroke="var(--yellow)" stroke-width="0.5" x1="20" x2="20" y1="5" y2="35"/>',
        '<line opacity="0.4" stroke="var(--yellow)" stroke-width="0.5" x1="5" x2="35" y1="20" y2="20"/>',
        '<line stroke="var(--yellow)" stroke-linecap="round" stroke-width="2" x1="20" x2="30" y1="20" y2="10"/>',
        '</svg>'
      ]),
    sysmon: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect fill="none" height="30" rx="2" stroke="var(--yellow)" stroke-width="1.5" width="30" x="5" y="5"/>',
        '<rect fill="var(--yellow)" height="10" rx="1" width="4" x="10" y="20"/>',
        '<rect fill="var(--yellow)" height="16" rx="1" width="4" x="18" y="14"/>',
        '<rect fill="var(--yellow)" height="22" rx="1" width="4" x="26" y="8"/>',
        '</svg>'
      ]),
    files: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<path d="M5 10 L5 32 L35 32 L35 14 L22 14 L18 10 Z" fill="none" stroke="var(--yellow)" stroke-linejoin="round" stroke-width="1.5"/>',
        '<line stroke="var(--yellow)" stroke-width="1.5" x1="5" x2="35" y1="14" y2="14"/>',
        '</svg>'
      ]),
    encounters: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect fill="none" height="32" rx="3" stroke="var(--yellow)" stroke-width="1.5" width="32" x="4" y="4"/>',
        '<text fill="var(--yellow)" font-family="monospace" font-size="14" text-anchor="middle" x="20" y="26">?</text>',
        '</svg>'
      ]),
    riddler: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect fill="none" height="32" rx="3" stroke="var(--protocol-green)" stroke-width="1.5" width="32" x="4" y="4"/>',
        '<text fill="var(--protocol-green)" font-family="monospace" font-size="11" text-anchor="middle" x="20" y="25">&lt;?&gt;</text>',
        '<path d="M7 10 L11 10" stroke="var(--protocol-green)" stroke-width="1" opacity="0.7" stroke-linecap="round"/>',
        '<path d="M29 30 L33 30" stroke="var(--protocol-green)" stroke-width="1" opacity="0.7" stroke-linecap="round"/>',
        '</svg>'
      ]),
    weapons: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect fill="none" height="26" rx="2" stroke="var(--yellow)" stroke-width="1.5" width="28" x="6" y="7"/>',
        '<line opacity="0.5" stroke="var(--yellow)" stroke-width="0.8" x1="6" x2="34" y1="11" y2="11"/>',
        '<line stroke="var(--yellow)" stroke-width="1" x1="8" x2="32" y1="30" y2="30"/>',
        '<path d="M20 13 L14 19 L17 19 L15 27 L20 23 L25 27 L23 19 L26 19 Z" fill="var(--yellow)" fill-opacity="0.15" stroke="var(--yellow)" stroke-linejoin="round" stroke-width="1.5"/>',
        '</svg>'
      ]),
    board: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect x="4" y="6" width="32" height="28" rx="2" stroke="var(--yellow)" stroke-width="1.2" fill="none"/>',
        '<circle cx="12" cy="16" r="3" stroke="var(--yellow)" stroke-width="1" fill="var(--yellow)" fill-opacity="0.2"/>',
        '<circle cx="28" cy="14" r="3" stroke="var(--yellow)" stroke-width="1" fill="var(--yellow)" fill-opacity="0.2"/>',
        '<circle cx="20" cy="28" r="3" stroke="var(--yellow)" stroke-width="1" fill="var(--yellow)" fill-opacity="0.15"/>',
        '<line x1="12" y1="16" x2="28" y2="14" stroke="var(--yellow)" stroke-width="0.8" opacity="0.7"/>',
        '<line x1="28" y1="14" x2="20" y2="28" stroke="var(--yellow)" stroke-width="0.8" opacity="0.7"/>',
        '<line x1="12" y1="16" x2="20" y2="28" stroke="var(--yellow)" stroke-width="0.8" opacity="0.5"/>',
        '</svg>'
      ]),
    oracle: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<circle cx="20" cy="20" r="14" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<circle cx="20" cy="20" r="4" fill="var(--yellow)" opacity="0.6"/>',
        '<path d="M20 6 L20 10 M20 30 L20 34 M6 20 L10 20 M30 20 L34 20" stroke="var(--yellow)" stroke-width="1.2" stroke-linecap="round"/>',
        '<path d="M10 10 L13 13 M27 27 L30 30 M30 10 L27 13 M10 30 L13 27" stroke="var(--yellow)" stroke-width="1" opacity="0.7" stroke-linecap="round"/>',
        '</svg>'
      ]),
    map: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<path d="M8 28 L16 22 L24 26 L32 20 L32 32 L8 32 Z" stroke="var(--yellow)" stroke-width="1.5" fill="var(--yellow)" fill-opacity="0.1" stroke-linejoin="round"/>',
        '<circle cx="24" cy="24" r="2.5" fill="var(--yellow)"/>',
        '<path d="M24 24 L28 18" stroke="var(--yellow)" stroke-width="1.2" stroke-linecap="round"/>',
        '</svg>'
      ]),
    crack: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect x="8" y="10" width="24" height="20" rx="2" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<path d="M14 16 L18 22 L16 26 M26 14 L22 20 L24 24" stroke="var(--yellow)" stroke-width="1.3" stroke-linecap="round"/>',
        '<circle cx="20" cy="20" r="3" stroke="var(--yellow)" stroke-width="1" fill="none"/>',
        '</svg>'
      ]),
    criminaldb: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<ellipse cx="20" cy="14" rx="8" ry="9" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<path d="M10 32 C10 26 14 22 20 22 C26 22 30 26 30 32" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<line x1="8" y1="8" x2="32" y2="32" stroke="var(--yellow)" stroke-width="1.2" opacity="0.8"/>',
        '</svg>'
      ]),
    cameras: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect x="6" y="12" width="22" height="16" rx="2" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<path d="M28 18 L34 14 L34 26 L28 22 Z" stroke="var(--yellow)" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
        '<circle cx="17" cy="20" r="4" stroke="var(--yellow)" stroke-width="1.2" fill="none"/>',
        '</svg>'
      ]),
    satellites: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect x="16" y="16" width="8" height="8" stroke="var(--yellow)" stroke-width="1.5" fill="var(--yellow)" fill-opacity="0.2"/>',
        '<path d="M4 20 H12 M28 20 H36 M20 4 V12 M20 28 V36" stroke="var(--yellow)" stroke-width="1.2" stroke-linecap="round"/>',
        '<circle cx="20" cy="20" r="2" fill="var(--yellow)"/>',
        '</svg>'
      ]),
    browser: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<circle cx="20" cy="20" r="14" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<path d="M10 20 H30 M20 10 C24 14 26 17 26 20 C26 23 24 26 20 30 C16 26 14 23 14 20 C14 17 16 14 20 10" stroke="var(--yellow)" stroke-width="1.2" fill="none"/>',
        '</svg>'
      ]),
    darkweb: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<path d="M20 8 C12 8 8 14 8 20 C8 28 12 32 20 32 C28 32 32 28 32 20" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<circle cx="20" cy="20" r="3" fill="var(--yellow)"/>',
        '<path d="M26 12 L32 8 M28 18 L34 18" stroke="var(--yellow)" stroke-width="1.2" stroke-linecap="round"/>',
        '</svg>'
      ]),
    evidence: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<path d="M12 8 L28 8 L32 32 L8 32 Z" stroke="var(--yellow)" stroke-width="1.5" fill="none" stroke-linejoin="round"/>',
        '<circle cx="20" cy="18" r="5" stroke="var(--yellow)" stroke-width="1.2" fill="none"/>',
        '<line x1="14" y1="26" x2="26" y2="26" stroke="var(--yellow)" stroke-width="1"/>',
        '</svg>'
      ]),
    batmobile: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<path d="M6 24 L12 18 L28 18 L34 24 L34 28 L6 28 Z" stroke="var(--yellow)" stroke-width="1.5" fill="var(--yellow)" fill-opacity="0.12" stroke-linejoin="round"/>',
        '<circle cx="12" cy="28" r="3" stroke="var(--yellow)" stroke-width="1.2" fill="none"/>',
        '<circle cx="28" cy="28" r="3" stroke="var(--yellow)" stroke-width="1.2" fill="none"/>',
        '</svg>'
      ]),
    media: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<rect x="8" y="10" width="24" height="20" rx="2" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<path d="M18 16 L26 20 L18 24 Z" fill="var(--yellow)"/>',
        '</svg>'
      ]),
    biometric: () =>
      S([
        '<svg fill="none" viewBox="0 0 40 40" class="desk-icon-svg">',
        '<ellipse cx="20" cy="18" rx="10" ry="12" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<path d="M12 30 Q20 26 28 30" stroke="var(--yellow)" stroke-width="1.5" fill="none"/>',
        '<path d="M14 14 Q20 10 26 14 M14 22 Q20 26 26 22" stroke="var(--yellow)" stroke-width="1" fill="none" opacity="0.7"/>',
        '</svg>'
      ])
  }

  const DESK_ICON_MAP = {
    terminal: 'terminal',
    radar: 'radar',
    sysmon: 'sysmon',
    files: 'files',
    encounters: 'encounters',
    openRiddlerProtocol: 'riddler',
    weapons: 'weapons',
    board: 'board',
    openOracle: 'oracle',
    openGothamMap: 'map',
    openCrack: 'crack',
    openCriminalDB: 'criminaldb',
    openCameras: 'cameras',
    openSatellites: 'satellites',
    openBrowser: 'browser',
    openDarkWeb: 'darkweb',
    openEvidence: 'evidence',
    openBatmobilePanel: 'batmobile',
    openMedia: 'media',
    openFacialScan: 'biometric'
  }

  function render(iconId) {
    const fn = ICONS[iconId]
    return fn ? fn() : ICONS.files()
  }

  function replaceIconSvg(el, iconId) {
    if (!el) return
    el.dataset.icon = iconId
    const existing = el.querySelector('svg')
    const wrap = document.createElement('div')
    wrap.innerHTML = render(iconId)
    const next = wrap.firstElementChild
    if (!next) return
    if (existing) {
      existing.replaceWith(next)
    } else {
      const label = el.querySelector('span')
      if (label) label.insertAdjacentElement('beforebegin', next)
      else el.insertBefore(next, el.firstChild)
    }
  }

  function mountDeskIcon(el, iconId) {
    replaceIconSvg(el, iconId)
  }

  function refreshDesktopIcons() {
    document.querySelectorAll('.desk-icon[data-icon]').forEach((el) => {
      replaceIconSvg(el, el.dataset.icon)
    })
  }

  const STATIC_ICON_MAP = [
    ['openTerminal', 'terminal'],
    ['openRadar', 'radar'],
    ['openSysMon', 'sysmon'],
    ['openFiles', 'files'],
    ['openEncounters', 'encounters'],
    ['openWeaponGallery', 'weapons'],
    ['openInvestigationBoard', 'board']
  ]

  function upgradeStaticIcons() {
    STATIC_ICON_MAP.forEach(([fn, id]) => {
      const el = document.querySelector(
        `.desktop-icons .desk-icon:not([data-extra-icon])[ondblclick="${fn}()"]`
      )
      if (el) replaceIconSvg(el, id)
    })
  }

  function upgradeExtraIcons() {
    document.querySelectorAll('.desktop-icons .desk-icon[data-extra-icon]').forEach((el) => {
      const id =
        el.dataset.icon ||
        DESK_ICON_MAP[el.getAttribute('ondblclick')?.replace(/\(\)$/, '')] ||
        'files'
      replaceIconSvg(el, id)
    })
  }

  function upgradeAllDesktopIcons() {
    upgradeStaticIcons()
    upgradeExtraIcons()
  }

  let refreshTimer = null

  function scheduleDesktopIconRefresh() {
    if (refreshTimer) clearTimeout(refreshTimer)

    const run = () => upgradeAllDesktopIcons()

    const desktop = document.getElementById('desktop')
    if (!desktop?.classList.contains('active')) {
      const onReady = () => {
        global.BatOS?.BatEvents?.off('desktop-ready', onReady)
        scheduleDesktopIconRefresh()
      }
      global.BatOS?.BatEvents?.on('desktop-ready', onReady)
      return
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(run)
    })
    refreshTimer = setTimeout(run, 550)
  }

  function bindDesktopTransitionRefresh() {
    const desktop = document.getElementById('desktop')
    if (!desktop || desktop.dataset.iconRefreshBound) return
    desktop.dataset.iconRefreshBound = '1'
    desktop.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'opacity') upgradeAllDesktopIcons()
    })
  }

  function createExtraDeskIcon(fn, label) {
    const el = document.createElement('div')
    el.className = 'desk-icon'
    el.dataset.extraIcon = '1'
    el.dataset.launcher = fn
    const iconId = DESK_ICON_MAP[fn] || 'files'
    el.dataset.icon = iconId
    el.ondblclick = () => window[fn]?.()
    const span = document.createElement('span')
    span.textContent = label
    el.appendChild(span)
    replaceIconSvg(el, iconId)
    return el
  }

  bindDesktopTransitionRefresh()

  global.BatIcons = {
    ICONS,
    render,
    mountDeskIcon,
    replaceIconSvg,
    refreshDesktopIcons,
    upgradeStaticIcons,
    upgradeExtraIcons,
    upgradeAllDesktopIcons,
    scheduleDesktopIconRefresh,
    initStaticIcons: upgradeAllDesktopIcons,
    createExtraDeskIcon,
    iconForLauncher: (fnName) => DESK_ICON_MAP[fnName] || 'files'
  }
})(window)
