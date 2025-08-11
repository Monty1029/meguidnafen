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
      lastRomFolder: data.lastRomFolder || '',
      darkMode: data.darkMode || false
    };
  } catch (e) {
    return { games: [], mednafenPath: '', lastRomFolder: '', darkMode: false };
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

function getSystemFromExt(ext) {
  switch (ext) {
    case '.cue':
    case '.iso':
    case '.chd':
    case '.ccd':
    case '.img':
    case '.m3u':
      return 'PlayStation / Sega Saturn';
    case '.sfc':
    case '.smc':
      return 'Super Nintendo Entertainment System';
    case '.nes':
      return 'Nintendo Entertainment System';
    case '.zip':
      return 'Generic Archive';
    case '.gba':
    case '.gb':
    case '.gbc':
      return 'Game Boy / Color';
    case '.pce':
    case '.sgx':
      return 'PC Engine SuperGrafx';
    case '.md':
    case '.gen':
      return 'Sega Genesis';
    case '.sms':
      return 'Master System';
    case '.gg':
      return 'Game Gear';
    case '.a26':
      return 'Atari 2600';
    case '.lnx':
      return 'Atari Lynx';
    case '.pcfx':
      return 'PC-FX';
    case '.vb':
      return 'Virtual Boy';
    case '.ws':
    case '.wsc':
      return 'WonderSwan';
    case '.ngp':
    case '.ngc':
      return 'Neo Geo Pocket / Color';
    default:
      return 'Unknown';
  }
}

ipcMain.handle('select-folder', async () => {
  const res = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
  if (res.canceled) return null;
  const selectedPath = res.filePaths[0];

  const store = readStore();
  store.lastRomFolder = selectedPath;
  writeStore(store);

  return selectedPath;
});

ipcMain.handle('get-last-rom-folder', async () => {
  const store = readStore();
  return store.lastRomFolder || '';
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

ipcMain.handle('scan-folder', async (event, folder) => {
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
        scannedGames.push({ name: file.name, path: path.join(dir, file.name), system: getSystemFromExt(ext) });
      }
    } else {
      const otherCdImages = files.filter(it => {
        const ext = path.extname(it.name).toLowerCase();
        return cdImageExts.has(ext) && ext !== '.cue';
      });
      for (const file of otherCdImages) {
        const ext = path.extname(file.name).toLowerCase();
        scannedGames.push({ name: file.name, path: path.join(dir, file.name), system: getSystemFromExt(ext) });
      }
    }

    const regularRoms = files.filter(it => romExts.has(path.extname(it.name).toLowerCase()));
    for (const file of regularRoms) {
      const ext = path.extname(file.name).toLowerCase();
      scannedGames.push({ name: file.name, path: path.join(dir, file.name), system: getSystemFromExt(ext) });
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

  const store = readStore();
  const oldGamesByPath = new Map(store.games.map(g => [g.path, g]));
  const updatedGames = [];

  for (const scannedGame of scannedGames) {
    if (oldGamesByPath.has(scannedGame.path)) {
      updatedGames.push(oldGamesByPath.get(scannedGame.path));
    } else {
      updatedGames.push({ ...scannedGame, id: Date.now() + Math.random() });
    }
  }

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

ipcMain.handle('remove-game', async (event, gameId) => {
  const store = readStore();
  store.games = store.games.filter(g => g.id !== gameId);
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

// New IPC handlers for dark mode state
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