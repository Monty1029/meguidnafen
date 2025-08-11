const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Define the root of the project using app.getAppPath()
const PROJECT_ROOT = app.getAppPath();
const USER_DATA_DIR = path.join(PROJECT_ROOT, 'userData');
const STORE_FILE = path.join(USER_DATA_DIR, 'userData.json');

// Ensure the userData directory exists
if (!fs.existsSync(USER_DATA_DIR)) {
  fs.mkdirSync(USER_DATA_DIR);
}

function readStore() {
  try {
    const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8'));
    return {
      games: data.games || [],
      mednafenPath: data.mednafenPath || '',
      systemFolders: data.systemFolders || {},
      darkMode: data.darkMode || false
    };
  } catch (e) {
    return { games: [], mednafenPath: '', systemFolders: {}, darkMode: false };
  }
}

function writeStore(data) {
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

let mainWindow;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(PROJECT_ROOT, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('select-folder', async (event, systemName) => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (res.canceled) return null;
  const selectedPath = res.filePaths[0];

  const store = readStore();
  
  // Check for duplicate folder paths across all systems
  let updatedGames = store.games;
  for (const existingSystem in store.systemFolders) {
    if (store.systemFolders[existingSystem] === selectedPath && existingSystem !== systemName) {
      // If a match is found, remove the games from the old system
      const filteredGames = updatedGames.filter(g => g.system !== existingSystem);
      updatedGames = filteredGames;
      // Also remove the old system's folder path
      delete store.systemFolders[existingSystem];
    }
  }

  store.systemFolders[systemName] = selectedPath;
  store.games = updatedGames; // Save the filtered games
  writeStore(store);

  return selectedPath;
});

ipcMain.handle('get-system-folders', async () => {
  const store = readStore();
  return store.systemFolders;
});

ipcMain.handle('select-mednafen-exec', async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Executable', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }
    ]
  });
  if (res.canceled) return null;
  const selectedPath = res.filePaths[0];

  const store = readStore();
  store.mednafenPath = selectedPath;
  writeStore(store);

  return selectedPath;
});

ipcMain.handle('scan-folder', async (event, systemName) => {
  const store = readStore();
  const folder = store.systemFolders[systemName];

  if (!folder) {
    return { error: 'No folder selected for this system' };
  }

  const scannedGames = [];
  const cdImageExts = new Set(['.cue', '.iso', '.chd', '.ccd', '.img', '.m3u']);
  const romExts = new Set(['.sfc', '.smc', '.nes', '.zip', '.gba', '.gb', '.gbc', '.pce', '.md', '.a26', '.lnx', '.sms', '.gg', '.sgx', '.pcfx', '.vb', '.ws', '.wsc', '.ngp', '.ngc', '.gen']);

  function walk(dir) {
    let items;
    try {
      items = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      console.error(`Could not read directory: ${dir}`, e);
      return;
    }

    const subDirs = items.filter(it => it.isDirectory());
    const files = items.filter(it => !it.isDirectory());

    const cueFiles = files.filter(it => path.extname(it.name).toLowerCase() === '.cue');

    if (cueFiles.length > 0) {
      for (const file of cueFiles) {
        const ext = path.extname(file.name).toLowerCase();
        scannedGames.push({ name: file.name, path: path.join(dir, file.name), system: systemName });
      }
    } else {
      const otherCdImages = files.filter(it => {
        const ext = path.extname(it.name).toLowerCase();
        return cdImageExts.has(ext) && ext !== '.cue';
      });
      for (const file of otherCdImages) {
        const ext = path.extname(file.name).toLowerCase();
        scannedGames.push({ name: file.name, path: path.join(dir, file.name), system: systemName });
      }
    }

    const regularRoms = files.filter(it => romExts.has(path.extname(it.name).toLowerCase()));
    for (const file of regularRoms) {
      const ext = path.extname(file.name).toLowerCase();
      scannedGames.push({ name: file.name, path: path.join(dir, file.name), system: systemName });
    }

    for (const subDir of subDirs) {
      walk(path.join(dir, subDir.name));
    }
  }

  try {
    walk(folder);
  } catch (e) {
    return { error: String(e) };
  }

  const oldGames = readStore().games;
  const filteredOldGames = oldGames.filter(g => g.system !== systemName);
  
  const oldGamesByPath = new Map(oldGames.map(g => [g.path, g]));
  const newGamesForSystem = scannedGames.map(scannedGame => {
    if (oldGamesByPath.has(scannedGame.path)) {
      return oldGamesByPath.get(scannedGame.path);
    } else {
      return { ...scannedGame, id: Date.now() + Math.random() };
    }
  });

  const updatedGames = [...filteredOldGames, ...newGamesForSystem];
  store.games = updatedGames;
  writeStore(store);

  return store.games;
});

ipcMain.handle('get-games', async () => {
  const store = readStore();
  store.games.sort((a, b) => {
    if (a.system < b.system) return -1;
    if (a.system > b.system) return 1;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  return store.games;
});

ipcMain.handle('remove-games-by-ids', async (event, gameIds) => {
  const store = readStore();
  const gameIdsToRemove = new Set(gameIds);
  store.games = store.games.filter(g => !gameIdsToRemove.has(String(g.id)));
  writeStore(store);
  return store.games;
});

ipcMain.handle('set-mednafen-path', async (event, p) => {
  const store = readStore();
  store.mednafenPath = p;
  writeStore(store);
  return true;
});

ipcMain.handle('get-mednafen-path', async () => {
  const store = readStore();
  return store.mednafenPath || '';
});

ipcMain.handle('run-game', async (event, gamePath) => {
  const store = readStore();
  const exe = store.mednafenPath || 'mednafen';

  if (!fs.existsSync(gamePath)) {
    return { error: 'Game file not found' };
  }
  if (exe !== 'mednafen' && !fs.existsSync(exe)) {
    return { error: `Mednafen executable not found at: ${exe}` };
  }

  try {
    const gameDir = path.dirname(gamePath);
    const gameFile = path.basename(gamePath);

    const proc = spawn(exe, [gameFile], {
      cwd: gameDir,
      windowsHide: true
    });

    proc.stdout.on('data', data => console.log(`Mednafen stdout: ${data}`));
    proc.stderr.on('data', data => {
      mainWindow.webContents.send('run-error', data.toString());
      console.error(`Mednafen stderr: ${data}`);
    });

    proc.on('close', (code) => {
      mainWindow.webContents.send('run-closed', code);
      console.log(`Mednafen process exited with code ${code}`);
    });

    return { ok: true };
  } catch (e) {
    return { error: String(e) };
  }
});

ipcMain.handle('set-dark-mode-state', async (event, state) => {
  const store = readStore();
  store.darkMode = state;
  writeStore(store);
  return true;
});

ipcMain.handle('get-dark-mode-state', async () => {
  const store = readStore();
  return store.darkMode;
});