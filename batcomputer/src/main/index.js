import { app, shell, BrowserWindow, BrowserView, ipcMain, session } from 'electron'
import { join } from 'path'
import { readFileSync, existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const browserViews = new Map()

function purgeBrowserViewsOnWindow(win) {
  if (!win || win.isDestroyed()) return
  for (const id of [...browserViews.keys()]) {
    const entry = browserViews.get(id)
    if (entry?.win === win) {
      browserViews.delete(id)
      try {
        if (!entry.view.webContents.isDestroyed()) entry.view.webContents.destroy()
      } catch (_) {}
      try {
        win.removeBrowserView(entry.view)
      } catch (_) {}
    }
  }
  try {
    for (const view of win.getBrowserViews()) {
      try {
        win.removeBrowserView(view)
      } catch (_) {}
      try {
        if (!view.webContents.isDestroyed()) view.webContents.destroy()
      } catch (_) {}
    }
  } catch (_) {}
}

function loadBatcomputerUi(mainWindow) {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    const base = process.env['ELECTRON_RENDERER_URL'].replace(/\/$/, '')
    return mainWindow.loadURL(`${base}/batcomputer.html`)
  }
  const batPath = join(__dirname, '../renderer/batcomputer.html')
  if (existsSync(batPath)) {
    return mainWindow.loadFile(batPath)
  }
  return mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
}

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const OLLAMA_CHAT_URL = 'http://127.0.0.1:11434/api/chat'
const OLLAMA_MODEL = 'llama3.2'

function loadEnvFile() {
  for (const base of [process.cwd(), join(process.cwd(), 'batcomputer'), app.getAppPath()]) {
    const p = join(base, '.env')
    if (!existsSync(p)) continue
    readFileSync(p, 'utf8')
      .split('\n')
      .forEach((line) => {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
        if (m && !process.env[m[1]]) {
          process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
        }
      })
    break
  }
}

function normalizeMessages(messages) {
  return (messages || [])
    .filter((m) => m && m.role && m.content != null)
    .map((m) => ({ role: m.role, content: String(m.content) }))
}

async function chatGroq(messages, apiKey) {
  const res = await fetch(GROQ_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || GROQ_MODEL,
      messages: normalizeMessages(messages),
      max_tokens: 600,
      temperature: 0.7
    })
  })
  const data = await res.json()
  if (!res.ok) {
    return {
      error: 'API_ERROR',
      message: data.error?.message || `Groq HTTP ${res.status}`
    }
  }
  const content = data.choices?.[0]?.message?.content
  return { content: content || '', provider: 'groq' }
}

async function chatOllama(messages) {
  const res = await fetch(OLLAMA_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || OLLAMA_MODEL,
      messages: normalizeMessages(messages),
      stream: false
    })
  })
  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}`)
  }
  const data = await res.json()
  const content = data.message?.content
  if (!content) throw new Error('Empty Ollama response')
  return { content, provider: 'ollama' }
}

function wireOracleIpc() {
  ipcMain.handle('oracle-chat', async (_event, { messages, apiKey }) => {
    const groqKey = (apiKey || process.env.GROQ_API_KEY || '').trim()
    if (groqKey) {
      try {
        return await chatGroq(messages, groqKey)
      } catch (e) {
        return { error: 'API_ERROR', message: e.message || 'Groq request failed' }
      }
    }

    try {
      return await chatOllama(messages)
    } catch (_) {
      return { error: 'NO_PROVIDER', offline: true }
    }
  })
}

function wireAppIpc() {
  ipcMain.on('app:quit', () => {
    app.quit()
  })
}

function wireBrowserIpc() {
  ipcMain.handle('bat-browser:create', async (event, { bounds, url }) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return { ok: false }
    const id = `bv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const view = new BrowserView({
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    win.addBrowserView(view)
    view.setBounds(bounds)
    view.setAutoResize({ width: false, height: false })
    const targetUrl = url || 'https://www.google.com'
    view.webContents.loadURL(targetUrl)

    const sendUrl = () => {
      event.sender.send(`bat-browser:url:${id}`, view.webContents.getURL())
    }
    const sendLoading = (loading) => {
      event.sender.send(`bat-browser:loading:${id}`, loading)
    }

    view.webContents.on('did-start-loading', () => sendLoading(true))
    view.webContents.on('did-stop-loading', () => {
      sendLoading(false)
      sendUrl()
    })
    view.webContents.on('did-navigate', sendUrl)
    view.webContents.on('did-navigate-in-page', sendUrl)
    view.webContents.setWindowOpenHandler(({ url: openUrl }) => {
      view.webContents.loadURL(openUrl)
      return { action: 'deny' }
    })

    browserViews.set(id, { view, win, closed: false })
    return { ok: true, id }
  })

  ipcMain.on('bat-browser:set-bounds', (_, id, bounds) => {
    const entry = browserViews.get(id)
    if (!entry || entry.closed) return
    if (!bounds || bounds.width < 1 || bounds.height < 1) return
    try {
      entry.view.setBounds(bounds)
    } catch (_) {}
  })

  ipcMain.on('bat-browser:navigate', (_, id, url) => {
    const entry = browserViews.get(id)
    if (entry && url) entry.view.webContents.loadURL(url)
  })

  function removeBrowserEntry(id) {
    const entry = browserViews.get(id)
    if (!entry || entry.closed) return
    entry.closed = true
    const { view, win } = entry
    browserViews.delete(id)
    try {
      if (!win.isDestroyed()) {
        view.setBounds({ x: 0, y: 0, width: 0, height: 0 })
        win.removeBrowserView(view)
      }
    } catch (_) {}
    try {
      if (!view.webContents.isDestroyed()) view.webContents.destroy()
    } catch (_) {}
  }

  ipcMain.on('bat-browser:destroy', (event, id) => {
    removeBrowserEntry(id)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) purgeBrowserViewsOnWindow(win)
  })

  ipcMain.on('bat-browser:destroy-all', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) purgeBrowserViewsOnWindow(win)
  })

  ipcMain.handle('bat-browser:destroy-sync', (event, id) => {
    removeBrowserEntry(id)
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) purgeBrowserViewsOnWindow(win)
    return { ok: true }
  })

  ipcMain.handle('bat-browser:destroy-all-sync', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) purgeBrowserViewsOnWindow(win)
    return { ok: true }
  })

  ipcMain.on('bat-browser:go-back', (_, id) => {
    const entry = browserViews.get(id)
    if (entry?.view.webContents.canGoBack()) entry.view.webContents.goBack()
  })

  ipcMain.on('bat-browser:go-forward', (_, id) => {
    const entry = browserViews.get(id)
    if (entry?.view.webContents.canGoForward()) entry.view.webContents.goForward()
  })

  ipcMain.on('bat-browser:reload', (_, id) => {
    const entry = browserViews.get(id)
    if (entry) entry.view.webContents.reload()
  })
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webviewTag: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    purgeBrowserViewsOnWindow(mainWindow)
    mainWindow.show()
  })

  mainWindow.webContents.on('did-finish-load', () => {
    purgeBrowserViewsOnWindow(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  loadBatcomputerUi(mainWindow)
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = [
      'media',
      'geolocation',
      'notifications',
      'fullscreen',
      'pointerLock',
      'clipboard-read'
    ].includes(permission)
    callback(allowed)
  })

  loadEnvFile()
  wireAppIpc()
  wireBrowserIpc()
  wireOracleIpc()

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
