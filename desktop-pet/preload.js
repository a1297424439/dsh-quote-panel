const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  setIgnoreMouseEvents: (ignore) => ipcRenderer.send('set-ignore-mouse-events', ignore),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  quitApp: () => ipcRenderer.send('quit-app'),
  getInitialState: () => ipcRenderer.invoke('get-initial-state'),
  onStocksUpdate: (cb) => ipcRenderer.on('stocks-update', (event, payload) => cb(payload)),
  onStocksChanged: (cb) => ipcRenderer.on('stocks-changed', (event, list) => cb(list)),
  onSizeChanged: (cb) => ipcRenderer.on('size-changed', (event, size) => cb(size)),
  onAlwaysOnTopChanged: (cb) => ipcRenderer.on('always-on-top-changed', (event, v) => cb(v)),
})
