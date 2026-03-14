import { app, BrowserWindow, Menu } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

const MAX_DEV_RETRIES = 10;
const DEV_RETRY_INTERVAL_MS = 1000;

function createWindow(): void {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    useContentSize: true,
    resizable: true,
    backgroundColor: '#1a1a2e',
    title: 'Raptor Skies',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
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
