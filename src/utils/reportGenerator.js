/**
 * 报告生成工具函数
 */

import { formatDuration, formatTimeOfDay, getWeekdayName } from './timeFormat'

/**
 * 生成工作报告数据
 * @param {Object} tasksByDate - 按日期分组的任务数据
 * @returns {Object} 报告数据
 */
export function generateReport(tasksByDate) {
  const dates = Object.keys(tasksByDate).sort()
  const report = {
    dates,
    totalDays: dates.length,
    totalTasks: 0,
    totalMinutes: 0,
    details: []
  }

  dates.forEach(date => {
    const tasks = tasksByDate[date]
    const dateObj = new Date(date)
    const dayInfo = {
      date,
      weekday: getWeekdayName(dateObj),
      tasks: [],
      totalMinutes: 0
    }

    tasks.forEach(task => {
      report.totalTasks++
      report.totalMinutes += task.duration
      dayInfo.totalMinutes += task.duration

      dayInfo.tasks.push({
        id: task.id,
        name: task.name,
        startTime: formatTimeOfDay(new Date(task.startTime)),
        endTime: formatTimeOfDay(new Date(task.endTime)),
        duration: task.duration,
        durationText: formatDuration(task.duration)
      })
    })

    dayInfo.totalMinutesText = formatDuration(dayInfo.totalMinutes)
    report.details.push(dayInfo)
  })

  report.totalMinutesText = formatDuration(report.totalMinutes)
  report.totalHours = (report.totalMinutes / 60).toFixed(1)

  return report
}

/**
 * 导出报告为文本格式
 * @param {Object} report - 报告数据
 * @returns {string} 文本格式的报告
 */
export function exportReportAsText(report) {
  let text = '================================\n'
  text += '       工作时长报告\n'
  text += '================================\n\n'
  text += `日期范围: ${report.dates[0]} - ${report.dates[report.dates.length - 1]}\n`
  text += `工作天数: ${report.totalDays} 天\n`
  text += `任务数量: ${report.totalTasks} 个\n`
  text += `总时长: ${report.totalMinutesText}\n\n`
  text += '--------------------------------\n'
  text += '详细记录:\n'
  text += '--------------------------------\n\n'

  report.details.forEach(day => {
    text += `【${day.date} ${day.weekday}】\n`
    day.tasks.forEach(task => {
      text += `  ${task.startTime}-${task.endTime}  ${task.name}  (${task.durationText})\n`
    })
    text += `  小计: ${day.totalMinutesText}\n\n`
  })

  text += '================================\n'
  text += `报告生成时间: ${new Date().toLocaleString()}\n`
  text += '================================\n'

  return text
}

/**
 * 导出报告为 CSV 格式
 * @param {Object} report - 报告数据
 * @returns {string} CSV 格式的报告
 */
export function exportReportAsCSV(report) {
  let csv = '日期,星期,任务名称,开始时间,结束时间,时长(分钟)\n'

  report.details.forEach(day => {
    day.tasks.forEach(task => {
      csv += `${day.date},${day.weekday},${task.name},${task.startTime},${task.endTime},${task.duration}\n`
    })
  })

  return csv
}

/**
 * 下载文件
 * @param {string} content - 文件内容
 * @param {string} filename - 文件名
 * @param {string} mimeType - MIME 类型
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
