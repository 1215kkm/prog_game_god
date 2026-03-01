// Electron main process - for desktop app / Steam / kiosk display
// Run: npx electron .
// Kiosk mode: npx electron . --kiosk
// Ambient mode: npx electron . --ambient

const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
const isKiosk = process.argv.includes('--kiosk');
const isAmbient = process.argv.includes('--ambient');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        fullscreen: true,
        kiosk: isKiosk,
        autoHideMenuBar: true,
        backgroundColor: '#0a0a1a',
        title: '신의 손길 - God Simulation',
        icon: path.join(__dirname, '..', 'icon-512.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // Use ambient.html for ambient/kiosk mode, index.html for game mode
    const htmlFile = (isAmbient || isKiosk) ? 'ambient.html' : 'index.html';
    mainWindow.loadFile(path.join(__dirname, '..', htmlFile));

    // F11 for fullscreen toggle
    mainWindow.on('enter-full-screen', () => {
        mainWindow.setMenuBarVisibility(false);
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Auto-restart on crash (kiosk mode)
    if (isKiosk) {
        mainWindow.webContents.on('crashed', () => {
            setTimeout(() => {
                if (mainWindow) mainWindow.reload();
            }, 3000);
        });
        mainWindow.on('unresponsive', () => {
            setTimeout(() => {
                if (mainWindow) mainWindow.reload();
            }, 5000);
        });
    }
}

app.whenReady().then(() => {
    createWindow();

    // Register ESC to exit fullscreen (not quit) - unless kiosk mode
    if (!isKiosk) {
        globalShortcut.register('Escape', () => {
            if (mainWindow && mainWindow.isFullScreen()) {
                mainWindow.setFullScreen(false);
            }
        });
    }

    // Ctrl+Shift+Q to force quit even in kiosk mode
    globalShortcut.register('CommandOrControl+Shift+Q', () => {
        app.quit();
    });
});

app.on('window-all-closed', () => {
    app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});
