/**
 * 快捷入口存储（localStorage）
 */

const SHORTCUTS_KEY = 'task-timer-shortcuts'

export const PRESET_ICONS = [
  { label: 'G', value: 'G' },
  { label: '🐱', value: '🐱' },
  { label: '📝', value: '📝' },
  { label: '🤖', value: '🤖' },
  { label: '✉️', value: '✉️' },
  { label: '▶️', value: '▶️' },
  { label: '🐦', value: '🐦' },
  { label: '💬', value: '💬' },
  { label: '📌', value: '📌' },
  { label: '📊', value: '📊' },
  { label: '📁', value: '📁' },
  { label: '🎨', value: '🎨' }
]

// 颜色：仅纯色（与 UI 一致）
export const PRESET_COLORS = [
  '#228be6', // 蓝
  '#40c057', // 绿
  '#fab005', // 黄
  '#fa5252', // 红
  '#845ef7', // 紫
  '#e64980', // 粉
  '#15aabf', // 青
  '#212529' // 深灰
]

export const DEFAULT_SHORTCUTS = [
  { id: 'sc_google', name: 'Google', url: 'https://www.google.com', icon: 'G', color: '#228be6' },
  { id: 'sc_github', name: 'GitHub', url: 'https://github.com', icon: '🐱', color: '#212529' },
  { id: 'sc_notion', name: 'Notion', url: 'https://www.notion.so', icon: '📝', color: '#212529' },
  { id: 'sc_chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖', color: '#15aabf' }
]

function normalizeColor(color) {
  const c = (color || '').trim()
  if (!c) return PRESET_COLORS[0]
  // 只接受纯色：hex / rgb(a) / hsl 等这里都先简单放行，实际 UI 只提供纯色调色板
  if (c.includes('gradient')) {
    const m = c.match(/#(?:[0-9a-fA-F]{3}){1,2}/)
    return m ? m[0] : PRESET_COLORS[0]
  }
  return c
}

function migrateShortcutItem(item) {
  if (!item || typeof item !== 'object') return null
  const icon = item.icon || '🔗'
  const color = normalizeColor(item.color || item.bg)
  return {
    id: item.id || generateShortcutId(),
    name: item.name || '未命名',
    url: item.url || '',
    icon,
    color
  }
}

export function getShortcuts() {
  try {
    const raw = localStorage.getItem(SHORTCUTS_KEY)
    if (!raw) return DEFAULT_SHORTCUTS
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_SHORTCUTS
    const migrated = parsed.map(migrateShortcutItem).filter(Boolean)
    return migrated.length ? migrated : DEFAULT_SHORTCUTS
  } catch {
    return DEFAULT_SHORTCUTS
  }
}

export function saveShortcuts(shortcuts) {
  const list = Array.isArray(shortcuts) ? shortcuts : []
  const normalized = list.map(migrateShortcutItem).filter(Boolean).slice(0, 4)
  localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(normalized))
}

export function generateShortcutId() {
  return `sc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}
