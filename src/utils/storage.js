/**
 * localStorage 存储工具函数
 */

const STORAGE_KEY = 'task-timer-data'

/**
 * 获取所有任务数据
 * @returns {Object} 按日期分组的任务数据
 */
export function getAllTasks() {
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
export function getTasksByDate(date) {
  const allTasks = getAllTasks()
  return allTasks[date] || []
}

/**
 * 保存任务到指定日期
 * @param {string} date - 日期字符串 (YYYY-MM-DD)
 * @param {Object} task - 任务对象
 */
export function saveTask(date, task) {
  const allTasks = getAllTasks()
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
export function updateTask(date, taskId, updatedTask) {
  const allTasks = getAllTasks()
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
export function deleteTask(date, taskId) {
  const allTasks = getAllTasks()
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
export function getTasksByDates(dates) {
  const allTasks = getAllTasks()
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
export function hasTasks(date) {
  const allTasks = getAllTasks()
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
