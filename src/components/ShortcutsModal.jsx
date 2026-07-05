import { useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_SHORTCUTS,
  PRESET_COLORS,
  PRESET_ICONS,
  generateShortcutId,
  getShortcuts,
  saveShortcuts
} from '../utils/shortcutsStorage'

function normalizeUrl(url) {
  const trimmed = (url || '').trim()
  if (!trimmed) return ''
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

function normalizeColor(color) {
  const c = (color || '').trim()
  if (!c) return PRESET_COLORS[0]
  if (c.includes('gradient')) {
    const m = c.match(/#(?:[0-9a-fA-F]{3}){1,2}/)
    return m ? m[0] : PRESET_COLORS[0]
  }
  return c
}

function normalizeShortcut(item) {
  if (!item || typeof item !== 'object') return null
  return {
    id: item.id || generateShortcutId(),
    name: item.name || '未命名',
    url: item.url || '',
    icon: item.icon || '🔗',
    color: normalizeColor(item.color || item.bg)
  }
}

function openExternal(url) {
  const safeUrl = normalizeUrl(url)
  if (!safeUrl) return

  // Electron：用系统默认浏览器打开
  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal(safeUrl)
    return
  }

  // 浏览器：新标签页
  window.open(safeUrl, '_blank', 'noopener,noreferrer')
}

export default function ShortcutsModal({ open, onClose }) {
  const [shortcuts, setShortcuts] = useState(DEFAULT_SHORTCUTS)
  const [editing, setEditing] = useState(null) // {mode:'add'|'edit', item}
  const [form, setForm] = useState({
    name: '',
    url: '',
    icon: PRESET_ICONS[0].value,
    customIcon: '',
    color: PRESET_COLORS[0]
  })

  const persistShortcuts = async (list) => {
    const normalized = (Array.isArray(list) ? list : []).map(normalizeShortcut).filter(Boolean).slice(0, 4)
    // Electron：写入主进程统一存储；浏览器：写入 localStorage
    if (window.electronAPI && window.electronAPI.saveShortcuts) {
      await window.electronAPI.saveShortcuts(normalized)
      return
    }
    saveShortcuts(normalized)
  }

  useEffect(() => {
    if (!open) return
    let cancelled = false

    const load = async () => {
      try {
        if (window.electronAPI && window.electronAPI.getShortcuts) {
          const s = await window.electronAPI.getShortcuts()
          // 兼容迁移：如果旧版把快捷入口存在 localStorage，则在首次打开时导入到主进程存储
          const hasLegacy = typeof localStorage !== 'undefined' && localStorage.getItem('task-timer-shortcuts')
          const legacy = hasLegacy ? getShortcuts() : null
          const isDefaultFromMain =
            Array.isArray(s) &&
            s.length === DEFAULT_SHORTCUTS.length &&
            JSON.stringify(s) === JSON.stringify(DEFAULT_SHORTCUTS)

          const shouldImport = hasLegacy && Array.isArray(legacy) && legacy.length && (!Array.isArray(s) || s.length === 0 || isDefaultFromMain)

          if (shouldImport) {
            await window.electronAPI.saveShortcuts(legacy.slice(0, 4))
            if (!cancelled) setShortcuts(legacy.slice(0, 4).map(normalizeShortcut).filter(Boolean))
            return
          }

          if (!cancelled) {
            const normalized = (Array.isArray(s) ? s : []).map(normalizeShortcut).filter(Boolean)
            setShortcuts(normalized.length ? normalized : DEFAULT_SHORTCUTS)
          }
          return
        }
        if (!cancelled) setShortcuts(getShortcuts().map(normalizeShortcut).filter(Boolean))
      } catch {
        if (!cancelled) setShortcuts(DEFAULT_SHORTCUTS)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (!(window.electronAPI && window.electronAPI.onShortcutsUpdated)) return
    const unsubscribe = window.electronAPI.onShortcutsUpdated(async () => {
      try {
        const s = await window.electronAPI.getShortcuts()
        const normalized = (Array.isArray(s) ? s : []).map(normalizeShortcut).filter(Boolean)
        setShortcuts(normalized.length ? normalized : DEFAULT_SHORTCUTS)
      } catch {
        // ignore
      }
    })
    return unsubscribe
  }, [open])

  const displayShortcuts = useMemo(() => shortcuts.slice(0, 4), [shortcuts])

  const startAdd = () => {
    setEditing({ mode: 'add', item: null })
    setForm({ name: '', url: '', icon: PRESET_ICONS[0].value, customIcon: '', color: PRESET_COLORS[0] })
  }

  const startEdit = (item) => {
    setEditing({ mode: 'edit', item })
    setForm({
      name: item.name || '',
      url: item.url || '',
      icon: item.icon || PRESET_ICONS[0].value,
      customIcon: '',
      color: normalizeColor(item.color || item.bg)
    })
  }

  const closeEdit = () => {
    setEditing(null)
  }

  const chooseIcon = (icon) => {
    setForm((f) => ({ ...f, icon, customIcon: '' }))
  }

  const chooseColor = (color) => {
    setForm((f) => ({ ...f, color }))
  }

  const handleSave = () => {
    const name = (form.name || '').trim()
    const url = normalizeUrl(form.url)
    if (!name) {
      alert('请输入名称')
      return
    }
    if (!url) {
      alert('请输入网址')
      return
    }

    const finalIcon = (form.customIcon || '').trim() ? (form.customIcon || '').trim().slice(0, 2) : form.icon
    const finalColor = normalizeColor(form.color)

    if (editing?.mode === 'add') {
      const next = [{ id: generateShortcutId(), name, url, icon: finalIcon, color: finalColor }, ...shortcuts].slice(0, 4)
      setShortcuts(next)
      persistShortcuts(next)
      closeEdit()
      return
    }
    if (editing?.mode === 'edit' && editing.item) {
      const next = shortcuts.map((s) =>
        s.id === editing.item.id ? { ...s, name, url, icon: finalIcon, color: finalColor } : s
      )
      setShortcuts(next)
      persistShortcuts(next)
      closeEdit()
    }
  }

  const handleDelete = () => {
    if (!editing?.item) return
    if (!confirm('确定要删除这个快捷入口吗？')) return
    const next = shortcuts.filter((s) => s.id !== editing.item.id)
    setShortcuts(next)
    persistShortcuts(next)
    closeEdit()
  }

  if (!open) return null

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal-content shortcuts-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">🔗 快捷入口</div>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="shortcuts-grid">
            {displayShortcuts.map((s) => (
              <div key={s.id} className="shortcut-item" onClick={() => openExternal(s.url)} title={s.url}>
                <div className="shortcut-icon" style={{ background: s.color }}>
                  {s.icon}
                </div>
                <div className="shortcut-name">{s.name}</div>
                <button
                  className="shortcut-edit-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    startEdit(s)
                  }}
                  title="编辑"
                >
                  ✏️
                </button>
              </div>
            ))}

            {displayShortcuts.length < 4 && (
              <button className="shortcut-add" onClick={startAdd} type="button">
                <div className="shortcut-add-icon">➕</div>
                <div className="shortcut-add-text">添加</div>
              </button>
            )}
          </div>

          <div className="shortcuts-hint">最多显示 4 个入口（点击打开，悬停可编辑）。</div>
        </div>
      </div>

      {/* 编辑弹窗（嵌套） */}
      {editing && (
        <div className="modal-overlay shortcuts-edit-overlay" onMouseDown={closeEdit}>
          <div className="modal-content shortcuts-edit-modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{editing.mode === 'add' ? '➕ 添加快捷入口' : '✏️ 编辑快捷入口'}</div>
              <button className="modal-close" onClick={closeEdit}>
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">名称</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="例如：Gmail"
                />
              </div>

              <div className="form-group">
                <label className="form-label">网址</label>
                <input
                  className="form-input"
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="例如：https://mail.google.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">图标</label>
                <div className="icon-selector">
                  {PRESET_ICONS.map((p) => (
                    <div
                      key={p.value}
                      className={`icon-option ${form.icon === p.value && !form.customIcon ? 'selected' : ''}`}
                      style={{ background: '#212529', color: 'white' }}
                      onClick={() => chooseIcon(p.value)}
                      title={p.label}
                    >
                      {p.value}
                    </div>
                  ))}
                </div>
                <div className="custom-icon-row">
                  <input
                    className="form-input"
                    value={form.customIcon}
                    onChange={(e) => setForm((f) => ({ ...f, customIcon: e.target.value }))}
                    placeholder="自定义图标（支持 emoji/字符）"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">颜色</label>
                <div className="color-selector">
                  {PRESET_COLORS.map((c) => (
                    <div
                      key={c}
                      className={`color-option ${normalizeColor(form.color) === c ? 'selected' : ''}`}
                      style={{ background: c }}
                      onClick={() => chooseColor(c)}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer shortcuts-edit-footer">
              <button className="btn btn-danger" onClick={handleDelete} disabled={editing.mode === 'add'}>
                🗑️ 删除
              </button>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={closeEdit}>
                  取消
                </button>
                <button className="btn btn-primary" onClick={handleSave}>
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
