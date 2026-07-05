/**
 * 主应用组件
 * 整合所有功能模块
 */

import { useState, useEffect, useCallback } from 'react'
import Timer from './components/Timer'
import Schedule from './components/Schedule'
import Calendar from './components/Calendar'
import EditModal from './components/EditModal'
import ReportModal from './components/ReportModal'
import ShortcutsModal from './components/ShortcutsModal'
import { useTimer } from './hooks/useTimer'
import {
  getTasksByDate,
  saveTask,
  updateTask,
  deleteTask,
  getTasksByDates,
  generateId
} from './utils/storage'
import { formatDate, getDateRangeString } from './utils/timeFormat'

export default function App() {
  // 当前标签页
  const [activeTab, setActiveTab] = useState('timer')

  // 当前选中的日期
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()))

  // 今日任务列表
  const [todayTasks, setTodayTasks] = useState([])

  // 选中日期的任务列表
  const [selectedDateTasks, setSelectedDateTasks] = useState([])

  // 多选模式
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedDates, setSelectedDates] = useState([])

  // 编辑弹窗
  const [editingTask, setEditingTask] = useState(null)

  // 报告弹窗
  const [showReport, setShowReport] = useState(false)
  const [reportTasks, setReportTasks] = useState({})

  // 快捷入口弹窗
  const [showShortcuts, setShowShortcuts] = useState(false)

  // 计时器
  const timer = useTimer()

  // 加载今日任务
  const loadTodayTasks = useCallback(() => {
    const today = formatDate(new Date())
    const tasks = getTasksByDate(today)
    setTodayTasks(tasks)
  }, [])

  // 加载选中日期的任务
  const loadSelectedDateTasks = useCallback(() => {
    const tasks = getTasksByDate(selectedDate)
    setSelectedDateTasks(tasks)
  }, [selectedDate])

  // 初始加载
  useEffect(() => {
    loadTodayTasks()
    loadSelectedDateTasks()
  }, [loadTodayTasks, loadSelectedDateTasks])

  // 监听来自悬浮窗的任务保存事件
  useEffect(() => {
    // 检查是否在 Electron 环境中
    if (window.electronAPI && window.electronAPI.onTaskSaved) {
      const unsubscribe = window.electronAPI.onTaskSaved((task) => {
        // 获取任务日期
        const taskDate = formatDate(new Date(task.startTime))
        // 保存任务
        saveTask(taskDate, task)
        // 刷新任务列表
        loadTodayTasks()
        loadSelectedDateTasks()
      })
      return unsubscribe
    }
  }, [loadTodayTasks, loadSelectedDateTasks])

  // 监听快捷入口管理请求（来自快捷入口悬浮窗的 ⚙）
  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onOpenShortcutsManager) {
      const unsubscribe = window.electronAPI.onOpenShortcutsManager(() => {
        setShowShortcuts(true)
      })
      return unsubscribe
    }
  }, [])

  // 当选中日期变化时重新加载
  useEffect(() => {
    loadSelectedDateTasks()
  }, [selectedDate, loadSelectedDateTasks])

  // 任务完成回调
  const handleTaskComplete = (taskData) => {
    // 以任务开始时间所属日期为准（避免跨天导致记录落到错误日期）
    const today = formatDate(new Date(taskData.startTime))
    const task = {
      id: generateId(),
      name: taskData.name,
      startTime: taskData.startTime.toISOString(),
      endTime: taskData.endTime.toISOString(),
      duration: taskData.duration
    }

    saveTask(today, task)
    loadTodayTasks()
  }

  // 编辑任务
  const handleEditTask = (task) => {
    setEditingTask(task)
  }

  // 保存编辑
  const handleSaveEdit = (updatedTask) => {
    const date = formatDate(new Date(updatedTask.startTime))
    updateTask(date, updatedTask.id, updatedTask)
    loadTodayTasks()
    loadSelectedDateTasks()
  }

  // 删除任务
  const handleDeleteTask = (taskId) => {
    if (!confirm('确定要删除这个任务吗？')) return

    const date = formatDate(new Date())
    deleteTask(date, taskId)
    loadTodayTasks()
    loadSelectedDateTasks()
  }

  // 日期选择
  const handleDateSelect = (date) => {
    setSelectedDate(date)
  }

  // 多选日期变化
  const handleSelectedDatesChange = (dates) => {
    setSelectedDates(dates)
  }

  // 取消多选
  const handleCancelSelection = () => {
    setSelectedDates([])
    setMultiSelectMode(false)
  }

  // 生成报告
  const handleGenerateReport = () => {
    if (selectedDates.length === 0) {
      alert('请先选择日期')
      return
    }

    const tasks = getTasksByDates(selectedDates)
    if (Object.keys(tasks).length === 0) {
      alert('所选日期没有任务记录')
      return
    }

    setReportTasks(tasks)
    setShowReport(true)
  }

  // 显示桌面组件
  const handleShowWidget = () => {
    if (window.electronAPI && window.electronAPI.showWidget) {
      window.electronAPI.showWidget()
    }
  }

  const handleShowShortcutsWidget = () => {
    if (window.electronAPI && window.electronAPI.showShortcuts) {
      window.electronAPI.showShortcuts()
      return
    }
    // 非 Electron 环境：打开管理弹窗
    setShowShortcuts(true)
  }

  // 检查是否在 Electron 环境
  const isElectron = window.electronAPI && window.electronAPI.showWidget

  return (
    <div className="app">
      {/* 头部 */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">T</div>
          TaskTimer
        </div>
        <div className="header-actions">
          <button className="shortcuts-toggle-btn" onClick={handleShowShortcutsWidget} title="显示快捷入口悬浮窗">
            <span className="shortcuts-toggle-icon">🔗</span>
            <span className="shortcuts-toggle-text">快捷入口</span>
          </button>
          {isElectron && (
            <button className="widget-toggle-btn" onClick={handleShowWidget} title="显示桌面组件">
              <span className="widget-toggle-icon">📌</span>
              <span className="widget-toggle-text">桌面组件</span>
            </button>
          )}
        </div>
      </header>

      {/* 标签导航 */}
      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'timer' ? 'active' : ''}`}
          onClick={() => setActiveTab('timer')}
        >
          ⏱️ 计时
        </button>
        <button
          className={`tab-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendar')}
        >
          📅 日历
        </button>
      </nav>

      {/* 内容区域 */}
      <main className="main-content">
        {/* 计时页面 */}
        {activeTab === 'timer' && (
          <>
            <Timer timer={timer} onTaskComplete={handleTaskComplete} />
            <Schedule
              date={formatDate(new Date())}
              tasks={todayTasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          </>
        )}

        {/* 日历页面 */}
        {activeTab === 'calendar' && (
          <>
            {/* 选择导出开关 */}
            <div className="calendar-toolbar">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={multiSelectMode}
                  onChange={(e) => {
                    setMultiSelectMode(e.target.checked)
                    if (!e.target.checked) {
                      setSelectedDates([])
                    }
                  }}
                />
                选择导出
              </label>
            </div>

            {/* 多选状态栏 */}
            {multiSelectMode && selectedDates.length > 0 && (
              <div className="selection-bar">
                <div className="selection-info">
                  已选择 {selectedDates.length} 天 ({getDateRangeString(selectedDates)})
                </div>
                <div className="selection-actions">
                  <button
                    className="selection-btn selection-btn-cancel"
                    onClick={handleCancelSelection}
                  >
                    取消
                  </button>
                  <button
                    className="selection-btn selection-btn-generate"
                    onClick={handleGenerateReport}
                  >
                    生成报告
                  </button>
                </div>
              </div>
            )}

            <Calendar
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              selectedDates={selectedDates}
              onDatesChange={handleSelectedDatesChange}
              multiSelectMode={multiSelectMode}
            />

            {/* 选中日期的日程 */}
            {!multiSelectMode && (
              <div className="selected-day-schedule">
                <Schedule
                  date={selectedDate}
                  tasks={selectedDateTasks}
                  onEdit={handleEditTask}
                  onDelete={(taskId) => {
                    deleteTask(selectedDate, taskId)
                    loadSelectedDateTasks()
                    loadTodayTasks()
                  }}
                  showTitle={false}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* 编辑弹窗 */}
      {editingTask && (
        <EditModal
          task={editingTask}
          onSave={handleSaveEdit}
          onClose={() => setEditingTask(null)}
        />
      )}

      {/* 报告弹窗 */}
      {showReport && (
        <ReportModal
          tasksByDate={reportTasks}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* 快捷入口弹窗 */}
      {showShortcuts && <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
