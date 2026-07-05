/**
 * 日程表组件
 * 显示指定日期的任务列表
 */

import { formatTimeOfDay, formatDuration } from '../utils/timeFormat'

export default function Schedule({
  date,
  tasks,
  onEdit,
  onDelete,
  showTitle = true
}) {
  // 计算总时长
  const totalMinutes = tasks.reduce((sum, task) => sum + task.duration, 0)

  // 按开始时间排序
  const sortedTasks = [...tasks].sort((a, b) =>
    new Date(a.startTime) - new Date(b.startTime)
  )

  return (
    <div className="schedule-section">
      {showTitle && (
        <div className="section-header">
          <div className="section-title">📅 今日日程</div>
          <div className="section-date">{date}</div>
        </div>
      )}

      {sortedTasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <div className="empty-text">暂无任务记录</div>
        </div>
      ) : (
        <>
          <div className="task-list">
            {sortedTasks.map(task => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={() => onEdit(task)}
                onDelete={() => onDelete(task.id)}
              />
            ))}
          </div>

          <div className="daily-summary">
            <span className="summary-label">
              {showTitle ? '今日总计' : '当日总计'}
            </span>
            <span className="summary-value">
              {formatDuration(totalMinutes)}
              {tasks.length > 0 && ` · ${tasks.length} 个任务`}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * 任务项组件
 */
function TaskItem({ task, onEdit, onDelete }) {
  const startTime = formatTimeOfDay(new Date(task.startTime))
  const endTime = formatTimeOfDay(new Date(task.endTime))

  return (
    <div className="task-item">
      <div className="task-time">
        {startTime} - {endTime}
      </div>
      <div className="task-content">
        <div className="task-name">{task.name}</div>
        <div className="task-duration">{formatDuration(task.duration)}</div>
      </div>
      <div className="task-actions">
        <button className="action-btn" onClick={onEdit} title="编辑">
          ✏️
        </button>
        <button className="action-btn" onClick={onDelete} title="删除">
          🗑️
        </button>
      </div>
    </div>
  )
}
