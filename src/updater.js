const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

function initAutoUpdater() {
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('update-available', (info) => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Mise à jour disponible',
            message: `TrackHour v${info.version} est disponible. Télécharger maintenant ?`,
            buttons: ['Télécharger', 'Plus tard']
        }).then(({ response }) => {
            if (response === 0) autoUpdater.downloadUpdate();
        });
    });

    autoUpdater.on('update-downloaded', () => {
        dialog.showMessageBox({
            type: 'info',
            title: 'Mise à jour prête',
            message: 'La mise à jour a été téléchargée. L\'application va redémarrer.',
            buttons: ['Redémarrer maintenant', 'Plus tard']
        }).then(({ response }) => {
            if (response === 0) autoUpdater.quitAndInstall();
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('Erreur auto-update:', err.message);
    });

    autoUpdater.checkForUpdates();

    // Vérifier toutes les 6h
    setInterval(() => autoUpdater.checkForUpdates(), 6 * 60 * 60 * 1000);
}

module.exports = { initAutoUpdater };
