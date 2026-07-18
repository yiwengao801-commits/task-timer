/**
 * 日历组件
 * 显示月历并支持日期选择
 */

import { useState, useEffect } from 'react'
import { formatDate } from '../utils/timeFormat'
import { hasTasks } from '../utils/storage'

export default function Calendar({
  selectedDate,
  onDateSelect,
  selectedDates = [],
  onDatesChange,
  multiSelectMode = false
}) {
  // 当前显示的月份
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [hasTaskDates, setHasTaskDates] = useState(new Set())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  // 获取当月第一天
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = firstDay.getDay()

  // 预加载当前月份有任务的日期
  useEffect(() => {
    let cancelled = false
    const dates = []
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    // 上月补齐
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      dates.push(formatDate(new Date(year, month - 1, daysInPrevMonth - i)))
    }
    // 当月
    for (let i = 1; i <= daysInMonth; i++) {
      dates.push(formatDate(new Date(year, month, i)))
    }

    Promise.all(dates.map(d => hasTasks(d).then(r => ({ d, r }))))
      .then(results => {
        if (cancelled) return
        setHasTaskDates(new Set(results.filter(x => x.r).map(x => x.d)))
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [year, month, firstDayOfWeek])

  // 获取当月天数
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // 获取上月天数
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  // 今天的日期
  const today = formatDate(new Date())

  // 生成日历数据
  const calendarDays = []

  // 上月的日期
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i
    const date = formatDate(new Date(year, month - 1, day))
    calendarDays.push({ day, date, isOtherMonth: true })
  }

  // 当月的日期
  for (let i = 1; i <= daysInMonth; i++) {
    const date = formatDate(new Date(year, month, i))
    calendarDays.push({ day: i, date, isOtherMonth: false })
  }

  // 下月的日期（补齐6行）
  const remainingDays = 42 - calendarDays.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = formatDate(new Date(year, month + 1, i))
    calendarDays.push({ day: i, date, isOtherMonth: true })
  }

  // 切换月份
  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  // 点击日期
  const handleDayClick = (date) => {
    if (multiSelectMode) {
      // 多选模式
      const newSelectedDates = selectedDates.includes(date)
        ? selectedDates.filter(d => d !== date)
        : [...selectedDates, date]
      onDatesChange(newSelectedDates)
    } else {
      // 单选模式
      onDateSelect(date)
    }
  }

  // 判断日期是否被选中（多选模式）
  const isChecked = (date) => selectedDates.includes(date)

  return (
    <div className="calendar-page">
      {/* 月份导航 */}
      <div className="calendar-header">
        <div className="calendar-title">
          {year}年{month + 1}月
        </div>
        <div className="calendar-nav">
          <button className="nav-btn" onClick={prevMonth}>‹</button>
          <button className="nav-btn" onClick={nextMonth}>›</button>
        </div>
      </div>

      {/* 星期标题 */}
      <div className="calendar-weekdays">
        {['日', '一', '二', '三', '四', '五', '六'].map(day => (
          <div key={day} className="weekday">{day}</div>
        ))}
      </div>

      {/* 日历网格 */}
      <div className="calendar-grid">
        {calendarDays.map((item, index) => {
          const isToday = item.date === today
          const isSelected = item.date === selectedDate
          const hasTask = hasTaskDates.has(item.date)
          const checked = isChecked(item.date)

          let className = 'calendar-day'
          if (item.isOtherMonth) className += ' other-month'
          if (isToday) className += ' today'
          if (isSelected && !multiSelectMode) className += ' selected'
          if (hasTask) className += ' has-tasks'
          if (checked && multiSelectMode) className += ' checked'

          return (
            <div
              key={index}
              className={className}
              onClick={() => !item.isOtherMonth && handleDayClick(item.date)}
            >
              {item.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
