// Electron main process - for desktop app / Steam distribution
// Run: npx electron electron/main.js

const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: true,
        autoHideMenuBar: true,
        backgroundColor: '#0a0a1a',
        title: '신의 손길 - God Simulation',
        icon: path.join(__dirname, '..', 'icon-512.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    // F11 for fullscreen toggle
    mainWindow.on('enter-full-screen', () => {
        mainWindow.setMenuBarVisibility(false);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    createWindow();

    // Register ESC to exit fullscreen (not quit)
    globalShortcut.register('Escape', () => {
        if (mainWindow && mainWindow.isFullScreen()) {
            mainWindow.setFullScreen(false);
        }
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});
