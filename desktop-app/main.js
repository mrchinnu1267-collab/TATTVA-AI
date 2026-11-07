const { app, BrowserWindow, shell, session, Menu } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;

// Fallback endpoint sequence: local dev server or cloud HTTPS tunnel
const LOCAL_URL = 'http://localhost:3000';
const CLOUD_URL = 'https://disco-care-buyers-copyright.trycloudflare.com';

function checkUrlLive(url, timeoutMs = 1500) {
  return new Promise((resolve) => {
    try {
      const u = new URL(url);
      const req = http.request({
        host: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80),
        method: 'HEAD',
        path: '/',
        timeout: timeoutMs
      }, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch {
      resolve(false);
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 800,
    minHeight: 600,
    title: 'TATTVA AI',
    backgroundColor: '#0b0f19',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    autoHideMenuBar: false,
  });

  // Zero-microphone policy: reject any microphone or audioCapture permissions
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['notifications'];
    if (allowedPermissions.includes(permission)) {
      return callback(true);
    }
    callback(false);
  });

  // Open external links in user default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('localhost:3000') && !url.includes('trycloudflare.com') && !url.includes('tattva-ai.vercel.app')) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  const isLocalLive = await checkUrlLive(LOCAL_URL);
  const targetUrl = isLocalLive ? LOCAL_URL : CLOUD_URL;

  console.log('Connecting TATTVA AI Desktop to:', targetUrl);
  mainWindow.loadURL(targetUrl);

  createApplicationMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{
      label: 'TATTVA AI',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Chat',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('navigate-to', '/chat');
          }
        },
        {
          label: 'Sara Live Voice Assistant',
          accelerator: 'CmdOrCtrl+Shift+V',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('navigate-to', '/voice');
          }
        },
        {
          label: 'Image Studio',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('navigate-to', '/studio');
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
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
        { role: 'toggleDevTools' },
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
          label: 'GitHub Repository',
          click: async () => {
            await shell.openExternal('https://github.com/mrchinnu1267-collab/TATTVA-AI');
          }
        },
        {
          label: 'Documentation',
          click: async () => {
            await shell.openExternal('https://github.com/mrchinnu1267-collab/TATTVA-AI#readme');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
