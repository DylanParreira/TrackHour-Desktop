const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let tray = null;

function createTray(mainWindow, app, callbacks) {
    const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
    let icon;
    try {
        icon = nativeImage.createFromPath(iconPath);
        if (icon.isEmpty()) icon = nativeImage.createEmpty();
    } catch {
        icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);
    tray.setToolTip('TrackHour');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Ouvrir TrackHour',
            click: () => {
                mainWindow.show();
                mainWindow.focus();
            }
        },
        { type: 'separator' },
        {
            label: 'Synchroniser NAS',
            click: () => callbacks.syncNas?.()
        },
        { type: 'separator' },
        {
            label: 'Démarrer avec Windows',
            type: 'checkbox',
            checked: app.getLoginItemSettings().openAtLogin,
            click: (menuItem) => {
                app.setLoginItemSettings({ openAtLogin: menuItem.checked });
            }
        },
        { type: 'separator' },
        {
            label: 'Quitter',
            click: () => {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);

    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
        mainWindow.show();
        mainWindow.focus();
    });

    return tray;
}

module.exports = { createTray };
