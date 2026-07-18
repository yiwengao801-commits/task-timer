import { useState, useEffect } from 'react'

export default function SettingsModal({ open, onClose }) {
  const [dataDir, setDataDir] = useState('')
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mergeStatus, setMergeStatus] = useState(null)
  const [mergeLoading, setMergeLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setStatus(null)
    setMergeStatus(null)
    Promise.resolve()
      .then(async () => {
        if (!window.electronAPI?.getDataDir) return
        const dir = await window.electronAPI.getDataDir()
        if (!cancelled) setDataDir(dir || '')
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const handleChoose = async () => {
    setStatus(null)
    if (!window.electronAPI?.chooseDataDir) {
      setStatus({ type: 'error', message: '当前环境不支持选择目录' })
      return
    }
    const dir = await window.electronAPI.chooseDataDir()
    if (!dir) return
    setDataDir(dir)
  }

  const handleApply = async () => {
    setLoading(true)
    setStatus(null)
    try {
      if (!window.electronAPI?.setDataDir) {
        setStatus({ type: 'error', message: '当前环境不支持修改目录' })
        return
      }
      const result = await window.electronAPI.setDataDir(dataDir)
      if (result?.ok) {
        setStatus({
          type: 'success',
          message: result.changed
            ? `已切换到新目录，并迁移 ${result.count || 0} 个文件`
            : '目录未变化，无需切换'
        })
      } else {
        setStatus({ type: 'error', message: result?.error || '切换失败' })
      }
    } catch (e) {
      setStatus({ type: 'error', message: e?.message || '切换失败' })
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async () => {
    setMergeLoading(true)
    setMergeStatus(null)
    try {
      if (!window.electronAPI?.mergeLegacyData) {
        setMergeStatus({ type: 'error', message: '当前环境不支持数据合并' })
        return
      }
      const result = await window.electronAPI.mergeLegacyData()
      if (result?.ok) {
        setMergeStatus({
          type: 'success',
          message: `合并完成，共合并 ${result.total || 0} 条任务记录`
        })
      } else {
        setMergeStatus({ type: 'error', message: result?.error || '合并失败' })
      }
    } catch (e) {
      setMergeStatus({ type: 'error', message: e?.message || '合并失败' })
    } finally {
      setMergeLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content settings-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">设置</div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">当前数据存储目录</label>
            <input
              className="form-input"
              value={dataDir}
              onChange={(e) => setDataDir(e.target.value)}
              placeholder="选择或输入数据目录"
            />
          </div>
          <div className="settings-actions">
            <button className="btn btn-secondary" onClick={handleChoose}>
              选择文件夹
            </button>
            <button className="btn btn-primary" onClick={handleApply} disabled={loading || !dataDir.trim()}>
              {loading ? '处理中...' : '应用'}
            </button>
          </div>

          <div className="settings-merge">
            <div className="settings-merge-title">数据修复</div>
            <div className="settings-merge-desc">
              如果你之前曾用不同方式打开过应用，可能出现多份数据。这里可以合并旧数据到当前目录。
            </div>
            <button
              className="btn btn-secondary"
              onClick={handleMerge}
              disabled={mergeLoading}
            >
              {mergeLoading ? '合并中...' : '合并旧数据'}
            </button>
            {mergeStatus && (
              <div className={`settings-status settings-status-${mergeStatus.type}`}>
                {mergeStatus.message}
              </div>
            )}
          </div>

          {status && (
            <div className={`settings-status settings-status-${status.type}`}>
              {status.message}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
