/**
 * 计时器 Hook
 * 管理计时器的状态和逻辑
 */

import { useState, useEffect, useCallback, useRef } from 'react'

export function useTimer() {
  // 计时状态: 'idle' | 'running' | 'paused'
  const [status, setStatus] = useState('idle')

  // 累计秒数
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // 开始时间
  const [startTime, setStartTime] = useState(null)

  // 暂停时的累计时间
  const pausedSecondsRef = useRef(0)

  // 定时器引用
  const timerRef = useRef(null)

  // 清除定时器
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 开始计时
  const start = useCallback(() => {
    if (status === 'idle') {
      // 新开始
      setStartTime(new Date())
      pausedSecondsRef.current = 0
    }
    setStatus('running')
  }, [status])

  // 暂停计时
  const pause = useCallback(() => {
    if (status === 'running') {
      pausedSecondsRef.current = elapsedSeconds
      setStatus('paused')
      clearTimer()
    }
  }, [status, elapsedSeconds, clearTimer])

  // 继续计时
  const resume = useCallback(() => {
    if (status === 'paused') {
      setStatus('running')
    }
  }, [status])

  // 刷新计时器（用于 confirm 阻塞后恢复）
  const refresh = useCallback(() => {
    if (status === 'running' && timerRef.current) {
      // 清除旧的定时器
      clearInterval(timerRef.current)
      // 重新设置开始时间，保持已计时的秒数
      const newStartTime = Date.now() - (elapsedSeconds - pausedSecondsRef.current) * 1000
      setStartTime(new Date(newStartTime))

      // 重新启动定时器
      timerRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - newStartTime) / 1000) + pausedSecondsRef.current
        setElapsedSeconds(elapsed)
      }, 1000)
    }
  }, [status, elapsedSeconds])

  // 结束计时并返回结果
  const stop = useCallback(() => {
    const result = {
      startTime,
      endTime: new Date(),
      duration: Math.round(elapsedSeconds / 60) // 转换为分钟
    }

    // 重置状态
    clearTimer()
    setStatus('idle')
    setElapsedSeconds(0)
    setStartTime(null)
    pausedSecondsRef.current = 0

    return result
  }, [startTime, elapsedSeconds, clearTimer])

  // 重置计时器
  const reset = useCallback(() => {
    clearTimer()
    setStatus('idle')
    setElapsedSeconds(0)
    setStartTime(null)
    pausedSecondsRef.current = 0
  }, [clearTimer])

  // 计时逻辑
  useEffect(() => {
    if (status === 'running') {
      const startTimestamp = startTime ? startTime.getTime() : Date.now()

      timerRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTimestamp) / 1000) + pausedSecondsRef.current
        setElapsedSeconds(elapsed)
      }, 1000)
    }

    return () => clearTimer()
  }, [status, startTime, clearTimer])

  return {
    status,
    elapsedSeconds,
    startTime,
    start,
    pause,
    resume,
    refresh,
    stop,
    reset,
    isRunning: status === 'running',
    isPaused: status === 'paused',
    isIdle: status === 'idle'
  }
}
