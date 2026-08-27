# CLAUDE.md

## 项目概览

TASK 项目考核打分系统 —— 赛博朋克风格的比赛/课程考核打分平台。核心业务规则**已冻结**，见 `PRD-TASK项目考核打分系统.md`；开发节奏见 `开发流程与实施计划.md`。

## 权威文档优先级（冲突时以排前者为准）

1. `PRD-TASK项目考核打分系统.md`（规则冻结版 V1.0）
2. `M0.5-Agent评分POC实施方案.md`（Agent 评分管线）
3. `开发流程与实施计划.md`（里程碑 M0–M7）
4. `M1-架构与交互设计/`（M1 设计基线）
5. `code (1).md`（早期提示词，**仅作视觉参考**，其「积分池/极差校验」互评口径已被 PRD 覆盖废弃）

## 关键业务规则（务必遵守）

- 评分公式：`维度合成分 = Agent分×70% + 教师分×30%`；`最终分 = Σ(前六维合成分×权重) + NO_Push互评分(0–5)`。
- 前六维：提交速度(10%,系统自动)、报告质量(30%)、交互视觉(20%)、功能体验(15%)、技术性能(10%)、演示效果(10%)；互评(5%)。
- **提交速度由系统注入，Agent/教师均不可改**；Agent 实际只对 5 个需判断维度出分。
- NO Push 互评 = **随机一对一映射（拒绝采样 derangement）+ 队长单次评分 + 双盲 + 异常检测**；有效分 = 收到评分/100×5。
- 状态流转：团队 `draft→submitted→locked→published`；评分 `not_started→processing→agent_scored→needs_review/approved→published`。
- 阈值（未标定，`rubricVersion="poc-uncalibrated"`）：置信度 <0.70、Agent 与教师差异 >20 分、教师改幅 >20% → 需人工/管理员复核。

## 已确认的关键决策（2026-08-27）

- 前端 **React 18 + Vite**（不是 Vue）。
- **评分标准数据驱动、不硬编码**：维度/权重/子项/阈值存 `rubrics` 表（`rubric_version`→`definition` jsonb），评分时注入 Agent；当前评分口径不重要，全交 Agent。
- 互评映射用 **拒绝采样**（允许成对互评，仅禁自评）。

## 工程结构（M2 已搭建）

- `apps/web` React 18 + Vite + Tailwind；`apps/api` NestJS 10。
- `packages/ui` 赛博组件库；`packages/contracts` 前后端共享类型+常量。
- `apps/*` 通过 Vite alias / tsconfig `paths` 直接引用 `packages/*` **源码**（开发期不预构建）。
- npm workspaces（本机 pnpm/yarn/docker 未安装）。
- 质量门禁：`npm run typecheck` / `lint` / `build`（CI 见 `.github/workflows/ci.yml`）。

## 约定

- 分支：trunk-based，禁止直接 push `main`。提交信息走 Conventional Commits。
- 所有关键业务规则在服务端校验，前端仅交互与展示。
- 评分/评语/互评/附件均 append-only 版本化，不覆盖历史。
