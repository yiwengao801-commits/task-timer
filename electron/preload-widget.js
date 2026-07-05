/**
 * 悬浮窗预加载脚本
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  togglePin: () => ipcRenderer.send('toggle-pin'),
  minimize: () => ipcRenderer.send('minimize-widget'),
  close: () => ipcRenderer.send('close-widget'),
  resize: (isMinimized) => ipcRenderer.send('resize-widget', isMinimized),
  saveTask: (task) => ipcRenderer.send('save-task', task),
  onPinStatus: (callback) => ipcRenderer.on('pin-status', (event, isPinned) => callback(isPinned))
})
