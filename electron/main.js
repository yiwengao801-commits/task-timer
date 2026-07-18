/**
 * Electron 主进程
 * 管理主窗口和悬浮窗
 */

const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen, shell, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// 主窗口
let mainWindow = null

// 悬浮窗
let widgetWindow = null

// 快捷入口悬浮窗
let shortcutsWindow = null

// 健康提醒窗口
let reminderWindow = null

// 系统托盘
let tray = null

// 是否已置顶（分别控制两个悬浮窗）
let isTimerPinned = true
let isShortcutsPinned = true

// 健康提醒定时器
let healthReminderTimer = null

// ==================== 自定义数据目录 ====================
const DATA_CONFIG_FILE = 'data-config.json'

function dataConfigPath() {
  return path.join(app.getPath('userData'), DATA_CONFIG_FILE)
}

function readDataConfig() {
  try {
    const p = dataConfigPath()
    if (!fs.existsSync(p)) return null
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.customDataDir === 'string' && parsed.customDataDir.trim()) {
      return parsed.customDataDir.trim()
    }
    return null
  } catch (e) {
    console.error('读取数据目录配置失败:', e)
    return null
  }
}

function writeDataConfig(customDataDir) {
  try {
    const p = dataConfigPath()
    fs.writeFileSync(p, JSON.stringify({ customDataDir }, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error('保存数据目录配置失败:', e)
    return false
  }
}

function resolveDataDir() {
  const custom = readDataConfig()
  if (custom && fs.existsSync(custom)) {
    return custom
  }
  return app.getPath('userData')
}

function tasksFile() {
  return path.join(resolveDataDir(), 'task-timer-data.json')
}

function shortcutsFile() {
  return path.join(resolveDataDir(), 'shortcuts.json')
}

const CURRENT_TASK_DATA_VERSION = 1

// 读取任务数据，自动处理版本化和迁移
function readTasks() {
  try {
    const p = tasksFile()
    if (!fs.existsSync(p)) return { version: CURRENT_TASK_DATA_VERSION, data: {} }
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    return migrateTaskData(parsed)
  } catch (e) {
    console.error('读取任务数据失败:', e)
    return { version: CURRENT_TASK_DATA_VERSION, data: {} }
  }
}

// 保存任务数据，统一写入带版本号的格式
function writeTasks(data) {
  try {
    const p = tasksFile()
    const payload = typeof data === 'string' ? JSON.parse(data) : data
    const normalized = normalizeTaskData(payload)
    fs.writeFileSync(p, JSON.stringify(normalized, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error('保存任务数据失败:', e)
    return false
  }
}

// 将任意输入统一成带 version 的结构
function normalizeTaskData(input) {
  if (!input || typeof input !== 'object') {
    return { version: CURRENT_TASK_DATA_VERSION, data: {} }
  }
  if (input.version && input.data !== undefined) {
    return { version: CURRENT_TASK_DATA_VERSION, data: input.data }
  }
  return { version: CURRENT_TASK_DATA_VERSION, data: input }
}

// 数据迁移：旧格式 -> 新格式，后续版本迭代可在此扩展
function migrateTaskData(data) {
  if (!data || typeof data !== 'object') {
    return { version: CURRENT_TASK_DATA_VERSION, data: {} }
  }

  // 已经是新版本格式
  if (data.version && data.data !== undefined) {
    return { version: CURRENT_TASK_DATA_VERSION, data: data.data }
  }

  // 旧格式：没有 version 字段，整体当作 data
  const legacy = { ...data }
  const migrated = { version: CURRENT_TASK_DATA_VERSION, data: legacy }
  // 自动落盘，避免下次再迁移
  writeTasks(migrated)
  return migrated
}

// 合并多个任务数据源
function mergeTaskData(sources) {
  const merged = {}
  let total = 0
  for (const src of sources) {
    if (!src || typeof src !== 'object') continue
    for (const date in src) {
      if (!merged[date]) merged[date] = []
      const existing = new Map(merged[date].map(t => [t.id, t]))
      for (const task of src[date]) {
        if (!existing.has(task.id)) {
          merged[date].push(task)
          total++
        }
      }
    }
  }
  return { data: merged, total }
}

// 查找可能的旧数据目录
function findLegacyDataDirs() {
  const dirs = []
  // 默认 userData
  dirs.push(app.getPath('userData'))
  // 安装目录下的 ProgramData（常见 UAC 虚拟化位置）
  const installDir = path.dirname(app.getPath('exe'))
  const programData = path.join(installDir, 'ProgramData')
  if (fs.existsSync(programData)) {
    dirs.push(programData)
  }
  return dirs
}

function migrateDir(oldDir, newDir) {
  try {
    if (!fs.existsSync(oldDir)) return { ok: true, migrated: false }
    if (!fs.existsSync(newDir)) fs.mkdirSync(newDir, { recursive: true })
    let count = 0
    const entries = fs.readdirSync(oldDir)
    for (const name of entries) {
      const src = path.join(oldDir, name)
      const dst = path.join(newDir, name)
      if (fs.existsSync(dst)) continue
      try {
        const stat = fs.statSync(src)
        if (stat.isDirectory()) {
          if (!fs.existsSync(dst)) fs.mkdirSync(dst, { recursive: true })
          const sub = migrateDir(src, dst)
          if (sub.ok) count += sub.count || 0
        } else if (stat.isFile()) {
          fs.copyFileSync(src, dst)
          count++
        }
        // 跳过 socket、链接、设备文件等不可复制项
      } catch (e) {
        console.warn('迁移跳过:', src, e.message)
      }
    }
    return { ok: true, migrated: true, count }
  } catch (e) {
    console.error('迁移数据失败:', e)
    return { ok: false, error: e.message }
  }
}

// 健康提醒类型（每个类型多条文案）
const healthReminders = {
  water: {
    type: 'water',
    icon: '💧',
    title: '该喝水了！',
    color: '#e7f5ff',
    messages: [
      '你的身体正在沙漠化，再不喝水就要变成仙人掌了！',
      '不喝水皮肤会干到能拿来磨砂纸，看着办吧～',
      '喝口水吧，你的肾已经在写辞职信了。',
      '水杯就在旁边，它是摆设吗？喝！',
      '你知道骆驼怎么死的吗？它以为还能再撑一会儿。',
      '嘴唇干裂的声音我隔着屏幕都听到了。',
      '今天的喝水量：约等于零。优秀。',
      '再不补水，皱纹都要出来开派对了。',
      '你的大脑含水量已不足，请立即充值。',
      '别等口渴了才喝，那时候你已经是个葡萄干了。'
    ]
  },
  walk: {
    type: 'walk',
    icon: '🚶',
    title: '该走动了！',
    color: '#ebfbee',
    messages: [
      '屁股已经跟椅子融为一体了，需要手术分离吗？',
      '再不起来走动，你的腿都要忘记怎么走路了！',
      '恭喜你，成功在工位上生根发芽。',
      '你的步数今天两位数，朋友圈都不好意思发。',
      '椅子说：求求你放过我，我也要休息。',
      '坐太久，腰间盘正在酝酿一场起义。',
      '起来！你的屁股需要呼吸新鲜空气！',
      '再坐下去，你就要长出年轮了。',
      '走动一下，让血液知道你还没去世。'
    ]
  },
  eye: {
    type: 'eye',
    icon: '👀',
    title: '让眼睛休息一下！',
    color: '#fff3bf',
    messages: [
      '眼睛瞪得像铜铃，你是在练功吗？',
      '屏幕不是你的情人，不用盯着看这么深情！',
      '眨眼！现在！你的眼球快干成咸鱼了。',
      '20-20-20法则听过没？没听过就当我没说。',
      '你的眼睛正在向你递交工伤申请。',
      '再看下去，视力表要倒着背了。',
      '眼药水在角落哭泣，它觉得自己被冷落了。',
      '闭眼休息一下，世界不会因此毁灭的。',
      '你看屏幕的时间比看家人都多，屏幕很感动。',
      '眼睛：我累了。你：再坚持一下。眼睛：好的，我瞎了。'
    ]
  },
  stretch: {
    type: 'stretch',
    icon: '🧘',
    title: '该伸展一下了！',
    color: '#f3d9fa',
    messages: [
      '肩膀硬得像石头，你是要修练成铜墙铁壁吗？',
      '小心肩周炎找上门，到时候连抓痒都要请人帮忙！',
      '伸个懒腰吧，你的脊椎在哀嚎。',
      '脖子扭一扭，不然就要焊死在这个角度了。',
      '你的后背正在结茧，很快就能当盾牌用了。',
      '手臂举起来！举不起来？那就对了，赶紧动动！',
      '全身僵硬程度：堪比兵马俑。',
      '转转脖子，听听那美妙的"咔咔"交响乐。',
      '再不拉伸，你就要变成问号形状的人类了。',
      '伸展一下，让筋骨知道主人还活着。'
    ]
  }
}

// 提醒类型列表
const reminderTypes = ['water', 'walk', 'eye', 'stretch']

// 快捷入口默认值（首次使用时写入）——图标与颜色分开（颜色只存纯色）
const DEFAULT_SHORTCUTS = [
  { id: 'sc_google', name: 'Google', url: 'https://www.google.com', icon: 'G', color: '#228be6' },
  { id: 'sc_github', name: 'GitHub', url: 'https://github.com', icon: '🐱', color: '#212529' },
  { id: 'sc_notion', name: 'Notion', url: 'https://www.notion.so', icon: '📝', color: '#212529' },
  { id: 'sc_chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: '🤖', color: '#15aabf' }
]

/**
 * 创建主窗口
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'TaskTimer'
  })

  // 开发环境加载本地服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产环境加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('close', (event) => {
    // 最小化到托盘而不是关闭
    if (!app.isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })
}

/**
 * 创建悬浮窗
 */
function createWidgetWindow() {
  widgetWindow = new BrowserWindow({
    width: 280,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: isTimerPinned,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-widget.js')
    }
  })

  widgetWindow.loadFile(path.join(__dirname, 'widget.html'))

  // 默认位置：右下角
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  widgetWindow.setPosition(width - 300, height - 350)

  widgetWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      widgetWindow.hide()
    }
  })

  // 置顶增强：失焦时若处于 pin 状态，自动重新置顶，减少被其他窗口覆盖
  widgetWindow.on('blur', () => {
    if (isTimerPinned && widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.setAlwaysOnTop(true)
    }
  })
}

/**
 * 创建快捷入口悬浮窗
 */
function createShortcutsWindow() {
  shortcutsWindow = new BrowserWindow({
    width: 280,
    height: 220,
    frame: false,
    transparent: true,
    alwaysOnTop: isShortcutsPinned,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-shortcuts-widget.js')
    }
  })

  shortcutsWindow.loadFile(path.join(__dirname, 'shortcuts-widget.html'))

  shortcutsWindow.webContents.on('did-finish-load', () => {
    // 同步置顶状态
    shortcutsWindow.webContents.send('pin-status-shortcuts', isShortcutsPinned)
    // 触发一次刷新
    shortcutsWindow.webContents.send('shortcuts-updated')
  })

  // 默认位置：右下角（在计时器悬浮窗上方一点）
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  shortcutsWindow.setPosition(width - 300, height - 590)

  shortcutsWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      shortcutsWindow.hide()
    }
  })

  // 置顶增强：失焦时若处于 pin 状态，自动重新置顶，减少被其他窗口覆盖
  shortcutsWindow.on('blur', () => {
    if (isShortcutsPinned && shortcutsWindow && !shortcutsWindow.isDestroyed()) {
      shortcutsWindow.setAlwaysOnTop(true)
    }
  })
}

