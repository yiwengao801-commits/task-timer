/**
 * 快捷入口悬浮窗预加载脚本
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  togglePin: () => ipcRenderer.send('toggle-pin-shortcuts'),
  close: () => ipcRenderer.send('close-shortcuts'),
  resize: (isMinimized) => ipcRenderer.send('resize-shortcuts', isMinimized),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  openShortcutsManager: () => ipcRenderer.send('open-shortcuts-manager'),
  onPinStatus: (callback) => ipcRenderer.on('pin-status-shortcuts', (event, isPinned) => callback(isPinned)),
  onShortcutsUpdated: (callback) => ipcRenderer.on('shortcuts-updated', () => callback())
})

