/**
 * 时间格式化工具函数
 */

/**
 * 格式化秒数为 HH:MM:SS 格式
 * @param {number} totalSeconds - 总秒数
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds]
    .map(val => val.toString().padStart(2, '0'))
    .join(':')
}

/**
 * 格式化分钟数为可读字符串
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化后的字符串，如 "2 小时 30 分钟"
 */
export function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} 分钟`
  }
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) {
    return `${hours} 小时`
  }
  return `${hours} 小时 ${mins} 分钟`
}

/**
 * 格式化日期为 YYYY-MM-DD 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
export function formatDate(date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 格式化时间为 HH:MM 格式
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的时间字符串
 */
export function formatTimeOfDay(date) {
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * 格式化日期时间为可读格式
 * @param {string} isoString - ISO 格式的日期时间字符串
 * @returns {string} 格式化后的字符串，如 "2026-05-31 14:00"
 */
export function formatDateTime(isoString) {
  const date = new Date(isoString)
  return `${formatDate(date)} ${formatTimeOfDay(date)}`
}

/**
 * 获取日期范围字符串
 * @param {string[]} dates - 日期数组
 * @returns {string} 日期范围字符串
 */
export function getDateRangeString(dates) {
  if (dates.length === 0) return ''
  if (dates.length === 1) return dates[0]

  const sorted = [...dates].sort()
  const start = sorted[0]
  const end = sorted[sorted.length - 1]

  return `${start} - ${end}`
}

/**
 * 获取星期几的中文名称
 * @param {Date} date - 日期对象
 * @returns {string} 星期几的中文名称
 */
export function getWeekdayName(date) {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[date.getDay()]
}

/**
 * 获取月份的中文名称
 * @param {number} month - 月份 (0-11)
 * @returns {string} 月份的中文名称
 */
export function getMonthName(month) {
  return `${month + 1}月`
}

/**
 * 计算两个时间之间的分钟数
 * @param {string} startTime - 开始时间 ISO 字符串
 * @param {string} endTime - 结束时间 ISO 字符串
 * @returns {number} 分钟数
 */
export function calculateDuration(startTime, endTime) {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return Math.round((end - start) / (1000 * 60))
}
