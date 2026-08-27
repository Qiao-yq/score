# TASK 项目考核打分系统

赛博朋克风格的比赛/课程项目考核打分系统。业务规则以 [PRD-TASK项目考核打分系统.md](./PRD-TASK项目考核打分系统.md)（规则冻结版）为准，开发节奏见 [开发流程与实施计划.md](./开发流程与实施计划.md)。

## 当前进度

| 里程碑 | 状态 |
|---|---|
| M0 需求冻结 | ✅ 已完成（PRD V1.0） |
| M0.5 Agent 评分 POC | 方案已定，待执行（见 [M0.5-Agent评分POC实施方案.md](./M0.5-Agent评分POC实施方案.md)） |
| M1 架构与交互设计 | ✅ 已完成（见 [M1-架构与交互设计/](./M1-架构与交互设计/)） |
| M2 工程基础设施 | 🔨 本仓库脚手架（见下） |
| M3 核心评分闭环 | 未开始 |

## 目录结构

```
.
├── apps/
│   ├── web/           # React 18 + Vite + Tailwind（评分端/教师复核/移动端/大屏）
│   └── api/           # NestJS（auth/competition/team/scoring/peer-review/dashboard/audit/realtime）
├── packages/
│   ├── ui/            # 赛博 UI 组件库（NeonSlider/GlitchButton/…）
│   └── contracts/     # 前后端共享 TS 类型 + 常量（维度/评分/WS 事件/错误码）
├── infra/             # docker-compose（PostgreSQL/Redis/MinIO）
├── M1-架构与交互设计/  # M1 设计文档 + 可运行设计系统原型
├── M0.5-Agent评分POC实施方案.md
├── PRD-TASK项目考核打分系统.md
└── 开发流程与实施计划.md
```

## 技术栈

- 前端：React 18 + Vite 5 + TypeScript + TailwindCSS 3 + Framer Motion
- 后端：NestJS 10 + TypeScript
- 存储：PostgreSQL 16（事实源）+ Redis 7（连接/缓存/发布订阅）+ S3 兼容对象存储（MinIO）
- 工程：npm workspaces + ESLint 9 + Prettier + commitlint + husky

## 快速开始

```bash
# 1. 安装依赖（生成 package-lock.json）
npm install

# 2. 启动本地依赖（需 Docker；本机未装 Docker 可先跳过）
docker compose -f infra/docker-compose.yml up -d

# 3. 复制环境变量
cp .env.example .env

# 4. 启动前端（http://localhost:5173）
npm run dev:web

# 5. 启动后端（http://localhost:3000/api/v1/health）
npm run dev:api
```

## 常用命令

| 命令 | 说明 |
|---|---|
| `npm run dev:web` | 启动前端 dev server |
| `npm run dev:api` | 启动后端 dev server（watch） |
| `npm run typecheck` | 全工作区类型检查 |
| `npm run lint` | 全工作区 ESLint |
| `npm run build` | 全工作区构建 |
| `npm run test` | 全工作区测试 |
| `npm run format` | Prettier 格式化 |

## 开发约定

- **分支模型**：trunk-based（`main` + `feature/*`），禁止直接向 `main` 推送。
- **提交信息**：Conventional Commits（`feat:`/`fix:`/`docs:`/`refactor:`…），由 commitlint 校验。
- **内部包引用**：`apps/*` 通过 Vite alias / tsconfig `paths` 直接引用 `packages/*` 源码，开发期无需先 build。
- **评分规则不硬编码**：维度/权重/阈值由 `rubrics` 表数据驱动（见 M1-01 §2.9），评分交 Agent。

## 环境要求

- Node ≥ 20（本机 22.18）
- npm ≥ 10
- Docker Desktop（可选，用于本地 PG/Redis/MinIO）