/**
 * 快捷入口持久化（主进程统一存储，避免不同 origin 的 localStorage 不共享）
 */
function normalizeColor(color) {
  const c = (color || '').toString().trim()
  if (!c) return '#228be6'
  if (c.includes('gradient')) {
    const m = c.match(/#(?:[0-9a-fA-F]{3}){1,2}/)
    return m ? m[0] : '#228be6'
  }
  return c
}

function normalizeShortcutItem(item) {
  if (!item || typeof item !== 'object') return null
  return {
    id: item.id || `sc_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    name: item.name || '未命名',
    url: item.url || '',
    icon: item.icon || '🔗',
    // 兼容旧字段 bg
    color: normalizeColor(item.color || item.bg)
  }
}

function readShortcuts() {
  try {
    const p = shortcutsFile()
    if (!fs.existsSync(p)) return []
    const raw = fs.readFileSync(p, 'utf-8')
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const normalized = parsed.map(normalizeShortcutItem).filter(Boolean).slice(0, 4)
    // 若发生了结构迁移（例如旧版 bg），则写回一次
    if (JSON.stringify(parsed) !== JSON.stringify(normalized)) {
      writeShortcuts(normalized)
    }
    return normalized
  } catch (e) {
    console.error('读取快捷入口失败:', e)
    return []
  }
}

function writeShortcuts(shortcuts) {
  try {
    const p = shortcutsFile()
    const list = Array.isArray(shortcuts) ? shortcuts : []
    const normalized = list.map(normalizeShortcutItem).filter(Boolean).slice(0, 4)
    fs.writeFileSync(p, JSON.stringify(normalized, null, 2), 'utf-8')
    return true
  } catch (e) {
    console.error('保存快捷入口失败:', e)
    return false
  }
}

/**
 * 创建健康提醒窗口
 */
function createReminderWindow() {
  reminderWindow = new BrowserWindow({
    width: 400,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-reminder.js')
    }
  })

  reminderWindow.loadFile(path.join(__dirname, 'reminder.html'))

  // 默认位置：屏幕中央偏上
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  reminderWindow.setPosition(Math.floor((width - 400) / 2), Math.floor(height / 4))

  reminderWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault()
      reminderWindow.hide()
    }
  })
}

/**
 * 显示健康提醒
 */
function showHealthReminder() {
  // 随机选择一个提醒类型
  const typeKey = reminderTypes[Math.floor(Math.random() * reminderTypes.length)]
  const reminder = healthReminders[typeKey]

  // 随机选择一条文案
  const message = reminder.messages[Math.floor(Math.random() * reminder.messages.length)]

  // 构建发送给窗口的数据
  const reminderData = {
    type: reminder.type,
    icon: reminder.icon,
    title: reminder.title,
    message: message,
    color: reminder.color
  }

  if (!reminderWindow) {
    createReminderWindow()
  }

  // 发送提醒数据到窗口
  reminderWindow.webContents.send('show-reminder', reminderData)
  reminderWindow.show()
}

/**
 * 启动健康提醒定时器
 */
function startHealthReminder() {
  // 清除旧的定时器
  if (healthReminderTimer) {
    clearTimeout(healthReminderTimer)
  }

  // 测试模式：40-60 分钟（正式版）
  // 测试时改为：const delay = (10 + Math.random() * 20) * 1000
  const delay = (40 + Math.random() * 20) * 60 * 1000

  healthReminderTimer = setTimeout(() => {
    showHealthReminder()
    // 重新启动定时器
    startHealthReminder()
  }, delay)
}

/**
 * 创建系统托盘
 */
function createTray() {
  // 创建托盘图标（使用更明显的图标）
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAhklEQVQ4T2NkoBAwUqifYdAY8B8I/v/n////Z2JgYPhPZGRk+M/IyPD/5////zMyMvxnZGT4z8jI8J+RkeE/IyPDf0ZGhv+MjAz/GRkZ/jMyMvxnZGT4z8jI8J+RkeE/IyPDf0ZGhv+MjAz/GRkZ/jMyMvxnZGT4z8jI8J+RkeE/IyPDf0ZGhv+MjAwAAJ1zFwYy2KqhAAAAAElFTkSuQmCC'
  )

  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '⏱️ 显示主窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    {
      label: '📌 显示悬浮窗',
      click: () => {
        if (widgetWindow) {
          widgetWindow.show()
          widgetWindow.focus()
        }
      }
    },
    {
      label: '🔗 显示快捷入口悬浮窗',
      click: () => {
        if (shortcutsWindow) {
          shortcutsWindow.show()
          shortcutsWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: '❌ 退出',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setToolTip('TaskTimer - 任务计时器')
  tray.setContextMenu(contextMenu)

  // 点击托盘图标显示主窗口
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  
  // 双击托盘图标显示悬浮窗
  tray.on('double-click', () => {
    if (widgetWindow) {
      widgetWindow.show()
      widgetWindow.focus()
    }
  })
}

// 应用准备就绪
app.whenReady().then(() => {
  createMainWindow()
  createWidgetWindow()
  createShortcutsWindow()
  createTray()

  // 启动健康提醒
  startHealthReminder()

  // 显示悬浮窗
  if (widgetWindow) {
    widgetWindow.show()
  }
  if (shortcutsWindow) {
    shortcutsWindow.show()
  }
})

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// macOS 激活应用
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow()
  }
})

// 应用退出前清理
app.on('before-quit', () => {
  app.isQuitting = true
  if (healthReminderTimer) {
    clearTimeout(healthReminderTimer)
  }
})

// ==================== IPC 通信 ====================

// 切换置顶
ipcMain.on('toggle-pin', () => {
  isTimerPinned = !isTimerPinned
  if (widgetWindow) {
    widgetWindow.setAlwaysOnTop(isTimerPinned)
    widgetWindow.webContents.send('pin-status', isTimerPinned)
  }
})

// 最小化悬浮窗
ipcMain.on('minimize-widget', () => {
  if (widgetWindow) {
    widgetWindow.hide()
  }
})

// 关闭悬浮窗
ipcMain.on('close-widget', () => {
  if (widgetWindow) {
    widgetWindow.hide()
  }
})

// 调整悬浮窗大小
ipcMain.on('resize-widget', (event, isMinimized) => {
  if (widgetWindow) {
    if (isMinimized) {
      // 最小化状态：只显示标题栏，保持原始宽度
      widgetWindow.setSize(280, 48)
    } else {
      // 正常状态
      widgetWindow.setSize(280, 320)
    }
  }
})

// 显示悬浮窗
ipcMain.on('show-widget', () => {
  if (widgetWindow) {
    widgetWindow.show()
    widgetWindow.focus()
  }
})

// 显示快捷入口悬浮窗
ipcMain.on('show-shortcuts', () => {
  if (shortcutsWindow) {
    shortcutsWindow.show()
    shortcutsWindow.focus()
  }
})

// 快捷入口悬浮窗：置顶
ipcMain.on('toggle-pin-shortcuts', () => {
  isShortcutsPinned = !isShortcutsPinned
  if (shortcutsWindow) {
    shortcutsWindow.setAlwaysOnTop(isShortcutsPinned)
    shortcutsWindow.webContents.send('pin-status-shortcuts', isShortcutsPinned)
  }
})

ipcMain.on('close-shortcuts', () => {
  if (shortcutsWindow) {
    shortcutsWindow.hide()
  }
})

ipcMain.on('resize-shortcuts', (event, isMinimized) => {
  if (shortcutsWindow) {
    if (isMinimized) {
      shortcutsWindow.setSize(280, 48)
    } else {
      shortcutsWindow.setSize(280, 220)
    }
  }
})

// 打开主窗口的快捷入口管理弹窗
ipcMain.on('open-shortcuts-manager', () => {
  if (mainWindow) {
    mainWindow.show()
    mainWindow.focus()
    mainWindow.webContents.send('open-shortcuts-manager')
  }
})

// 打开外部链接（系统默认浏览器）
ipcMain.handle('open-external', async (event, url) => {
  try {
    if (typeof url !== 'string' || !url) return false
    await shell.openExternal(url)
    return true
  } catch (error) {
    console.error('打开外部链接失败:', error)
    return false
  }
})

// 获取/保存快捷入口（主进程统一存储）
ipcMain.handle('get-shortcuts', async () => {
  const current = readShortcuts()
  if (current.length === 0) {
    // 首次使用：写入默认值
    writeShortcuts(DEFAULT_SHORTCUTS)
    return DEFAULT_SHORTCUTS
  }
  return current
})

ipcMain.handle('save-shortcuts', async (event, shortcuts) => {
  if (!Array.isArray(shortcuts)) return false
  const ok = writeShortcuts(shortcuts.slice(0, 4))
  if (ok) {
    if (mainWindow) mainWindow.webContents.send('shortcuts-updated')
    if (shortcutsWindow) shortcutsWindow.webContents.send('shortcuts-updated')
  }
  return ok
})

// 关闭健康提醒
ipcMain.on('close-reminder', () => {
  if (reminderWindow) {
    reminderWindow.hide()
  }
})

// 稍后提醒（10分钟后）
ipcMain.on('snooze-reminder', () => {
  if (reminderWindow) {
    reminderWindow.hide()
  }
  // 10分钟后再次提醒
  setTimeout(() => {
    showHealthReminder()
  }, 10 * 60 * 1000)
})

// 获取提醒数据
ipcMain.handle('get-reminder', () => {
  const typeKey = reminderTypes[Math.floor(Math.random() * reminderTypes.length)]
  return healthReminders[typeKey]
})

// 保存任务（从悬浮窗接收，转发给主窗口）
ipcMain.on('save-task', (event, task) => {
  // 转发给主窗口
  if (mainWindow) {
    mainWindow.webContents.send('task-saved', task)
  }
})

// ==================== 自定义数据目录 IPC ====================

ipcMain.handle('get-data-dir', async () => {
  return resolveDataDir()
})

ipcMain.handle('choose-data-dir', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: '选择数据存储目录'
  })
  if (result.canceled || !result.filePaths || !result.filePaths[0]) return null
  return result.filePaths[0]
})

ipcMain.handle('set-data-dir', async (event, newDir) => {
  if (typeof newDir !== 'string' || !newDir.trim()) return { ok: false, error: '路径为空' }
  const target = newDir.trim()
  try {
    if (!fs.existsSync(target)) fs.mkdirSync(target, { recursive: true })
  } catch (e) {
    return { ok: false, error: e.message }
  }
  const oldDir = resolveDataDir()
  if (path.resolve(oldDir) === path.resolve(target)) return { ok: true, changed: false }
  const migration = migrateDir(oldDir, target)
  if (!migration.ok) return { ok: false, error: migration.error || '迁移失败' }
  const saved = writeDataConfig(target)
  if (!saved) return { ok: false, error: '保存配置失败' }
  return { ok: true, changed: true, migrated: !!migration.migrated, count: migration.count || 0 }
})

// ==================== 任务数据 IPC ====================

ipcMain.handle('get-all-tasks', async () => {
  const result = readTasks()
  return result.data || {}
})

ipcMain.handle('save-task', async (event, date, task) => {
  const result = readTasks()
  const data = result.data || {}
  if (!data[date]) data[date] = []
  data[date].push(task)
  const ok = writeTasks(data)
  return ok
})

ipcMain.handle('update-task', async (event, date, taskId, updatedTask) => {
  const result = readTasks()
  const data = result.data || {}
  if (data[date]) {
    const index = data[date].findIndex(t => t.id === taskId)
    if (index !== -1) {
      data[date][index] = { ...data[date][index], ...updatedTask }
      return writeTasks(data)
    }
  }
  return false
})

ipcMain.handle('delete-task', async (event, date, taskId) => {
  const result = readTasks()
  const data = result.data || {}
  if (data[date]) {
    data[date] = data[date].filter(t => t.id !== taskId)
    if (data[date].length === 0) {
      delete data[date]
    }
    return writeTasks(data)
  }
  return false
})

ipcMain.handle('get-legacy-data-dirs', async () => {
  return findLegacyDataDirs()
})

ipcMain.handle('merge-legacy-data', async () => {
  const dirs = findLegacyDataDirs()
  const sources = []
  for (const dir of dirs) {
    const p = path.join(dir, 'task-timer-data.json')
    if (!fs.existsSync(p)) continue
    try {
      const raw = fs.readFileSync(p, 'utf-8')
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') sources.push(parsed)
    } catch (e) {
      console.error('读取旧数据失败:', e)
    }
  }
  if (sources.length <= 1) return { ok: false, error: '未发现可合并的多份数据' }
  const current = readTasks()
  sources.push(current)
  const result = mergeTaskData(sources)
  if (result.total === 0) return { ok: false, error: '没有可合并的新记录' }
  const ok = writeTasks(result.data)
  if (!ok) return { ok: false, error: '写入合并后数据失败' }
  return { ok: true, total: result.total }
})
