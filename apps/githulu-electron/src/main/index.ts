import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'node:path';
import { registerReposHandlers } from './ipc/repos.js';
import { registerGitHandlers } from './ipc/git.js';
import { registerUIHandlers } from './ipc/ui.js';
import { resolveGitBinary } from './git/resolver.js';
import { createWindow, getMainWindow } from './window.js';
import { initStorage } from './storage/index.js';
import { stopAllWatchers } from './watchers/repo-watcher.js';

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Initialize app
async function initialize(): Promise<void> {
  try {
    // Resolve git binary first
    const gitPath = await resolveGitBinary();
    console.log(`[githulu] Git binary resolved: ${gitPath}`);

    // Initialize storage
    await initStorage();
    console.log('[githulu] Storage initialized');

    // Register IPC handlers
    registerReposHandlers();
    registerGitHandlers();
    registerUIHandlers();
    console.log('[githulu] IPC handlers registered');

    // Register utility handlers
    registerUtilityHandlers();
  } catch (error) {
    console.error('[githulu] Initialization failed:', error);
    dialog.showErrorBox(
      'Initialization Error',
      `githulu failed to initialize: ${error instanceof Error ? error.message : String(error)}`
    );
    app.quit();
  }
}

function registerUtilityHandlers(): void {
  // Select folder dialog
  ipcMain.handle('githulu:utils:selectFolder', async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return null;

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Repository Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Open file in editor (Cursor)
  ipcMain.handle('githulu:utils:openInEditor', async (_event: Electron.IpcMainInvokeEvent, filePath: string) => {
    // Validate path exists and is absolute
    if (!path.isAbsolute(filePath)) {
      throw new Error('File path must be absolute');
    }

    // Use macOS open command to open in Cursor
    await shell.openPath(filePath);
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await initialize();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopAllWatchers();
});

// Security: Prevent navigation and new windows
app.on('web-contents-created', (_event: Electron.Event, contents: Electron.WebContents) => {
  contents.on('will-navigate', (event: Electron.Event) => {
    event.preventDefault();
  });

  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});
