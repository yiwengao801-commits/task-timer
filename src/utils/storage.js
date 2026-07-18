/**
 * 任务存储工具函数
 * 优先使用主进程统一存储，避免 localStorage 分片
 */

const STORAGE_KEY = 'task-timer-data'

/**
 * 判断是否在 Electron 环境且支持主进程存储
 */
function isElectronStorageAvailable() {
  return typeof window !== 'undefined' && window.electronAPI && window.electronAPI.getAllTasks
}

/**
 * 获取所有任务数据
 * @returns {Object} 按日期分组的任务数据
 */
export async function getAllTasks() {
  if (isElectronStorageAvailable()) {
    try {
      const data = await window.electronAPI.getAllTasks()
      return data || {}
    } catch (error) {
      console.error('从主进程读取任务失败:', error)
    }
  }

  // 回退到 localStorage
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch (error) {
    console.error('读取数据失败:', error)
    return {}
  }
}

/**
 * 获取指定日期的任务列表
 * @param {string} date - 日期字符串 (YYYY-MM-DD)
 * @returns {Array} 任务列表
 */
export async function getTasksByDate(date) {
  const allTasks = await getAllTasks()
  return allTasks[date] || []
}

/**
 * 保存任务到指定日期
 * @param {string} date - 日期字符串 (YYYY-MM-DD)
 * @param {Object} task - 任务对象
 */
export async function saveTask(date, task) {
  if (isElectronStorageAvailable()) {
    try {
      const ok = await window.electronAPI.saveTask(date, task)
      if (ok) return
    } catch (error) {
      console.error('向主进程保存任务失败:', error)
    }
  }

  // 回退到 localStorage
  const allTasks = (() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('读取数据失败:', error)
      return {}
    }
  })()
  if (!allTasks[date]) {
    allTasks[date] = []
  }
  allTasks[date].push(task)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks))
}

/**
 * 更新指定日期的任务
 * @param {string} date - 日期字符串 (YYYY-MM-DD)
 * @param {string} taskId - 任务 ID
 * @param {Object} updatedTask - 更新后的任务对象
 */
export async function updateTask(date, taskId, updatedTask) {
  if (isElectronStorageAvailable()) {
    try {
      const ok = await window.electronAPI.updateTask(date, taskId, updatedTask)
      if (ok) return
    } catch (error) {
      console.error('向主进程更新任务失败:', error)
    }
  }

  // 回退到 localStorage
  const allTasks = (() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('读取数据失败:', error)
      return {}
    }
  })()
  if (allTasks[date]) {
    const index = allTasks[date].findIndex(t => t.id === taskId)
    if (index !== -1) {
      allTasks[date][index] = { ...allTasks[date][index], ...updatedTask }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks))
    }
  }
}

/**
 * 删除指定日期的任务
 * @param {string} date - 日期字符串 (YYYY-MM-DD)
 * @param {string} taskId - 任务 ID
 */
export async function deleteTask(date, taskId) {
  if (isElectronStorageAvailable()) {
    try {
      const ok = await window.electronAPI.deleteTask(date, taskId)
      if (ok) return
    } catch (error) {
      console.error('向主进程删除任务失败:', error)
    }
  }

  // 回退到 localStorage
  const allTasks = (() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('读取数据失败:', error)
      return {}
    }
  })()
  if (allTasks[date]) {
    allTasks[date] = allTasks[date].filter(t => t.id !== taskId)
    if (allTasks[date].length === 0) {
      delete allTasks[date]
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allTasks))
  }
}

/**
 * 获取多个日期的任务数据
 * @param {string[]} dates - 日期数组
 * @returns {Object} 按日期分组的任务数据
 */
export async function getTasksByDates(dates) {
  const allTasks = await getAllTasks()
  const result = {}
  dates.forEach(date => {
    if (allTasks[date]) {
      result[date] = allTasks[date]
    }
  })
  return result
}

/**
 * 检查指定日期是否有任务
 * @param {string} date - 日期字符串 (YYYY-MM-DD)
 * @returns {boolean}
 */
export async function hasTasks(date) {
  const allTasks = await getAllTasks()
  return allTasks[date] && allTasks[date].length > 0
}

/**
 * 生成唯一 ID
 * @returns {string}
 */
export function generateId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 清除所有数据（用于测试）
 */
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEY)
}
