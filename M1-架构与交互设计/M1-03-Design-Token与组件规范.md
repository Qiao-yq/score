# M1-03 Design Token 与组件规范

版本：V1.0（M1 设计基线）
框架：React 18 + Vite + TailwindCSS + Framer Motion

> 设计目标：赛博朋克视觉（深黑背景 + 霓虹青/激光粉/警告黄 + 毛玻璃 + 斜切角 + 发光 + CRT 扫描线），同时满足响应式（375/768/1024/1920/3440）与可访问性（`prefers-reduced-motion`）。

---

## 1. 色彩 Token

### 1.1 语义色

```css
:root {
  /* 背景 */
  --bg-void:      #0a0a0f;   /* 深黑主背景 */
  --bg-deep:      #120c24;   /* 深紫蓝面板背景 */
  --bg-elevated:  rgba(18, 12, 36, 0.6);  /* 毛玻璃卡 */
  --bg-scanline:  rgba(255,255,255,0.02);

  /* 主强调 */
  --accent-cyan:  #00f3ff;   /* 霓虹青：主交互/选中/连接中 */
  --accent-pink:  #ff00aa;   /* 激光粉：强调/错误/动效 */
  --accent-yellow:#fcee0a;   /* 警告黄：警示/待复核 */

  /* 文字 */
  --text-hi:      #f5f7ff;   /* 高亮白 */
  --text-base:    #c6cbe8;   /* 正文 */
  --text-dim:     #6d7399;   /* 弱化/禁用 */

  /* 语义 */
  --success:      #00ff9f;   /* 成功/已通过 */
  --warning:      #fcee0a;
  --danger:       #ff2d55;   /* 错误/异常 */
  --info:         #00f3ff;
}
```

### 1.2 Tailwind 映射（`tailwind.config` 节选）

```js
export default {
  theme: {
    extend: {
      colors: {
        void: '#0a0a0f', deep: '#120c24',
        cyan: '#00f3ff', pink: '#ff00aa', yellow: '#fcee0a',
        hi: '#f5f7ff', base: '#c6cbe8', dim: '#6d7399',
        success: '#00ff9f', danger: '#ff2d55',
      },
      fontFamily: {
        display: ['Orbitron', 'Rajdhani', 'monospace'],
        body: ['Rajdhani', 'ui-sans-serif', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 8px rgba(0,243,255,.6), 0 0 24px rgba(0,243,255,.25)',
        'glow-pink': '0 0 8px rgba(255,0,170,.6), 0 0 24px rgba(255,0,170,.25)',
        'glow-yellow':'0 0 8px rgba(252,238,10,.6), 0 0 24px rgba(252,238,10,.25)',
      },
      keyframes: {
        glitch: { /* 位移 + 色散 */ },
        scan:   { '0%':{transform:'translateY(-100%)'}, '100%':{transform:'translateY(100%)'} },
        flicker:{ /* 亮度闪烁 */ },
        codeRain:{ /* 十六进制滚动 */ },
      },
    },
  },
}
```

---

## 2. 字体与排版

| 用途 | 字体 | 说明 |
|---|---|---|
| 大屏标题/数字 | Orbitron | 等宽未来感，用于 TOP3 排名、分数大字 |
| 页面标题/按钮 | Rajdhani | 紧凑无衬线，标题用 |
| 正文 | Rajdhani / 系统无衬线 | 保证可读性 |
| 数据/代码 | JetBrains Mono | 十六进制、证据编号、时间戳 |

字号基线（`rem`）：`--text-xs: 0.75rem; --text-sm: 0.875rem; --text-md: 1rem; --text-lg: 1.25rem; --text-xl: 1.5rem; --text-2xl: 2rem; --text-hero: clamp(2.5rem, 6vw, 5rem)`。

---

## 3. 间距 / 圆角 / 边框

- 间距 4px 网格：`--space-1: 4px … --space-16: 64px`。
- 圆角：`--radius-sm: 2px; --radius-md: 4px; --radius-lg: 8px`（赛博风偏锐利，少用大圆角）。
- 边框：1px 霓虹描边 + **斜切角**（`clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))`）。
- 角落装饰：卡片四角的小三角/直角标记（`::before/::after`）。

