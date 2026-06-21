const Store = require('electron-store');

const store = new Store({
    defaults: {
        serverUrl: '',
        nasPath: 'Z:\\1000- Affaires',
        nasPushToken: '',
        autoStart: false,
        trayOnClose: true,
        syncIntervalMinutes: 240
    }
});

module.exports = store;
