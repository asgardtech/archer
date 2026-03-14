import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import { loadWindowState, saveWindowState } from './windowState';

let mainWindow: BrowserWindow | null = null;

const MAX_DEV_RETRIES = 10;
const DEV_RETRY_INTERVAL_MS = 1000;

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
    title: 'Raptor Skies',
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
