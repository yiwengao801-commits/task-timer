/**
 * 计时器组件
 * 显示计时器和控制按钮
 */

import { useState } from 'react'
import { formatTime } from '../utils/timeFormat'

export default function Timer({ timer, onTaskComplete }) {
  const [taskName, setTaskName] = useState('')

  const handleStart = () => {
    if (!taskName.trim()) {
      alert('请输入任务名称')
      return
    }
    timer.start()
  }

  const handlePause = () => {
    timer.pause()
  }

  const handleResume = () => {
    timer.resume()
  }

  const handleStop = () => {
    const result = timer.stop()
    onTaskComplete({
      name: taskName.trim(),
      ...result
    })

    setTaskName('')
  }

  return (
    <div className="timer-page">
      {/* 任务输入 */}
      <div className="task-input-wrapper">
        <input
          type="text"
          className="task-input"
          placeholder="输入任务名称..."
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          disabled={timer.isRunning}
        />
      </div>

      {/* 计时器显示 */}
      <div className="timer-display">
        <div className="timer-time">{formatTime(timer.elapsedSeconds)}</div>
        <div className="timer-label">
          {timer.isRunning ? '计时中...' : timer.isPaused ? '已暂停' : '准备开始'}
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="timer-controls">
        {timer.isIdle && (
          <button className="btn btn-primary" onClick={handleStart}>
            ▶ 开始
          </button>
        )}

        {timer.isRunning && (
          <>
            <button className="btn" onClick={handlePause}>
              ⏸ 暂停
            </button>
            <button className="btn btn-danger" onClick={handleStop}>
              ⏹ 结束
            </button>
          </>
        )}

        {timer.isPaused && (
          <>
            <button className="btn btn-primary" onClick={handleResume}>
              ▶ 继续
            </button>
            <button className="btn btn-danger" onClick={handleStop}>
              ⏹ 结束
            </button>
          </>
        )}
      </div>
    </div>
  )
}
