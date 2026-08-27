# M1-02 REST API 与 WebSocket 契约

版本：V1.0（M1 设计基线）
前缀：`/api/v1`

> 约定：所有写操作鉴权；评语/评分/成员可见性由服务端过滤（前端隐藏≠权限）；写接口默认要求 `Idempotency-Key` 或 `clientMessageId` 幂等。

---

## 1. 通用约定

- **鉴权**：`Authorization: Bearer <JWT>`；WS 握手经 `?token=` 或首帧 `auth` 校验。
- **幂等**：写接口（提交、评分提交、互评提交、改分）使用 `Idempotency-Key` 请求头；重复键返回首次结果，不重复写库。
- **版本**：响应中带 `entityVersion`；条件写可用 `If-Match: <version>` 做乐观锁。
- **分页**：`?cursor=&limit=`（游标）或 `?page=&pageSize=`，返回 `{items, nextCursor}`。
- **错误体**：`{ code, message, details?, traceId }`。

---

## 2. REST 端点

### 2.1 auth

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/auth/login` | 登录，返回 access/refresh token | 公开 |
| POST | `/auth/refresh` | 刷新 token | 公开 |
| POST | `/auth/logout` | 登出并注销连接 | 登录 |
| GET | `/auth/me` | 当前用户 + 全局角色 + 所属比赛 | 登录 |

### 2.2 competition（管理员）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/competitions` | 创建比赛（名称/时区/截止/评分维度/互评开关/大屏开关） | admin |
| GET | `/competitions` | 比赛列表 | 按角色过滤 |
| GET | `/competitions/:id` | 比赛详情 + 当前用户可见上下文 | 参与角色 |
| PATCH | `/competitions/:id` | 修改规则/截止时间 | admin |
| POST | `/competitions/:id/teachers` | 分配教师 | admin |
| DELETE | `/competitions/:id/teachers/:userId` | 移除教师 | admin |
| POST | `/competitions/:id/lock` | 锁定评分（需 reason） | admin |
| POST | `/competitions/:id/unlock` | 解锁（需 reason，生成新版本） | admin |
| POST | `/competitions/:id/publish-dashboard` | 发布大屏 | admin |

### 2.3 team（队长/成员）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/competitions/:id/teams` | 创建团队（含队长/成员/项目资料） | 登录 |
| GET | `/competitions/:id/teams` | 团队列表（按角色脱敏） | 参与角色 |
| GET | `/teams/:id` | 团队详情（成员/资料/附件） | 队员/教师/管理员 |
| PATCH | `/teams/:id` | 修改资料（截止后拒绝，除非管理员解锁） | 队长 |
| POST | `/teams/:id/members` | 邀请/添加成员 | 队长 |
| POST | `/teams/:id/attachments` | 上传附件（走白名单+扫描+200MB 校验） | 队长 |
| POST | `/teams/:id/submit` | 提交（生成版本快照，锁定资料） | 队长 |
| POST | `/teams/:id/unlock` | 管理员解锁（需 reason） | admin |

### 2.4 scoring（教师/管理员）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/teams/:id/score` | 触发 Agent 评分（异步，返回 taskId） | admin/teacher |
| GET | `/teams/:id/score/status` | 查询评分任务状态（processing→agent_scored/needs_review） | admin/teacher |
| GET | `/teams/:id/scores` | 评分版本列表 | admin/teacher（队长仅本人团队公开项） |
| GET | `/teams/:id/scores/:version` | 某版本详情（维度分+证据+评语） | 按可见性 |
| POST | `/teams/:id/scores/:version/review` | 教师复核（approve/suggest_modify/insufficient + 改分 + reason） | teacher |
| POST | `/teams/:id/scores/:version/approve` | 管理员批准发布（合成公式重算） | admin |
| GET | `/teams/:id/evidence` | 证据列表（可定位） | admin/teacher |
| GET | `/teams/:id/comments` | 评语（服务端按 visibility 过滤） | 按可见性 |

