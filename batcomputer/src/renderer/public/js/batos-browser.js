;(function (global) {
  const { BatAudio } = global.BatOS
  const DEFAULT_URL = 'https://www.google.com'

  function normalizeUrl(raw) {
    let u = (raw || '').trim()
    if (!u) return DEFAULT_URL
    if (/^https?:\/\//i.test(u)) return u
    if (/^about:/i.test(u)) return u
    if (/[\w-]+\.[\w.-]+/.test(u) && !u.includes(' ')) return `https://${u}`
    return `https://www.google.com/search?q=${encodeURIComponent(u)}`
  }

  function getBrowserApi() {
    return (
      global.api?.batBrowser ||
      (global.parent !== global && global.parent?.api?.batBrowser) ||
      global.top?.api?.batBrowser
    )
  }

  function getFrameBounds(el) {
    const r = el.getBoundingClientRect()
    return {
      x: Math.round(r.left),
      y: Math.round(r.top),
      width: Math.max(Math.round(r.width), 200),
      height: Math.max(Math.round(r.height), 200)
    }
  }

  function openBrowser(initialUrl = DEFAULT_URL) {
    const startUrl = normalizeUrl(initialUrl)
    const body = `
        <div class="browser-panel">
            <div class="browser-toolbar">
                <button type="button" class="browser-nav-btn" id="browser-back" title="Back">◀</button>
                <button type="button" class="browser-nav-btn" id="browser-fwd" title="Forward">▶</button>
                <button type="button" class="browser-nav-btn" id="browser-refresh" title="Reload">↻</button>
                <input type="text" id="browser-url" value="${startUrl}" spellcheck="false" autocomplete="off" />
                <button type="button" class="btn-cyan" id="browser-go">GO</button>
            </div>
            <div class="browser-status" id="browser-status">INITIALIZING SECURE CHANNEL…</div>
            <div class="browser-frame-wrap" id="browser-frame-wrap">
                <webview id="browser-webview" class="browser-webview"
                    src="${startUrl}"
                    partition="persist:batnet-browser"></webview>
            </div>
        </div>`

    if (typeof createWindow !== 'function') return
    BatAudio.windowOpen()
    createWindow({
      title: 'BAT-NET BROWSER',
      appId: 'browser',
      width: 960,
      height: 680,
      body,
      onCreated: (winId, win) => initBrowser(winId, win, startUrl)
    })
  }

  function initBrowser(winId, win, initialUrl = DEFAULT_URL) {
    const urlInput = win.querySelector('#browser-url')
    const statusEl = win.querySelector('#browser-status')
    const frameWrap = win.querySelector('#browser-frame-wrap')
    let webview = win.querySelector('#browser-webview')
    const api = getBrowserApi()
    const useWebview = webview && typeof webview.loadURL === 'function'
    let destroyed = false

    const setStatus = (text, cls) => {
      statusEl.textContent = text
      statusEl.className = 'browser-status' + (cls ? ` ${cls}` : '')
    }

    const syncUrl = (url) => {
      if (url && url !== 'about:blank') urlInput.value = url
    }

    const navigate = (raw) => {
      const url = normalizeUrl(raw)
      urlInput.value = url
      setStatus('LOADING…', 'is-loading')
      if (useWebview && webview) {
        webview.loadURL(url)
      } else if (win._browserViewId && api) {
        api.navigate(win._browserViewId, url)
      }
      BatAudio.click()
    }

    const fitWebview = () => {
      if (!webview || !frameWrap || destroyed) return
      const r = frameWrap.getBoundingClientRect()
      const w = Math.max(Math.round(r.width), 200)
      const h = Math.max(Math.round(r.height), 200)
      webview.style.width = `${w}px`
      webview.style.height = `${h}px`
    }

    const syncBrowserViewBounds = () => {
      if (destroyed || !win._browserViewId || !api || !frameWrap) return
      api.setBounds(win._browserViewId, getFrameBounds(frameWrap))
    }

    win.querySelector('#browser-go').onclick = () => navigate(urlInput.value)
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') navigate(urlInput.value)
    })

    win.querySelector('#browser-back').onclick = () => {
      if (useWebview && webview?.canGoBack?.()) webview.goBack()
      else if (win._browserViewId && api) api.goBack(win._browserViewId)
      BatAudio.click()
    }
    win.querySelector('#browser-fwd').onclick = () => {
      if (useWebview && webview?.canGoForward?.()) webview.goForward()
      else if (win._browserViewId && api) api.goForward(win._browserViewId)
      BatAudio.click()
    }
    win.querySelector('#browser-refresh').onclick = () => {
      if (useWebview && webview) webview.reload()
      else if (win._browserViewId && api) api.reload(win._browserViewId)
      BatAudio.click()
    }

    if (useWebview) {
      const installSameWindowLinks = () => {
        if (destroyed || !webview) return
        try {
          webview
            .executeJavaScript(
              `(function(){if(window.__batSameWindowLinks)return;window.__batSameWindowLinks=true;try{window.open=function(u){if(u)location.href=u;return null}}catch{};document.addEventListener('click',function(e){var a=e.target&&e.target.closest?e.target.closest('a'):null;if(!a)return;var href=a.href;if(!href)return;var t=(a.getAttribute('target')||'').toLowerCase();if(t==='_blank'){e.preventDefault();location.href=href}},true)})()`,
              true
            )
            .catch(() => {})
        } catch {}
      }

      webview.addEventListener('dom-ready', () => {
        if (destroyed) return
        fitWebview()
        installSameWindowLinks()
        setStatus('SECURE · CONNECTED', 'is-ready')
      })
      webview.addEventListener('did-start-loading', () => setStatus('LOADING…', 'is-loading'))
      webview.addEventListener('did-stop-loading', () => {
        setStatus('SECURE · CONNECTED', 'is-ready')
        try {
          syncUrl(webview.getURL())
        } catch (_) {}
        fitWebview()
        installSameWindowLinks()
      })
      webview.addEventListener('did-navigate', (e) => {
        syncUrl(e.url)
        installSameWindowLinks()
      })
      webview.addEventListener('did-navigate-in-page', (e) => {
        syncUrl(e.url)
        installSameWindowLinks()
      })
      webview.addEventListener('did-fail-load', (e) => {
        if (e.errorCode === -3) return
        setStatus(`ERROR ${e.errorCode}`, 'is-error')
      })

      const ro = new ResizeObserver(() => fitWebview())
      ro.observe(frameWrap)
      ro.observe(win)
      win._browserResizeObs = ro
      requestAnimationFrame(() => requestAnimationFrame(fitWebview))
    } else if (api) {
      webview?.remove()
      webview = null

      const placeholder = document.createElement('div')
      placeholder.className = 'browser-fallback-msg'
      placeholder.textContent = 'Establishing external uplink…'
      frameWrap.appendChild(placeholder)

      const mountView = async () => {
        if (destroyed || !document.getElementById(winId)) return
        const res = await api.create(getFrameBounds(frameWrap), initialUrl)
        if (destroyed || !document.getElementById(winId)) {
          if (res?.ok && res.id) await api.destroy(res.id).catch(() => {})
          return
        }
        if (!res?.ok) {
          placeholder.textContent = 'Browser uplink failed. Restart Batcomputer.'
          setStatus('OFFLINE', 'is-error')
          return
        }
        win._browserViewId = res.id
        placeholder.remove()
        setStatus('SECURE · CONNECTED', 'is-ready')
        syncBrowserViewBounds()

        api.onUrl?.(res.id, (url) => syncUrl(url))
        api.onLoading?.(res.id, (loading) => {
          setStatus(
            loading ? 'LOADING…' : 'SECURE · CONNECTED',
            loading ? 'is-loading' : 'is-ready'
          )
        })
      }

      mountView()

      const ro = new ResizeObserver(() => syncBrowserViewBounds())
      ro.observe(frameWrap)
      ro.observe(win)
      win._browserResizeObs = ro
    } else {
      setStatus('BROWSER API UNAVAILABLE', 'is-error')
    }

    win._browserCleanup = async () => {
      destroyed = true
      if (win._browserResizeObs) {
        win._browserResizeObs.disconnect()
        win._browserResizeObs = null
      }

      const viewId = win._browserViewId
      win._browserViewId = null
      if (viewId && api?.destroy) {
        try {
          await api.destroy(viewId)
        } catch (_) {}
      }

      if (webview) {
        try {
          webview.stop?.()
          webview.loadURL?.('about:blank')
        } catch (_) {
          try {
            webview.src = 'about:blank'
          } catch (_) {}
        }
        try {
          webview.remove()
        } catch (_) {}
        webview = null
      }
      if (frameWrap) frameWrap.innerHTML = ''
    }
  }

  global.BatApps = global.BatApps || {}
  global.BatApps.openBrowser = openBrowser
  global.openBrowser = openBrowser
})(window)
