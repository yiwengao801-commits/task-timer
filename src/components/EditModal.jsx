/**
 * 编辑弹窗组件
 * 用于编辑任务信息
 */

import { useState, useEffect } from 'react'
import { formatTimeOfDay, calculateDuration } from '../utils/timeFormat'

export default function EditModal({ task, onSave, onClose }) {
  const [name, setName] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  // 初始化表单数据
  useEffect(() => {
    if (task) {
      setName(task.name)
      setStartTime(formatTimeOfDay(new Date(task.startTime)))
      setEndTime(formatTimeOfDay(new Date(task.endTime)))
    }
  }, [task])

  // 保存
  const handleSave = () => {
    if (!name.trim()) {
      alert('请输入任务名称')
      return
    }

    // 解析时间
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)

    // 构建新的日期时间
    const startDate = new Date(task.startTime)
    startDate.setHours(startHour, startMin, 0, 0)

    const endDate = new Date(task.endTime)
    endDate.setHours(endHour, endMin, 0, 0)

    // 验证时间
    if (endDate <= startDate) {
      alert('结束时间必须晚于开始时间')
      return
    }

    // 计算新的时长
    const duration = calculateDuration(startDate.toISOString(), endDate.toISOString())

    onSave({
      ...task,
      name: name.trim(),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration
    })

    onClose()
  }

  if (!task) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">✏️ 编辑任务</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">任务名称</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="输入任务名称"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">开始时间</label>
              <input
                type="time"
                className="form-input"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">结束时间</label>
              <input
                type="time"
                className="form-input"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  )
}
