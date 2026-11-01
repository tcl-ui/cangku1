# 数据统计模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/08-数据统计.md](../../../app/docs/08-数据统计.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)、[对话日志-plan.md](对话日志-plan.md)（统计数据源）

---

**目标（Goal）**：从零实现数据统计后端模块（用量统计 / 费用分析 / 效果评估），聚合展示平台运营数据，并接入 RBAC 授权。

**架构（Architecture）**：新建 `src/modules/analytics/` 标准 5 层；以**聚合查询**为主（对 `conversations`/`tool_call_logs` 等表按时间/维度 GROUP BY），不引入独立事实表；效果评估聚合自对话标注。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步（聚合 SQL）+ `Depends`；前端 React 19 + TS（页面/Mock 已就绪，仅接线；图表由前端 Recharts 渲染，后端只出数据）。

**关联规格（Spec）**：`app/docs/08-数据统计.md`（Overview/DailyStats/AgentStats/ModelStats/Evaluation）、`app/docs/10-API接口规范.md`。

---

## 一、全局约束

- 授权码：`analytics:view`（用量统计）、`analytics:cost`（费用分析）、`analytics:evaluation`（效果评估）。
- 返回结构对齐前端 `AnalyticsOverview`/`DailyStats`/`AgentStats`/`ModelStats`/`EvaluationOverview`/`AgentEvaluation`/`CommonIssue`（snake_case）。
- 不引入重型 OLAP/时序库，用 SQL 聚合即可。

## 二、范围边界

**范围内**：六个统计端点（overview/daily/by-agent/by-model/costs/evaluation）+ 时间范围参数（今天/7天/30天/自定义）+ 授权接线 + 前端服务接线。

**范围外**：实时流式计算、预算告警触发（属「系统管理扩展-告警规则」）、数据导出（如需另议）。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| 后端 `analytics` 模块 | ❌ 完全缺失 |
| 前端 `AnalyticsUsage`/`AnalyticsCosts`/`AnalyticsEvaluation` + Mock | ✅ 已实现 |
| 授权 | ❌ 缺失 |

## 四、数据模型

**无新表**（聚合查询）。数据源：
- 调用量/Token/费用/延迟：聚合自 `conversations`（total_tokens/total_cost/total_duration）与 `conversation_turns.trace`。
- 按 Agent / 按模型维度：join `agents` / `models` 取名称。
- 效果评估：聚合自 `conversation_annotations`（rating/tags）。

> 若未来数据量增长需预聚合，可后续新增 `daily_metrics` 表，本期不建。

## 五、API 契约

| 端点 | 权限码 | 说明 |
|---|---|---|
| `GET /analytics/overview` | `analytics:view` | 总调用量/总Token/总费用/平均延迟 + 环比趋势 |
| `GET /analytics/daily` | `analytics:view` | 每日时序（calls/inputTokens/outputTokens/cost/avgLatency/successRate） |
| `GET /analytics/by-agent` | `analytics:view` | 按 Agent 聚合（calls/tokens/cost/successRate/avgLatency） |
| `GET /analytics/by-model` | `analytics:view` | 按模型聚合 |
| `GET /analytics/costs` | `analytics:cost` | 费用趋势 + 按模型/Agent 分布 + 预算进度 |
| `GET /analytics/evaluation` | `analytics:evaluation` | 满意度概览 + Agent 排行 + 常见问题分类 + 满意度趋势 |

所有端点统一时间范围参数：`range=today|7d|30d` 或 `start/end`。

## 六、文件结构

**后端（Create）**：
- `src/modules/analytics/schema.py` / `repository.py`（聚合查询）/ `service.py` / `api.py`
- Modify：`src/main.py`（注册路由）

**前端（Modify）**：
- `app/src/services/api/analytics.ts`（六个方法，snake_case）
- `app/src/pages/analytics/*`（接真实数据；费用/评估按钮 `<Can>`）

## 七、任务拆解

### 任务 1：Schema + 聚合查询

- [ ] 1.1 `schema.py` 定义六类响应（镜像前端类型，snake_case，含 `*_trend` 环比字段）。
- [ ] 1.2 `repository.py` 实现按时间范围 + 维度的 GROUP BY 聚合 SQL（`SUM`/`AVG`/`COUNT`）。
- [ ] 1.3 `service.py` 组装并计算环比/占比/排行/预算进度。
- **验收**：`pytest` 以固定样本数据断言聚合结果数值与占比正确、环比符号正确。

### 任务 2：API 路由 + 授权

- [ ] 2.1 `api.py` 实现六个端点，`main.py` 注册。
- [ ] 2.2 挂 `require_permission`（view/cost/evaluation）。
- **验收**：端点返回正确结构；无 `analytics:cost` 权限访问 `/costs` 返回 403。

### 任务 3：前端接线

- [ ] 3.1 `services/api/analytics.ts` 接真实端点。
- [ ] 3.2 用量/费用/评估三页改用真实数据（保留 Mock 回退）；费用/评估入口按权限门控。
- **验收**：`VITE_USE_MOCK=false` 下三页正常；`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **数据源为空**：统计依赖对话日志/工具日志，若上游未写入，所有指标为 0。需在 README 标注依赖关系，并保证空数据不报错、趋势图返回空数组。
2. **时间范围参数**统一（`range` 与 `start/end` 互斥），service 层做边界校验，避免非法日期 SQL 报错。
3. **费用计算**口径需与模型价格（`input_price`/`output_price`）一致；本期可基于 `conversations.total_cost` 或按模型价格 × Token 重算，二选一并写清口径。
4. 三个权限码（view/cost/evaluation）对应三页，避免「有 view 就能看费用」的越权。