> 教师复核请求体示例：
> ```json
> {
>   "dimensionReviews": [
>     { "dimensionKey": "report_quality", "action": "suggest_modify", "score": 88, "reason": "报告完整性不足，缺少测试章节" }
>   ]
> }
> ```
> 规则：修改幅度 >20% 或 Agent 与教师差 >20 → 需管理员二次确认（见 PRD §5.3）。

### 2.5 peer-review（队长 + 管理员）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| POST | `/competitions/:id/peer-review/generate-mapping` | 生成随机一对一映射（算法版本化） | admin |
| GET | `/competitions/:id/peer-review/my-target` | 队长获取被分配团队**匿名**资料 | 队长 |
| POST | `/competitions/:id/peer-review/submit` | 队长单次提交 0–100 整数分 | 队长 |
| GET | `/competitions/:id/peer-review/audit` | 管理员查看映射 + 异常记录（审计） | admin |
| POST | `/competitions/:id/peer-review/:id/resolve` | 管理员作废/重分配（需 reason） | admin |

### 2.6 dashboard（公开，仅 published）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/competitions/:id/dashboard/ranking` | TOP3 + 全量排名（含升降） | 观众 |
| GET | `/competitions/:id/dashboard/radar` | 各维度平均分 | 观众 |
| GET | `/competitions/:id/dashboard/progress` | 已评/未评进度 | 观众 |
| GET | `/competitions/:id/dashboard/wordcloud` | 词云（仅「公示到大屏」评语） | 观众 |
| GET | `/competitions/:id/dashboard/sankey` | 互评映射关系图（**仅管理员**） | admin |
| GET | `/competitions/:id/dashboard/ticker` | 最新评语跑马灯（脱敏 ≤80 字） | 观众 |

### 2.7 audit（管理员）

| 方法 | 路径 | 说明 | 权限 |
|---|---|---|---|
| GET | `/competitions/:id/audit` | 操作日志（分页） | admin |
| GET | `/competitions/:id/audit/scores` | 评分版本审计（全量版本链） | admin |
| GET | `/competitions/:id/audit/peer-reviews` | 互评映射审计 | admin |

---

## 3. 错误码

| 码 | HTTP | 含义 |
|---|---|---|
| `AUTH_REQUIRED` | 401 | 未登录/token 失效 |
| `FORBIDDEN` | 403 | 角色无权（含可见性越权） |
| `NOT_FOUND` | 404 | 资源不存在或对当前角色不可见（不泄露存在性） |
| `VALIDATION_ERROR` | 400 | 参数/分数范围/字段长度不合法 |
| `SCORE_OUT_OF_RANGE` | 422 | 分数越界（0–100 或维度上限） |
| `EVIDENCE_UNRESOLVED` | 422 | 引用不存在的证据（触发 needs_review） |
| `CONFIDENCE_LOW` | 422 | 置信度 <0.70（触发 needs_review） |
| `SUBMIT_LOCKED` | 409 | 截止后修改（需管理员解锁） |
| `DUPLICATE_SUBMIT` | 409 | 重复提交（幂等键命中，返回首次结果） |
| `PEER_NOT_OPEN` | 409 | 互评未开启/已截止 |
| `PEER_SELF_MAPPING` | 422 | 映射自评/覆盖异常（管理员处理） |
| `VERSION_CONFLICT` | 409 | `If-Match` 版本冲突（最后写入优先） |
| `RATE_LIMITED` | 429 | 触发限流 |
| `AGENT_FAILED` | 503 | Agent 调用失败（进入 needs_review） |
| `INTERNAL` | 500 | 服务端错误 |

---

## 4. 权限矩阵（读/写，服务端强制）

| 资源 | admin | teacher | captain(队长) | member(成员) | audience |
|---|---|---|---|---|---|
| 比赛配置/分配教师/锁定/发布 | RW | — | — | — | — |
| 团队资料 | RW(解锁) | R | RW(截止前) | R | — |
| 触发 Agent 评分 | RW | RW | — | — | — |
| Agent 评分/证据/评语 | RW | RW | R(本队+可见性) | R(可见性) | — |
| 教师复核/改分 | R+批准 | RW | — | — | — |
| 互评映射 | RW(审计) | — | — | — | — |
| 提交互评(匿名) | RW | — | W(单次) | — | — |
| 结果排名 | RW | R | R(本队) | R | — |
| 大屏 published 数据 | RW | R | R | R | R(仅公开) |
| 审计日志 | RW | — | — | — | — |

