const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to the renderer
contextBridge.exposeInMainWorld('api', {
    getUserAgent: () => ipcRenderer.invoke('get-user-agent'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    markLoggedIn: () => ipcRenderer.invoke('mark-logged-in'),
    getLoginState: () => ipcRenderer.invoke('get-login-state'),

    // Listen for events from main process
    onRefresh: (callback) => ipcRenderer.on('refresh', callback),
    onLogout: (callback) => ipcRenderer.on('logout', callback),
    onAppState: (callback) => ipcRenderer.on('app-state', (event, state) => callback(state))
});
