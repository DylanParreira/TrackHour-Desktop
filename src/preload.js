const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    isElectron: true,

    scanNas: () => ipcRenderer.invoke('nas:scan'),
    searchLocal: (searchText, clientFilter) => ipcRenderer.invoke('nas:searchLocal', searchText, clientFilter),
    getClients: () => ipcRenderer.invoke('nas:getClients'),
    getCache: () => ipcRenderer.invoke('nas:getCache'),
    openFolder: (folderPath) => ipcRenderer.invoke('nas:openFolder', folderPath),
    openFile: (filePath) => ipcRenderer.invoke('nas:openFile', filePath),
    browseFolder: (basePath, subPath) => ipcRenderer.invoke('nas:browseFolder', basePath, subPath),
    getDocuments: (projectPath) => ipcRenderer.invoke('nas:getDocuments', projectPath),
    searchProjects: (searchTerm) => ipcRenderer.invoke('nas:searchProjects', searchTerm),

    saveTasksLocal: (year, month, day, tasks) => ipcRenderer.invoke('tasks:saveLocal', year, month, day, tasks),
    selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
    getConfig: () => ipcRenderer.invoke('config:get'),
    setConfig: (key, value) => ipcRenderer.invoke('config:set', key, value),
    getVersion: () => ipcRenderer.invoke('app:version'),
});
