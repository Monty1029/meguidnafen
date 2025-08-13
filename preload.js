const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  selectFolder: (systemName) => ipcRenderer.invoke('select-folder', systemName),
  getSystemFolders: () => ipcRenderer.invoke('get-system-folders'),
  selectMednafenExec: () => ipcRenderer.invoke('select-mednafen-exec'),
  scanFolder: (systemName) => ipcRenderer.invoke('scan-folder', systemName),
  getGames: () => ipcRenderer.invoke('get-games'),
  removeGamesByIds: (gameIds) => ipcRenderer.invoke('remove-games-by-ids', gameIds),
  getMednafenPath: () => ipcRenderer.invoke('get-mednafen-path'),
  runGame: (gamePath) => ipcRenderer.invoke('run-game', gamePath),
  setDarkModeState: (state) => ipcRenderer.invoke('set-dark-mode-state', state),
  getDarkModeState: () => ipcRenderer.invoke('get-dark-mode-state'),
  onRunError: (callback) => ipcRenderer.on('run-error', (event, ...args) => callback(...args)),
  onRunClosed: (callback) => ipcRenderer.on('run-closed', (event, ...args) => callback(...args)),
  saveGameInfo: (gameId, metadata) => ipcRenderer.invoke('save-game-info', gameId, metadata),
  selectCoverArt: (gameName) => ipcRenderer.invoke('select-cover-art', gameName),
});