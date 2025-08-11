const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: (systemName) => ipcRenderer.invoke('select-folder', systemName),
  selectMednafenExec: () => ipcRenderer.invoke('select-mednafen-exec'),
  scanFolder: (systemName) => ipcRenderer.invoke('scan-folder', systemName),
  getGames: () => ipcRenderer.invoke('get-games'),
  removeGamesByIds: (ids) => ipcRenderer.invoke('remove-games-by-ids', ids),
  setMednafenPath: (p) => ipcRenderer.invoke('set-mednafen-path', p),
  getMednafenPath: () => ipcRenderer.invoke('get-mednafen-path'),
  runGame: (p) => ipcRenderer.invoke('run-game', p),
  onRunError: (cb) => ipcRenderer.on('run-error', (e, msg) => cb(msg)),
  onRunClosed: (cb) => ipcRenderer.on('run-closed', (e, code) => cb(code)),
  setDarkModeState: (state) => ipcRenderer.invoke('set-dark-mode-state', state),
  getDarkModeState: () => ipcRenderer.invoke('get-dark-mode-state'),
  getSystemFolders: () => ipcRenderer.invoke('get-system-folders')
});