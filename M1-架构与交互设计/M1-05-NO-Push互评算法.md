# M1-05 NO Push 互评算法

版本：V1.0（M1 设计基线）
依据：PRD §6（规则冻结版，**覆盖** code(1).md 的「积分池/极差校验」旧口径）

> 「NO Push」在本系统 = **随机一对一映射 + 双盲 + 异常检测 + 匿名聚合**。互评单位为团队，不评价成员；每个团队仅队长提交 1 个 0–100 整数综合分。

---

## 1. 核心规则（PRD §6.1）

1. 互评单位是**团队**，不评价团队内部成员。
2. 每队仅队长提交 1 个综合分，0–100 整数。
3. 至少 2 个已提交团队；仅 1 队时关闭该项，管理员按配置补录。
4. 随机生成**一对一映射**：每队恰好评价 1 队、恰好被 1 队评价。
5. 禁止自评；评价关系不重复；任意奇数/偶数团队数均可运行；**不要求**互相评价。
6. 队长只看到被分配团队的匿名资料，不看到对方队长/评分来源身份。
7. 截止后不可改；管理员解锁需填原因并生成新版本。

---

## 2. 映射生成算法（伪代码）

目标：生成一个「无自评的随机双射（derangement）」。双射天然满足「每队评 1、被评 1、关系不重复、全覆盖」；无不动点满足「禁自评」。

```
function generateMapping(submittedTeams):
    n = submittedTeams.length
    if n < 2:
        return null            # 关闭互评，管理员补录

    loop:                       # 拒绝采样，期望约 e≈2.72 次
        perm = shuffle([0 .. n-1])       # Fisher-Yates 随机排列
        hasSelf = any(perm[i] == i for i in 0..n-1)
        if not hasSelf:
            break

    mapping = []
    for i in 0..n-1:
        mapping.append({
            reviewerTeamId: submittedTeams[i].id,
            targetTeamId:   submittedTeams[perm[i]].id   # i 评价 perm[i]
        })

    assert(isBijection(mapping))          # 每队评1且被评1
    assert(noSelfLoop(mapping))           # 无自评
    assert(fullCoverage(mapping))         # 所有队被覆盖
    return mapping
```

**正确性**：`perm` 是 [0..n-1] 的双射 → 每队恰好评价 1 个、恰好被 1 个评价；`perm[i] != i` → 无自评。n≥2 时 derangement 恒存在（含奇数 n）。

**决策（已确认，2026-08-27）**：采用**拒绝采样**生成随机 derangement。PRD 只要求「不要求互相评价」，允许但不强制，因此保留成对互评（2-cycle）的可能性，`perm[i] != i` 仅禁止自评。Sattolo 单环算法作为备选保留（若未来要求彻底禁止成对互评再启用），本版不实现。

```python
# 备选：Sattolo 算法（单环、必无自评、必无成对互评）
import random
def sattolo(n):
    p = list(range(n))
    for i in range(n-1, 0, -1):
        j = random.randint(0, i-1)
        p[i], p[j] = p[j], p[i]
    return p   # 单环：i → p[i]，n>1 时无自评、无 2-cycle
```

---

## 3. 双盲与权限

| 可见方 | 看到什么 | 看不到 |
|---|---|---|
| 评分队长 | 被评团队匿名项目资料 | 对方队长、评分来源身份 |
| 被评团队 | 最终收到的分数（聚合后） | 评分人身份 |
| 管理员 | 完整映射 + 异常记录（审计） | — |
| 大屏/普通用户 | 无映射、无评分来源 | 映射关系、身份 |

- 映射数据（`reviewer↔target↔score`）只存服务端 `peer_review_mappings`/`peer_reviews`，不进入大屏或普通接口。

---

## 4. 异常检测（PRD §6.2，提交时命中即 `suspicious`）

```
function detectAnomaly(review, mapping, context):
    reasons = []

    # 1. 分数非法
    if not isInteger(review.score) or review.score < 0 or review.score > 100:
        reasons.append("score_out_of_range")

    # 2. 映射非法
    if mapping.reviewerTeamId == mapping.targetTeamId:
        reasons.append("self_mapping")
    if duplicateTarget(mapping):
        reasons.append("duplicate_target")
    if not fullCoverage(mapping):
        reasons.append("uncovered_team")

    # 3. 身份/设备/网络特征关联
    if linkedAccount(review.submittedBy, mapping.targetTeamId):
        reasons.append("account_link")
    if sameDeviceOrNetwork(review, mapping.targetTeamId):
        reasons.append("device_network_link")

    # 4. 批量模板 / 完全重复
    if matchesTemplate(review.content):
        reasons.append("template_pattern")
    if exactDuplicate(review):
        reasons.append("duplicate_content")

    # 5. 管理员标记利益冲突
    if adminFlagged(review):
        reasons.append("admin_conflict")

    return reasons   # 空 = 有效
```

命中任一规则 → `status=suspicious`，该份互评**暂不计分**并通知管理员。管理员可复核、作废或要求重新随机分配，并留原因。

---

## 5. 聚合计算（PRD §6.2）

```
function aggregate(teamId, validReviews):
    received = validReviews.filter(r => r.targetTeamId == teamId)
    if received.isEmpty():
        return 0.0                       # 未收到有效评分 → 0 分（管理员按配置补录）
    raw = received[0].score              # 每队恰好收到 1 个评分
    peerScore = round(raw / 100 * 5, 1)  # 0–5，四舍五入 1 位
    return clamp(peerScore, 0, 5)
```

> 有效互评得分 = 收到有效队长评分 / 100 × 5，限制 0–5、四舍五入到 1 位。异常记录不计入发布结果。

---

## 6. 状态流转

```
not_started → open（映射已生成） → submitted（队长已交） → closed（截止/管理员关闭）
                                 ↘ suspicious → 管理员复核 → valid / invalid(作废) / 重分配
```

---

## 7. 与最终分合成

```
final_score = Σ(前六维 composite_score × weight) + peer_review_score   # peer 满分 5
```

互评维度权重 5%，`peer_review_score` 已含 5 分制，故公式中直接相加（不再乘 0.05）。详见 [M1-01 §2.5](../M1-01-数据库Schema与ER图.md)。

---

## 8. 测试要点（对应开发流程 §10 单元测试）

1. n=2/3/4/5/奇数/偶数均能生成合法映射（无自评/无重复/全覆盖）。
2. 映射双射性：每队 out-degree=1 且 in-degree=1。
3. 异常检测 5 条规则各自命中与组合命中。
4. 队长单次评分：重复提交不重复计分（`(mapping_id, reviewer_team_id)` 唯一）。
5. 聚合四舍五入：49→2.5、100→5.0、60→3.0。
6. 双盲：普通用户接口无法拿到映射/身份。
