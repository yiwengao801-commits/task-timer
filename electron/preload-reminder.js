/**
 * 健康提醒预加载脚本
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  close: () => ipcRenderer.send('close-reminder'),
  snooze: () => ipcRenderer.send('snooze-reminder'),
  onShowReminder: (callback) => ipcRenderer.on('show-reminder', (event, data) => callback(data))
})
