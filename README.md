# TaskTimer - 任务计时器 + 日程表（桌面版）

一个极简风格的任务计时和日程管理工具，支持桌面悬浮窗和健康提醒。

## 功能特性

### 核心功能
- ⏱️ **计时器** - 输入任务名称，开始计时，自动记录时长
- 📅 **日历视图** - 查看历史任务记录
- ✅ **多选日期** - 勾选多个日期生成工作报告
- 📊 **报告导出** - 支持导出文本和 CSV 格式
- ✏️ **编辑功能** - 可修改任务名称和时间
- 💾 **本地存储** - 数据保存在浏览器 localStorage

### 桌面版专属功能
- 🖥️ **悬浮窗** - 始终置顶的小窗口，随时查看计时状态
- 📌 **置顶功能** - 可切换是否始终置顶
- 💚 **健康提醒** - 每 40-60 分钟随机提醒喝水/走路/护眼/伸展
- 📍 **系统托盘** - 最小化到托盘，不影响其他工作

## 快速开始

### 方式一：网页版（无需安装）

直接打开 `standalone.html` 文件即可使用。

### 方式二：桌面版开发模式

```bash
# 安装依赖
npm install

# 启动开发模式（同时启动 Vite 和 Electron）
npm run electron:dev
```

### 方式三：打包桌面应用

```bash
# 安装依赖
npm install

# 构建并打包
npm run electron:build
```

打包后的文件在 `release` 目录中。

## 项目结构

```
task-timer/
├── electron/                  # Electron 相关文件
│   ├── main.js               # 主进程
│   ├── preload.js            # 主窗口预加载脚本
│   ├── preload-widget.js     # 悬浮窗预加载脚本
│   ├── preload-reminder.js   # 健康提醒预加载脚本
│   ├── widget.html           # 悬浮窗页面
│   └── reminder.html         # 健康提醒页面
│
├── src/                       # React 源代码
│   ├── components/
│   ├── hooks/
│   ├── utils/
│   └── styles/
│
├── standalone.html            # 独立网页版
├── package.json
└── README.md
```

## 健康提醒类型

| 类型 | 图标 | 提醒内容 |
|------|------|----------|
| 💧 喝水 | 蓝色 | 该喝水了！保持水分，精力充沛 |
| 🚶 走路 | 绿色 | 该走动了！站起来活动一下 |
| 👀 护眼 | 黄色 | 让眼睛休息一下！看看远处 |
| 🧘 伸展 | 紫色 | 该伸展一下了！放松肌肉 |

## 悬浮窗功能

| 按钮 | 功能 |
|------|------|
| — | 最小化到标题栏 |
| 📌 | 切换始终置顶（绿色=已置顶） |
| × | 关闭悬浮窗（数据保留） |

## 如何添加/修改功能

### 添加新组件

1. 在 `src/components/` 下新建组件文件
2. 在 `App.jsx` 中引入并使用

```jsx
// 1. 新建组件
// src/components/NewFeature.jsx
export default function NewFeature() {
  return <div>新功能</div>
}

// 2. 在 App.jsx 中引入
import NewFeature from './components/NewFeature'

// 3. 在 JSX 中使用
<NewFeature />
```

### 修改悬浮窗

编辑 `electron/widget.html` 文件。

### 修改健康提醒

编辑 `electron/reminder.html` 和 `electron/main.js` 中的 `healthReminders` 数组。

## 技术栈

- **React 18** - UI 框架
- **Vite** - 构建工具
- **Electron** - 桌面应用框架
- **localStorage** - 数据持久化

## 后续扩展

- [ ] 云端数据同步
- [ ] 深色模式
- [ ] 任务分类/标签
- [ ] 统计图表

## License

MIT
