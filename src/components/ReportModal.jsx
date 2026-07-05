/**
 * 报告弹窗组件
 * 显示选中日期的工作报告
 */

import { useMemo } from 'react'
import { generateReport, exportReportAsText, exportReportAsCSV, downloadFile } from '../utils/reportGenerator'
import { getWeekdayName } from '../utils/timeFormat'

export default function ReportModal({ tasksByDate, onClose }) {
  // 生成报告数据
  const report = useMemo(() => generateReport(tasksByDate), [tasksByDate])

  // 导出为文本
  const handleExportText = () => {
    const text = exportReportAsText(report)
    const filename = `工作报告_${report.dates[0]}_${report.dates[report.dates.length - 1]}.txt`
    downloadFile(text, filename)
  }

  // 导出为 CSV
  const handleExportCSV = () => {
    const csv = exportReportAsCSV(report)
    const filename = `工作报告_${report.dates[0]}_${report.dates[report.dates.length - 1]}.csv`
    downloadFile(csv, filename, 'text/csv')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content report-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">📊 工作报告</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* 报告标题 */}
          <div className="report-header">
            <div className="report-title">工作时长报告</div>
            <div className="report-period">
              {report.dates[0]} - {report.dates[report.dates.length - 1]}
            </div>
          </div>

          {/* 统计摘要 */}
          <div className="report-summary">
            <div className="report-stat">
              <div className="report-stat-value">{report.totalDays}</div>
              <div className="report-stat-label">工作天数</div>
            </div>
            <div className="report-stat">
              <div className="report-stat-value">{report.totalTasks}</div>
              <div className="report-stat-label">任务数量</div>
            </div>
            <div className="report-stat">
              <div className="report-stat-value">{report.totalHours}h</div>
              <div className="report-stat-label">总时长</div>
            </div>
          </div>

          {/* 详细记录 */}
          <div className="report-section">
            <div className="report-section-title">📅 详细记录</div>

            {report.details.map(day => (
              <div key={day.date} className="report-day-group">
                <div className="report-day-header">
                  {day.date} ({day.weekday})
                </div>

                {day.tasks.map(task => (
                  <div key={task.id} className="report-task-item">
                    <div className="report-task-time">
                      {task.startTime}-{task.endTime}
                    </div>
                    <div className="report-task-name">{task.name}</div>
                    <div className="report-task-duration">{task.durationText}</div>
                  </div>
                ))}

                <div className="report-day-total">
                  小计: {day.totalMinutesText}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>关闭</button>
          <button className="btn" onClick={handleExportText}>
            📄 导出文本
          </button>
          <button className="btn btn-success" onClick={handleExportCSV}>
            📊 导出 CSV
          </button>
        </div>
      </div>
    </div>
  )
}
