;(function (global) {
  const STORAGE_KEY = 'batcomputer_settings_v1'

  const THEMES = {
    batcave: {
      name: 'Batcave',
      vars: {
        '--yellow': '#ffd000',
        '--yellow-dim': '#a68710',
        '--yellow-glow': '#ffd700',
        '--yellow-rgb': '255, 208, 0',
        '--accent': '#ffd000',
        '--accent-dim': '#a68710',
        '--accent-glow': '#ffd700',
        '--terminal': '#00ff88',
        '--grid-color': 'rgba(245, 197, 24, 0.04)',
        '--black': '#050505',
        '--dark-gray': '#111111'
      }
    },
    oracle: {
      name: 'Nightwing',
      vars: {
        '--yellow': '#00f0ff',
        '--yellow-dim': '#0088aa',
        '--yellow-glow': '#66ffff',
        '--yellow-rgb': '0, 240, 255',
        '--accent': '#00f0ff',
        '--accent-dim': '#0088aa',
        '--accent-glow': '#66ffff',
        '--terminal': '#00ffcc',
        '--grid-color': 'rgba(0, 240, 255, 0.04)',
        '--black': '#030810',
        '--dark-gray': '#0a1520'
      }
    },
    blood: {
      name: 'Red Hood',
      vars: {
        '--yellow': '#ff3b3b',
        '--yellow-dim': '#aa2020',
        '--yellow-glow': '#ff6666',
        '--yellow-rgb': '255, 59, 59',
        '--accent': '#ff3b3b',
        '--accent-dim': '#aa2020',
        '--accent-glow': '#ff6666',
        '--terminal': '#ff8888',
        '--grid-color': 'rgba(255, 59, 59, 0.04)',
        '--black': '#0a0303',
        '--dark-gray': '#1a0808'
      }
    },
    riddler: {
      name: 'Riddler Theme',
      locked: true,
      vars: {
        '--yellow': '#00ff41',
        '--yellow-dim': '#00aa22',
        '--yellow-glow': '#88ff88',
        '--yellow-rgb': '0, 255, 65',
        '--accent': '#00ff41',
        '--accent-dim': '#00aa22',
        '--accent-glow': '#88ff88',
        '--terminal': '#00ff88',
        '--grid-color': 'rgba(0, 255, 65, 0.05)',
        '--black': '#020604',
        '--dark-gray': '#06110a'
      }
    }
  }

  const PROFILES = {
    bruce: { label: 'LEVEL 10 CLEARANCE', level: 10 },
    nightwing: { label: 'LEVEL 8 CLEARANCE', level: 8 },
    robin: { label: 'LEVEL 6 CLEARANCE', level: 6 },
    admin: { label: 'ADMIN OVERRIDE', level: 99 }
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  function save(state) {
    try {
      const payload = {
        theme: state.theme,
        sound: state.sound,
        crt: state.crt,
        profile: state.profile,
        volume: state.volume ?? 1,
        settings: { ...state.settings }
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (_) {}
  }

  function isThemeUnlocked(themeId) {
    const t = THEMES[themeId]
    if (!t) return false
    if (!t?.locked) return true
    const list = global.BatOS?.BatState?.settings?.unlockedThemes
    return Array.isArray(list) && list.includes(themeId)
  }

  function unlockTheme(themeId) {
    if (!THEMES[themeId]) return { ok: false, message: 'Unknown theme.' }
    if (!global.BatOS?.BatState?.settings) return { ok: false, message: 'State not ready.' }
    const s = global.BatOS.BatState.settings
    if (!Array.isArray(s.unlockedThemes)) s.unlockedThemes = []
    if (!s.unlockedThemes.includes(themeId)) s.unlockedThemes.push(themeId)
    save(global.BatOS.BatState)
    global.BatOS?.BatEvents?.emit('theme-unlocked', { theme: themeId, name: THEMES[themeId].name })
    return { ok: true }
  }

  function applyTheme(themeId) {
    const safeId = THEMES[themeId] && isThemeUnlocked(themeId) ? themeId : 'batcave'
    const theme = THEMES[safeId] || THEMES.batcave
    const root = document.documentElement
    root.setAttribute('data-theme', safeId)
    Object.entries(theme.vars).forEach(([key, val]) => root.style.setProperty(key, val))
    if (global.BatOS?.BatState) {
      global.BatOS.BatState.theme = safeId
      save(global.BatOS.BatState)
    }
    global.BatOS?.BatEvents?.emit('theme-changed', { theme: safeId, name: theme.name })
    if (document.getElementById('desktop')?.classList.contains('active')) {
      global.BatIcons?.scheduleDesktopIconRefresh?.()
    }
    updateTopbarProfile()
    return theme
  }

  function applyProfile(profileId) {
    const p = PROFILES[profileId] || PROFILES.bruce
    if (global.BatOS?.BatState) {
      global.BatOS.BatState.profile = profileId
      save(global.BatOS.BatState)
    }
    updateTopbarProfile(p)
    global.BatOS?.BatEvents?.emit('profile-changed', { profile: profileId, ...p })
  }

  function updateTopbarProfile(p) {
    const prof = p || PROFILES[global.BatOS?.BatState?.profile] || PROFILES.bruce
    const el = document.getElementById('clearance-label')
    if (el) {
      el.textContent = prof.label
      el.style.color = prof.level >= 10 ? 'var(--accent)' : prof.level >= 8 ? 'var(--cyan)' : '#888'
    }
  }

  function hydrate(state) {
    if (!state) return
    if (!Array.isArray(state.settings?.unlockedThemes) && global.BatOS?.BatState?.settings) {
      global.BatOS.BatState.settings.unlockedThemes = []
    }
    applyTheme(state.theme || 'batcave')
    if (state.crt) global.BatOS?.BatFX?.setCRT(true)
    if (state.sound === false && global.BatOS?.BatState) global.BatOS.BatState.sound = false
    if (state.settings) Object.assign(global.BatOS.BatState.settings, state.settings)
    global.BatOS?.BatFX?.syncFxVisibility()
    applyProfile(state.profile || 'bruce')
  }

  function init() {
    const saved = load()
    if (saved && global.BatOS) {
      const merged = { ...global.BatOS.BatState.settings, ...saved.settings }
      if (merged.oracleApiKey && !merged.groqApiKey) {
        merged.groqApiKey = merged.oracleApiKey
      }
      Object.assign(global.BatOS.BatState, {
        theme: saved.theme || 'batcave',
        sound: saved.sound !== false,
        crt: !!saved.crt,
        profile: saved.profile || 'bruce',
        volume: saved.volume ?? 1,
        settings: merged
      })
    }
    if (!global.BatOS?.BatState?.theme) {
      global.BatOS.BatState.theme = 'batcave'
    }
    hydrate(global.BatOS.BatState)
  }

  global.BatTheme = {
    THEMES,
    PROFILES,
    load,
    save,
    applyTheme,
    applyProfile,
    hydrate,
    init,
    updateTopbarProfile,
    isThemeUnlocked,
    unlockTheme
  }
})(window)