图例：R=读、W=写、RW=读写、—=无。

---

## 5. WebSocket 事件协议

端点：`wss://<host>/ws`（或 `/ws?token=`）。心跳 30s。

### 5.1 消息信封（PRD §7.2）

```json
{
  "messageId": "uuid",        // 服务端分配
  "event": "score.approved",
  "serverTime": "2026-08-26T12:00:00Z",
  "competitionId": "comp-demo",
  "entityId": "team-01",
  "entityVersion": 3,
  "actorId": "user-admin-1",
  "payload": {}
}
```

客户端发送携带 `clientMessageId`（幂等键），服务端 `ack` 确认后客户端删除本地队列。

### 5.2 服务端 → 客户端事件

| event | payload 要点 | 订阅者 |
|---|---|---|
| `score.submitted` | `{ teamId, scoreVersion, status }` | 教师/管理员/本队 |
| `score.approved` | `{ teamId, scoreVersion, finalScore }` | 教师/管理员/本队 |
| `score.needs_review` | `{ teamId, reason, riskFlags }` | 教师/管理员 |
| `comment.updated` | `{ teamId, dimensionKey, visibility }` | 按可见性 |
| `team.submitted` | `{ teamId, version, submittedAt }` | 管理员/教师 |
| `peer_review.submitted` | `{ competitionId, targetTeamId(脱敏) }` | 管理员（聚合结果走 ranking） |
| `peer_review.flagged` | `{ competitionId, reviewId, anomalyReasons }` | 管理员 |
| `ranking.updated` | `{ rankings: [...] }` | 所有订阅者 |
| `progress.updated` | `{ scoredCount, totalCount }` | 管理员/教师/大屏 |
| `dashboard.published` | `{ competitionId }` | 大屏 |
| `connection.ack` | `{ clientMessageId, status }` | 发送方 |
| `snapshot` | `{ entityType, entityId, data }` | 恢复同步时下发 |

### 5.3 客户端 → 服务端事件

| event | 说明 |
|---|---|
| `auth` | 首帧鉴权 |
| `ping` / `pong` | 心跳 |
| `subscribe` | `{ competitionId, scope }`（scope 决定可订阅范围） |
| `score.submit` | 带 `clientMessageId` 幂等 |

### 5.4 断线重连（PRD §7.2）

1. 断线 >30s 前端显示「连接中断」。
2. 恢复后：`subscribe` → 服务端下发 `snapshot`/增量（按 `serverTime` 游标拉取 `event_outbox`）→ 客户端再按序发送本地 IndexedDB 离线队列。
3. 冲突：以服务端 `serverTime` 最后写入为准，被覆盖内容写历史快照。
4. 幂等：`clientMessageId` 命中已处理则直接 `ack`，不重复计分。
5. 大屏只能订阅 `published` scope，无法拿到未公开评语/评分/映射。

---

## 6. 幂等与事务关键路径

| 操作 | 幂等键 | 事务边界 |
|---|---|---|
| 团队提交 | `Idempotency-Key` + `(team_id, version)` 唯一 | 团队状态 + 提交快照同事务 |
| 触发评分 | `taskId` | 任务表（异步） |
| 保存评分版本 | `(team_id, score_version)` 唯一 | `scores` + `score_dimensions` 同事务 |
| 教师改分 | `(score_id, dimension_key)` | `score_dimensions` + `audit_logs` 同事务 |
| 互评提交 | `Idempotency-Key` + `(mapping_id, reviewer_team_id)` | 互评 + 异常检测同事务 |
| WS 消息 | `clientMessageId` | outbox 写入 + 发布同事务 |

---

## 7. 对象存储与附件访问

- 附件上传：`POST /teams/:id/attachments` → 服务端白名单校验 + ClamAV 扫描 → 写对象存储 → 库内落 `object_key` 元数据。
- 附件下载：`GET /teams/:id/attachments/:aid/download` → 服务端按权限校验 → 返回带时效签名 URL（不暴露原始地址，大屏/观众不可见）。
