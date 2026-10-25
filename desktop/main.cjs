// Frame Studio as a Windows desktop app. Electron shows the same production
// build as the website (dist\), served from app://frame-studio/ so autosave,
// the library and copy and paste (IndexedDB and localStorage) always belong
// to the same address. Save and Export still "download": Electron asks where
// to put the file.
const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const SCHEME = 'app';
const HOST = 'frame-studio';
const DIST = path.join(__dirname, '..', 'dist');

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

// Maps app://frame-studio/some/file to dist\some\file, refusing anything outside dist.
function serveDist(request) {
  const { host, pathname } = new URL(request.url);
  const file = path.normalize(path.join(DIST, decodeURIComponent(pathname === '/' ? '/index.html' : pathname)));
  if (host !== HOST || (file !== DIST && !file.startsWith(DIST + path.sep))) {
    return new Response('Not found', { status: 404 });
  }
  return net.fetch(pathToFileURL(file).toString());
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 360,
    minHeight: 480,
    backgroundColor: '#0f1a2e',
    title: 'Frame Studio',
    icon: path.join(__dirname, 'resources', 'icon.png'),
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  win.once('ready-to-show', () => win.show());

  // Links (Token Maker on GitHub and so on) open in the normal browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${SCHEME}://${HOST}/`)) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) shell.openExternal(url);
    }
  });

  win.loadURL(`${SCHEME}://${HOST}/`);
}

// One window: opening Frame Studio again brings the existing one forward.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // No menu bar: the app has its own top bar, and Ctrl+Z, Ctrl+C and so on
    // go straight to it.
    Menu.setApplicationMenu(null);
    protocol.handle(SCHEME, serveDist);
    createWindow();
  });

  app.on('window-all-closed', () => app.quit());
}
