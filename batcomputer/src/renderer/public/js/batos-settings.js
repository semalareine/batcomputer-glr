;(function (global) {
  const { BatState, BatFX, BatAudio } = global.BatOS

  function openSettings() {
    if (global.BatAudio) global.BatAudio.windowOpen()

    const themes = global.BatTheme.THEMES
    const visibleThemes = Object.entries(themes).filter(([id, t]) => {
      if (!t?.locked) return true
      return global.BatTheme?.isThemeUnlocked?.(id)
    })
    const themeOptions = visibleThemes
      .map(
        ([id, t]) =>
          `<option value="${id}" ${BatState.theme === id ? 'selected' : ''}>${t.name}</option>`
      )
      .join('')

    const profiles = global.BatTheme.PROFILES
    const allProfiles = { ...profiles }
    if (BatState.profile === 'admin') allProfiles.admin = { label: 'ADMIN OVERRIDE', level: 99 }
    const profileOptions = Object.entries(allProfiles)
      .map(
        ([id, p]) =>
          `<option value="${id}" ${BatState.profile === id ? 'selected' : ''}>${p.label}</option>`
      )
      .join('')

    const snapOn = BatState.settings.windowSnap !== false
    const groqKey = BatState.settings.groqApiKey || BatState.settings.oracleApiKey || ''

    const body = `
        <div class="settings-panel glass-panel">
            <h3 class="text-yellow">SYSTEM SETTINGS</h3>
            <label class="setting-row">Color theme
                <select id="set-theme">${themeOptions}</select>
            </label>
            <label class="setting-row">Operator profile
                <select id="set-profile">${profileOptions}</select>
            </label>
            <label class="setting-row"><input type="checkbox" id="set-sound" ${BatState.sound ? 'checked' : ''}/> UI Sounds</label>
            <label class="setting-row"><input type="checkbox" id="set-crt" ${BatState.crt ? 'checked' : ''}/> CRT monitor effect</label>
            <label class="setting-row"><input type="checkbox" id="set-particles" ${BatState.settings.particles ? 'checked' : ''}/> Particle background</label>
            <label class="setting-row"><input type="checkbox" id="set-stream" ${BatState.settings.dataStream ? 'checked' : ''}/> Data stream HUD</label>
            <label class="setting-row"><input type="checkbox" id="set-scanlines" ${BatState.settings.scanlines !== false ? 'checked' : ''}/> Scanlines overlay</label>
            <label class="setting-row"><input type="checkbox" id="set-snap" ${snapOn ? 'checked' : ''}/> Snap windows to layout grid</label>
            <label class="setting-row">Sound volume
                <input type="range" id="set-volume" min="0" max="100" value="${Math.round((BatState.volume ?? 1) * 100)}" />
                <span id="set-volume-label">${Math.round((BatState.volume ?? 1) * 100)}%</span>
            </label>
            <label class="setting-row">Oracle / Groq API key (free Llama)
                <input type="password" id="set-groq-key" placeholder="gsk_…" value="${groqKey}" spellcheck="false" autocomplete="off" style="width:100%;margin-top:4px;background:#000;border:1px solid var(--yellow-dim);color:var(--emerald);padding:6px;font-size:11px;" />
            </label>
            <p class="oracle-hint" style="margin:4px 0 10px;font-size:10px;"><span class="text-cyan">console.groq.com</span> / install <span class="text-cyan">Ollama</span> locally.</p>
            <div class="settings-actions settings-actions-wrap">
                <button type="button" class="btn-cyan" id="set-apply">APPLY</button>
                <button type="button" class="btn-cyan" id="set-fullscreen">FULLSCREEN</button>
                <button type="button" class="btn-cyan" id="set-save-layout">SAVE LAYOUT</button>
                <button type="button" class="btn-cyan" id="set-load-layout">LOAD LAYOUT</button>
            </div>
            <p id="set-status" class="set-status"></p>
        </div>`

    global.createWindow({
      title: 'SETTINGS',
      width: 440,
      height: 520,
      appId: 'settings',
      noSnap: true,
      body,
      onCreated: (id, win) => {
        const status = win.querySelector('#set-status')

        const applyAll = () => {
          const themeId = win.querySelector('#set-theme').value
          const profileId = win.querySelector('#set-profile').value
          BatState.sound = win.querySelector('#set-sound').checked
          BatState.volume = win.querySelector('#set-volume').value / 100
          BatFX.setCRT(win.querySelector('#set-crt').checked)
          BatFX.setParticles(win.querySelector('#set-particles').checked)
          BatFX.setDataStream(win.querySelector('#set-stream').checked)
          BatFX.setScanlines(win.querySelector('#set-scanlines').checked)
          BatState.settings.windowSnap = win.querySelector('#set-snap').checked
          const key = win.querySelector('#set-groq-key').value.trim()
          BatState.settings.groqApiKey = key
          BatState.settings.oracleApiKey = key
          global.BatTheme.applyTheme(themeId)
          global.BatTheme.applyProfile(profileId)
          global.BatOS.persistState()
          if (BatState.settings.windowSnap && global.BatLayout) {
            global.BatLayout.relayoutAll()
          }
          status.textContent = `Applied: ${global.BatTheme.THEMES[themeId].name}`
          status.className = 'set-status text-emerald'
          BatAudio.granted()
          global.BatIcons?.upgradeAllDesktopIcons?.()
          if (typeof showNotification === 'function') {
            showNotification('SETTINGS', 'Configuration saved.')
          }
        }

        win.querySelector('#set-theme').addEventListener('change', applyAll)
        win.querySelector('#set-profile').addEventListener('change', applyAll)
        win.querySelector('#set-sound').addEventListener('change', applyAll)
        win.querySelector('#set-crt').addEventListener('change', applyAll)
        win.querySelector('#set-particles').addEventListener('change', applyAll)
        win.querySelector('#set-stream').addEventListener('change', applyAll)
        win.querySelector('#set-scanlines').addEventListener('change', applyAll)
        win.querySelector('#set-snap').addEventListener('change', applyAll)

        win.querySelector('#set-volume').addEventListener('input', (e) => {
          BatState.volume = e.target.value / 100
          win.querySelector('#set-volume-label').textContent = e.target.value + '%'
          global.BatOS.persistState()
        })

        win.querySelector('#set-apply').addEventListener('click', applyAll)
        win.querySelector('#set-fullscreen').addEventListener('click', () => {
          if (typeof enterFullscreen === 'function') enterFullscreen()
        })

        win.querySelector('#set-save-layout').addEventListener('click', () => {
          const r = global.BatLayout?.saveLayout?.()
          if (r?.ok) {
            status.textContent = `Layout saved (${r.count} windows).`
            status.className = 'set-status text-emerald'
            BatAudio.granted()
          } else {
            status.textContent = r?.message || 'Could not save layout.'
            status.className = 'set-status'
            BatAudio.denied()
          }
        })

        win.querySelector('#set-load-layout').addEventListener('click', async () => {
          const r = await global.BatLayout?.loadLayout?.()
          if (r?.ok) {
            status.textContent = `Loading ${r.count} windows…`
            status.className = 'set-status text-emerald'
            BatAudio.granted()
          } else {
            status.textContent = r?.message || 'Could not load layout.'
            status.className = 'set-status'
            BatAudio.denied()
          }
        })
      }
    })
  }

  global.BatApps.openSettings = openSettings
  global.openSettings = openSettings
})(window)
