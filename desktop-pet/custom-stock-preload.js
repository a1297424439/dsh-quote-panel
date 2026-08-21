const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('customStockAPI', {
  submit: (text) => ipcRenderer.send('custom-stocks', text),
})
