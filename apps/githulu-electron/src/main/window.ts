import { BrowserWindow, app } from 'electron';
import * as path from 'node:path';

let mainWindow: BrowserWindow | null = null;

const DEV_SERVER_URL = 'http://localhost:3456';

export function createWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'githulu',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0c0a14', // bg-base color
    show: false, // Don't show until ready
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
  });

  // Show window when ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load the app
  if (app.isPackaged) {
    // Load from bundled Nuxt output (extraResources goes to Resources folder)
    const indexPath = path.join(process.resourcesPath, 'ui', 'index.html');
    console.log('[githulu] Loading UI from:', indexPath);
    mainWindow.loadFile(indexPath);
  } else {
    // Development mode - load from Nuxt dev server
    console.log('[githulu] Loading UI from dev server:', DEV_SERVER_URL);
    mainWindow.loadURL(DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function sendToRenderer(channel: string, ...args: unknown[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}
