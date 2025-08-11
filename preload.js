const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectMednafenExec: () => ipcRenderer.invoke('select-mednafen-exec'),
  scanFolder: (folder) => ipcRenderer.invoke('scan-folder', folder),
  getGames: () => ipcRenderer.invoke('get-games'),
  removeGame: (id) => ipcRenderer.invoke('remove-game', id),
  setMednafenPath: (p) => ipcRenderer.invoke('set-mednafen-path', p),
  getMednafenPath: () => ipcRenderer.invoke('get-mednafen-path'),
  runGame: (p) => ipcRenderer.invoke('run-game', p),
  onRunError: (cb) => ipcRenderer.on('run-error', (e, msg) => cb(msg)),
  onRunClosed: (cb) => ipcRenderer.on('run-closed', (e, code) => cb(code)),
  getLastRomFolder: () => ipcRenderer.invoke('get-last-rom-folder'),
  setDarkModeState: (state) => ipcRenderer.invoke('set-dark-mode-state', state),
  getDarkModeState: () => ipcRenderer.invoke('get-dark-mode-state')
});