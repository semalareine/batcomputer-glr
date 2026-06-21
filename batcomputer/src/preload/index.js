import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const batBrowser = {
  create: (bounds, url) => ipcRenderer.invoke('bat-browser:create', { bounds, url }),
  setBounds: (id, bounds) => ipcRenderer.send('bat-browser:set-bounds', id, bounds),
  navigate: (id, url) => ipcRenderer.send('bat-browser:navigate', id, url),
  destroy: (id) => ipcRenderer.invoke('bat-browser:destroy-sync', id),
  destroyAll: () => ipcRenderer.invoke('bat-browser:destroy-all-sync'),
  goBack: (id) => ipcRenderer.send('bat-browser:go-back', id),
  goForward: (id) => ipcRenderer.send('bat-browser:go-forward', id),
  reload: (id) => ipcRenderer.send('bat-browser:reload', id),
  onUrl: (id, cb) => {
    const ch = `bat-browser:url:${id}`
    ipcRenderer.removeAllListeners(ch)
    ipcRenderer.on(ch, (_, url) => cb(url))
  },
  onLoading: (id, cb) => {
    const ch = `bat-browser:loading:${id}`
    ipcRenderer.removeAllListeners(ch)
    ipcRenderer.on(ch, (_, loading) => cb(loading))
  }
}

const oracleChat = (messages, apiKey) => ipcRenderer.invoke('oracle-chat', { messages, apiKey })

const appControl = {
  quit: () => ipcRenderer.send('app:quit')
}

const api = { batBrowser, oracleChat, appControl }

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
