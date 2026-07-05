/**
 * 主窗口预加载脚本
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  showWidget: () => ipcRenderer.send('show-widget'),
  showShortcuts: () => ipcRenderer.send('show-shortcuts'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
  saveShortcuts: (shortcuts) => ipcRenderer.invoke('save-shortcuts', shortcuts),
  onTaskSaved: (callback) => {
    const handler = (event, task) => callback(task)
    ipcRenderer.on('task-saved', handler)
    // 返回清理函数，供 React useEffect 使用
    return () => {
      ipcRenderer.removeListener('task-saved', handler)
    }
  },
  onShortcutsUpdated: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('shortcuts-updated', handler)
    return () => ipcRenderer.removeListener('shortcuts-updated', handler)
  },
  onOpenShortcutsManager: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('open-shortcuts-manager', handler)
    return () => ipcRenderer.removeListener('open-shortcuts-manager', handler)
  }
})
