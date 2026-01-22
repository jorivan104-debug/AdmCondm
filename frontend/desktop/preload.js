const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  // Expose any Electron APIs needed by the app
  platform: process.platform,
})

