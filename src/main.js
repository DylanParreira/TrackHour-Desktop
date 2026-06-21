const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('path');

let mainWindow = null;
let config;

function getConfig() {
    if (!config) {
        const Store = require('electron-store');
        config = new Store({
            defaults: {
                serverUrl: '',
                nasPath: 'Z:\\1000- Affaires',
                nasPushToken: '',
                autoStart: false,
                trayOnClose: true,
                syncIntervalMinutes: 240
            }
        });
    }
    return config;
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        autoHideMenuBar: true,
        icon: path.join(__dirname, '..', 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            partition: 'persist:trackhour'
        }
    });

    mainWindow.on('close', (e) => {
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });

    const serverUrl = getConfig().get('serverUrl');
    if (!serverUrl) {
        showConfigPrompt();
    } else {
        mainWindow.loadURL(serverUrl);
    }
}

function showConfigPrompt() {
    const prompt = new BrowserWindow({
        width: 500, height: 250,
        parent: mainWindow,
        modal: true,
        autoHideMenuBar: true,
        resizable: false,
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: path.join(__dirname, 'preload-config.js')
        }
    });

    prompt.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(getConfigHTML())}`);

    prompt.webContents.on('page-title-updated', (e, title) => {
        if (title.startsWith('CONNECT:')) {
            const raw = title.slice(8);
            const serverUrl = raw.trim();
            if (serverUrl) {
                getConfig().set('serverUrl', serverUrl);
                mainWindow.loadURL(serverUrl);
            }
            prompt.close();
        }
    });

    prompt.on('closed', () => {
        if (!getConfig().get('serverUrl')) app.quit();
    });
}

function getConfigHTML() {
    return `<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<style>
    body { font-family: Segoe UI, sans-serif; padding: 30px; background: #f8f9fa; margin: 0; }
    h3 { margin-top: 0; color: #333; }
    input { width: 100%; padding: 8px 12px; font-size: 14px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
    button { padding: 8px 24px; background: #667eea; color: white; border: none; border-radius: 4px; font-size: 14px; cursor: pointer; margin-top: 15px; }
    button:hover { background: #5a6fd6; }
    .hint { color: #888; font-size: 12px; margin-top: 5px; }
</style>
</head><body>
    <h3>Configuration TrackHour</h3>
    <label>URL du serveur :</label>
    <input id="url" type="text" value="http://" autofocus>
    <div class="hint">Ex: http://82.66.175.85:8020</div>
    <button onclick="go()">Connecter</button>
    <script>
        function go() {
            const url = document.getElementById('url').value.trim();
            if (url && url !== 'http://') document.title = 'CONNECT:' + url;
        }
        document.getElementById('url').addEventListener('keypress', e => { if (e.key === 'Enter') go(); });
    </script>
</body></html>`;
}

function registerIpcHandlers() {
    const { scanNas, searchLocalCache, getLocalClients, getLocalCache, setCachePath } = require('./nas-scanner');
    setCachePath(app.getPath('userData'));
    const { browseFolder, getDocuments, searchProjects } = require('./nas-documents');
    const store = getConfig();

    ipcMain.handle('nas:scan', async () => {
        return scanNas(store.get('nasPath'));
    });

    ipcMain.handle('nas:searchLocal', async (_, searchText, clientFilter) => {
        return searchLocalCache(searchText, clientFilter);
    });

    ipcMain.handle('nas:getClients', async () => {
        return getLocalClients();
    });

    ipcMain.handle('nas:getCache', async () => {
        return getLocalCache();
    });

    ipcMain.handle('nas:openFolder', async (_, folderPath) => {
        return shell.openPath(folderPath);
    });

    ipcMain.handle('nas:openFile', async (_, filePath) => {
        return shell.openPath(filePath);
    });

    ipcMain.handle('nas:browseFolder', async (_, basePath, subPath) => {
        return browseFolder(basePath, subPath);
    });

    ipcMain.handle('nas:getDocuments', async (_, projectPath) => {
        return getDocuments(projectPath);
    });

    ipcMain.handle('nas:searchProjects', async (_, searchTerm) => {
        return searchProjects(store.get('nasPath'), searchTerm);
    });

    ipcMain.handle('config:get', () => ({
        serverUrl: store.get('serverUrl'),
        nasPath: store.get('nasPath'),
        nasPushToken: store.get('nasPushToken'),
        autoStart: store.get('autoStart'),
        syncIntervalMinutes: store.get('syncIntervalMinutes')
    }));

    ipcMain.handle('config:set', (_, key, value) => {
        store.set(key, value);
        return true;
    });

    ipcMain.handle('dialog:selectFolder', async () => {
        const result = await dialog.showOpenDialog(mainWindow, {
            properties: ['openDirectory'],
            title: 'Choisir un dossier'
        });
        if (result.canceled) return null;
        return result.filePaths[0];
    });

    ipcMain.handle('tasks:saveLocal', async (_, year, month, day, tasks) => {
        const fs = require('fs').promises;
        const basePath = store.get('hoursPath') || path.join(app.getPath('userData'), 'heures');
        const hoursDir = path.join(basePath, String(year), String(month));
        await fs.mkdir(hoursDir, { recursive: true });
        const content = '﻿' + tasks.map(t => `${t.time} ${t.description}`).join('\n');
        await fs.writeFile(path.join(hoursDir, `${day}.txt`), content, 'utf-8');
        return { success: true };
    });

    ipcMain.handle('app:version', () => app.getVersion());
}

app.whenReady().then(() => {
    registerIpcHandlers();
    createWindow();

    const { createTray } = require('./tray');
    const { scanNas } = require('./nas-scanner');
    const store = getConfig();

    createTray(mainWindow, app, {
        syncNas: () => {
            scanNas(store.get('nasPath'));
            console.log('Sync NAS lancée depuis le tray');
        }
    });

    // Auto-update
    const { initAutoUpdater } = require('./updater');
    initAutoUpdater();

    // Sync NAS en fond toutes les 4h
    const syncInterval = (store.get('syncIntervalMinutes') || 240) * 60 * 1000;
    setInterval(() => {
        const nasPath = store.get('nasPath');
        if (nasPath) {
            scanNas(nasPath);
            console.log('Sync NAS automatique effectuée');
        }
    }, syncInterval);
});

app.on('window-all-closed', () => {
    // Ne pas quitter, rester dans le tray
});

app.on('before-quit', () => {
    app.isQuitting = true;
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
