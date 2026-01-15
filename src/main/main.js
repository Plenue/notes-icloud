const { app, BrowserWindow, session, Menu, Tray, shell, ipcMain, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray = null;

// Check if started with --hidden flag (auto-launch)
const startHidden = process.argv.includes('--hidden');

// State file to track app state
const stateFilePath = path.join(app.getPath('userData'), 'app-state.json');

// Auto-launch helper functions
function setAutoLaunch(enable) {
  app.setLoginItemSettings({
    openAtLogin: enable,
    openAsHidden: true,
    args: ['--hidden']
  });
}

function getAutoLaunchEnabled() {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
}

function loadState() {
  try {
    if (fs.existsSync(stateFilePath)) {
      return JSON.parse(fs.readFileSync(stateFilePath, 'utf-8'));
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
  return { hasLoggedInBefore: false, hasMinimizedBefore: false };
}

function saveState(state) {
  try {
    fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../../icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('Apple Notes Desktop');

  updateTrayMenu();

  // Double-click to show window
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function updateTrayMenu() {
  const autoLaunchEnabled = getAutoLaunchEnabled();

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Apple Notes',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Start on System Boot',
      type: 'checkbox',
      checked: autoLaunchEnabled,
      click: (menuItem) => {
        setAutoLaunch(menuItem.checked);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#1e1e1e',
    icon: path.join(__dirname, '../../icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1e1e1e',
      symbolColor: '#ffffff',
      height: 40
    },
    show: !startHidden, // Don't show if started hidden
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true
    }
  });

  // Set user agent
  const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
  mainWindow.webContents.setUserAgent(userAgent);

  // Load main HTML
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Send state to renderer when loaded
  mainWindow.webContents.on('did-finish-load', () => {
    const state = loadState();
    mainWindow.webContents.send('app-state', state);
  });

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();

      // Show notification on first minimize
      const state = loadState();
      if (!state.hasMinimizedBefore) {
        tray.displayBalloon({
          iconType: 'info',
          title: 'Apple Notes Desktop',
          content: 'App minimized to tray. Double-click to open, right-click for menu.'
        });
        saveState({ ...state, hasMinimizedBefore: true });
      }
    }
  });

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  createMenu();

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Configure webview permissions
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    // Allow the webview to load iCloud
    webPreferences.preloadURL = undefined;
    webPreferences.nodeIntegration = false;
    webPreferences.contextIsolation = true;
  });

  // Set up session for webview partition
  const icloudSession = session.fromPartition('persist:icloud');

  // Set user agent for the icloud session
  icloudSession.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15');

  // Handle permission requests
  icloudSession.setPermissionRequestHandler((webContents, permission, callback) => {
    // Allow all permissions for iCloud
    callback(true);
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.send('refresh');
          }
        },
        { type: 'separator' },
        {
          label: 'Minimize to Tray',
          accelerator: 'CmdOrCtrl+M',
          click: () => {
            mainWindow.hide();
          }
        },
        { type: 'separator' },
        {
          label: 'Logout',
          click: () => {
            clearSession();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Apple Notes Desktop',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Apple Notes Desktop',
              message: 'Apple Notes Desktop',
              detail: 'A cross-platform client for Apple Notes via iCloud.\n\nVersion 1.0.0\n\nClose window = Minimize to tray\nCtrl+Q = Quit completely'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

async function clearSession() {
  try {
    const ses = session.fromPartition('persist:icloud');
    await ses.clearStorageData();
    await ses.clearCache();

    saveState({ hasLoggedInBefore: false, hasMinimizedBefore: false });
    mainWindow.webContents.send('logout');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

// IPC Handlers
ipcMain.handle('get-user-agent', () => {
  return 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
});

ipcMain.handle('open-external', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('mark-logged-in', () => {
  const state = loadState();
  saveState({ ...state, hasLoggedInBefore: true });
  return { success: true };
});

ipcMain.handle('get-login-state', () => {
  return loadState();
});

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit();
} else {
  // This is the primary instance
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, show our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      if (!mainWindow.isVisible()) mainWindow.show();
      mainWindow.focus();
    }
  });

  // App lifecycle
  app.whenReady().then(() => {
    createTray();
    createWindow();
  });
}

app.on('window-all-closed', () => {
  // Don't quit - keep running in tray
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
  } else {
    createWindow();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  event.preventDefault();
  callback(true);
});