---

## 4. 发光与叠加层

```css
.text-glow  { text-shadow: 0 0 6px currentColor, 0 0 18px currentColor; }
.glass      { background: var(--bg-elevated); backdrop-filter: blur(8px); }
.crt-overlay{ /* 全局 CRT 扫描线，可开关 */
  background: repeating-linear-gradient(0deg, rgba(255,255,255,.02) 0 1px, transparent 1px 3px);
}
.scanline   { /* 上下移动的高亮扫光 */
  background: linear-gradient(180deg, transparent, rgba(0,243,255,.06), transparent);
}
```

---

## 5. 动效分级（核心/增强/可关闭）

| 级别 | 内容 | 是否默认开 | 受 `prefers-reduced-motion` |
|---|---|---|---|
| **核心** | 评分提交反馈、按钮 hover 发光、连接状态灯、列表进入过渡 | ✅ 开 | 是（降为无过渡） |
| **增强** | Glitch 故障抖动、CRT 扫描线、代码雨、光扫过动画 | ✅ 开（可关） | 是 |
| **可关闭** | 粒子爆炸、3D 奖杯、音效 | ❌ 默认关/低端关 | 是 |

- 全局开关：大屏「暂停动画」「降低动效」；低端设备自动关 3D/粒子（检测 GPU/内存/UA）。
- 实现：`lib/motion` 暴露 `useMotionLevel()`，组件按级别条件渲染。

---

## 6. 组件清单

### 6.1 基础组件

| 组件 | 说明 | 关键交互 |
|---|---|---|
| `GlitchButton` | 霓虹按钮，hover 触发故障抖动/光扫 | hover/focus-visible |
| `NeonSlider` | 霓虹发光评分滑块（0–100） | 键盘 ↑↓/拖拽/触屏 |
| `TagChip` | 预置标签 `#架构优雅` 等，点击填入 | click |
| `NeonInput` / `NeonTextarea` | 输入控件（焦点发光 + 错误态） | focus/error |
| `ScoreCard` | 维度评分卡（分数 + 置信度 + 证据数） | 展开证据 |
| `VisibilitySelector` | 评语可见性三选一 | radio/segmented |
| `ConnectionStatus` | 顶部连接状态（绿呼吸=同步，红闪=断连） | 实时 |
| `Toast` | 提交成功/失败反馈 | 自动消失 |

### 6.2 业务组件

| 组件 | 说明 |
|---|---|
| `DimensionScorePanel` | 教师复核维度面板（Agent 分 vs 教师分 + 改分 + reason） |
| `EvidenceLocator` | 证据定位卡（文件名/页码/截图缩略） |
| `CommentEditor` | 亮点/建议双字段 + 标签 + 可见性 |
| `PeerReviewTarget` | 队长互评匿名资料卡（不显示对方身份） |
| `ScoreModal`（移动端） | 评分全屏 Modal |
| `TabBar`（移动端） | 底部 Tab 导航 |

### 6.3 大屏组件（详见 M1-06）

`RankingPodium`（TOP3）、`RadarChart`、`ProgressBar`、`WordCloud`、`SankeyDiagram`、`Ticker`、`GlitchText`。

---

## 7. 响应式断点

| 断点 | 布局 |
|---|---|
| `>1024px` PC | 侧边导航 + 多列评分 + 完整图表 |
| `768–1024px` 平板 | 双列、导航折叠汉堡、图表降级 |
| `<768px` 移动 | 单列瀑布流、底部 Tab、全屏 ScoreModal、左滑评语 |

```js
screens: { sm: '768px', md: '1024px', lg: '1440px', xl: '1920px', '2xl': '3440px' }
```

---

## 8. 可访问性要求

- 所有输入控件键盘可达（Tab 顺序、`aria-*`、focus-visible 霓虹描边）。
- 色彩对比：正文 `#c6cbe8` 对 `#0a0a0f` 满足 WCAG AA；分数大字用发光不牺牲对比。
- `prefers-reduced-motion: reduce` 关闭全部非必要动效。
- 触屏目标 ≥44×44px。
