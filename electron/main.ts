import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { loadWindowState, saveWindowState } from './windowState';

let mainWindow: BrowserWindow | null = null;

const MAX_DEV_RETRIES = 10;
const DEV_RETRY_INTERVAL_MS = 1000;

function isSteamEnvironment(): boolean {
  if (process.env.SteamAppId) {
    return true;
  }

  const appDir = app.isPackaged
    ? process.platform === 'darwin'
      ? path.join(path.dirname(process.execPath), '..')
      : path.dirname(process.execPath)
    : process.cwd();

  return fs.existsSync(path.join(appDir, 'steam_appid.txt'));
}

if (isSteamEnvironment()) {
  app.commandLine.appendSwitch('in-process-gpu');
}

function buildMenu(): void {
  const isDev = !app.isPackaged;

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        ...(isDev
          ? [
              { type: 'separator' as const },
              {
                label: 'Toggle Developer Tools',
                accelerator: 'CmdOrCtrl+Shift+I',
                click: () => {
                  mainWindow?.webContents.toggleDevTools();
                },
              },
            ]
          : []),
      ],
    },
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  const saved = loadWindowState({ width: 800, height: 600 });

  mainWindow = new BrowserWindow({
    x: saved.x,
    y: saved.y,
    width: saved.width,
    height: saved.height,
    minWidth: 640,
    minHeight: 480,
    useContentSize: true,
    resizable: true,
    fullscreenable: true,
    backgroundColor: '#1a1a2e',
    title: 'Archer',
    icon: path.join(__dirname, '..', '..', 'build', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  if (saved.isMaximized) {
    mainWindow.maximize();
  }
  if (saved.isFullScreen) {
    mainWindow.setFullScreen(true);
  }

  buildMenu();

  let saveTimeout: ReturnType<typeof setTimeout> | undefined;
  const debouncedSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (mainWindow) saveWindowState(mainWindow);
    }, 500);
  };

  mainWindow.on('resize', debouncedSave);
  mainWindow.on('move', debouncedSave);
  mainWindow.on('enter-full-screen', debouncedSave);
  mainWindow.on('leave-full-screen', debouncedSave);
  mainWindow.on('close', () => {
    if (mainWindow) saveWindowState(mainWindow);
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    let retryCount = 0;

    mainWindow.webContents.on('did-fail-load', () => {
      retryCount++;
      if (retryCount <= MAX_DEV_RETRIES) {
        setTimeout(() => mainWindow?.loadURL('http://localhost:3000'), DEV_RETRY_INTERVAL_MS);
      } else {
        console.error(
          `Failed to connect to dev server after ${MAX_DEV_RETRIES} attempts. ` +
          'Make sure "npm run dev" is running.'
        );
        app.quit();
      }
    });

    mainWindow.loadURL('http://localhost:3000');
  } else {
    const indexPath = path.join(__dirname, '..', '..', 'dist', 'index.html');

    if (!fs.existsSync(indexPath)) {
      console.error(
        `Error: Cannot find dist/index.html at "${indexPath}". Run "npm run build" first.`
      );
      app.quit();
      return;
    }

    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const VALID_KEY = /^[a-z0-9_-]+$/;

function getSavesDir(): string {
  return path.join(app.getPath('userData'), 'saves');
}

function registerSaveHandlers(): void {
  ipcMain.handle('save-game', async (_event, key: string, value: string) => {
    if (!VALID_KEY.test(key)) return { success: false, error: 'Invalid key' };
    try {
      const dir = getSavesDir();
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, `${key}.json`);
      const tmpPath = `${filePath}.tmp`;
      let formatted = value;
      try {
        formatted = JSON.stringify(JSON.parse(value), null, 2);
      } catch {
        // use value as-is if not valid JSON
      }
      fs.writeFileSync(tmpPath, formatted, 'utf-8');
      fs.renameSync(tmpPath, filePath);
      return { success: true };
    } catch (e) {
      console.error(`Failed to save ${key}:`, e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('load-game', async (_event, key: string) => {
    if (!VALID_KEY.test(key)) return null;
    try {
      const filePath = path.join(getSavesDir(), `${key}.json`);
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return null;
    }
  });

  ipcMain.handle('delete-game', async (_event, key: string) => {
    if (!VALID_KEY.test(key)) return { success: false, error: 'Invalid key' };
    try {
      const filePath = path.join(getSavesDir(), `${key}.json`);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { success: true };
    } catch (e) {
      console.error(`Failed to delete ${key}:`, e);
      return { success: false, error: String(e) };
    }
  });

  ipcMain.handle('list-games', async () => {
    try {
      const dir = getSavesDir();
      if (!fs.existsSync(dir)) return [];
      const files = fs.readdirSync(dir);
      return files
        .filter(f => f.endsWith('.json') && !f.endsWith('.tmp'))
        .map(f => f.replace(/\.json$/, ''));
    } catch {
      return [];
    }
  });
}

app.whenReady().then(() => {
  fs.mkdirSync(getSavesDir(), { recursive: true });
  registerSaveHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
