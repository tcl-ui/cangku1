# Agent 管理模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/02-Agent管理.md](../../../app/docs/02-Agent管理.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)（授权接线依赖其 `require_permission`）

---

**目标（Goal）**：补齐 Agent 管理后端缺失的**监控数据**与**在线测试**两个端点，并为本模块全部接口接入 RBAC 授权。

**架构（Architecture）**：沿用既有 5 层（model/schema/repository/service/api）与 `AgentService`；监控/测试作为 `AgentService` 新增方法，不引入新表；鉴权通过 `Depends(require_permission(...))` 挂载到每个路由。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步 + `Depends`；前端 React 19 + TS（页面已就绪，仅接线）。

**关联规格（Spec）**：`app/docs/02-Agent管理.md`（页面/字段/版本/监控/测试设计）、`app/docs/10-API接口规范.md`（端点契约）。

---

## 一、全局约束

- 沿用 `ResponseSchema[AgentRead]` / `PageResult[AgentRead]` / `PageParams`。
- 版本语义化字符串（`v1.0`→`v1.1`），发布会创建 `AgentVersion` 快照（已有）。
- 授权码：`agent:list/view/create/update/delete/publish/test/version/toggle`。
- 后端鉴权是唯一安全边界，前端控制仅是体验优化。

## 二、范围边界

**范围内**：补缺 `GET /agents/{id}/monitor`、`POST /agents/{id}/test`；全部端点挂权限；前端 `services/api/agent.ts` 补齐 monitor/test 调用 + 操作按钮 `<Can>` 门控。

**范围外**：真实 LLM 调用引擎的编排与流式返回（测试端点本期返回结构化的模拟/代理响应即可）；对话日志持久化（属「对话日志模块」）。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| Agent CRUD（`/agents`） | ✅ 已实现 |
| 启动/停止（`start`/`stop`） | ✅ 已实现 |
| 发布/版本/回滚（`publish`/`versions`/`rollback`） | ✅ 已实现 |
| 数据表 `agents` / `agent_versions` | ✅ 迁移已存在（`cd4754f0e4da`） |
| `GET /agents/{id}/monitor` 监控数据 | ❌ 缺失 |
| `POST /agents/{id}/test` 测试发送消息 | ❌ 缺失 |
| 全端点 RBAC 授权 | ❌ 缺失 |

## 四、数据模型

复用现有表，**无新表**：

- `agents`：name, description, type(conversation/tool/analysis/creative/workflow), status(active/inactive/error/draft), model_id, config(JSON：model/prompt/rag/tools/advanced), success_rate, call_count_7d, version。
- `agent_versions`：agent_id, version, config 快照, changelog, is_current, published_by, published_at。

监控与测试端点建议返回**聚合/即时计算**数据（不落库）：`AgentMonitorRead`（时序调用量/成功率/延迟/Token/错误分布）与 `AgentTestResponse`（回复内容 + trace 摘要 + token/延迟）。

## 五、API 契约

**已实现（保持，仅加鉴权）**：

| 端点 | 权限码 |
|---|---|
| `GET /agents` | `agent:list` |
| `POST /agents` | `agent:create` |
| `GET /agents/{id}` | `agent:view` |
| `PUT /agents/{id}` | `agent:update` |
| `DELETE /agents/{id}` | `agent:delete` |
| `POST /agents/{id}/start`、`/stop` | `agent:toggle` |
| `POST /agents/{id}/publish` | `agent:publish` |
| `GET /agents/{id}/versions`、`POST /agents/{id}/rollback` | `agent:version` |

**本期补缺**：

| 端点 | 权限码 | 说明 |
|---|---|---|
| `GET /agents/{id}/monitor` | `agent:view`（或并入 `list`） | 返回 `AgentMonitorRead`：调用量/成功率/平均延迟/Token/错误分布，时间范围 `1h/24h/7d/30d` |
| `POST /agents/{id}/test` | `agent:test` | 请求 `{message, params?}`，返回 `AgentTestResponse` |

## 六、文件结构

**后端**：
- Modify：`src/modules/agent/schema.py`（新增 `AgentMonitorRead`/`AgentTestRequest`/`AgentTestResponse`）、`service.py`（新增 `monitor`/`test` 方法）、`api.py`（新增 2 端点 + 全端点挂权限）

**前端**：
- Modify：`app/src/services/api/agent.ts`（补 `getAgentMonitor`/`testAgent`）、`app/src/pages/agent/Monitor.tsx`、`app/src/pages/agent/Test.tsx`、`app/src/pages/agent/List.tsx`/`Detail.tsx`（操作按钮包 `<Can>`）

## 七、任务拆解

### 任务 1：补缺监控端点

- [ ] 1.1 `schema.py` 定义 `AgentMonitorRead`（含时序 `trend: list[{time, calls, success_rate, latency, tokens}]` 与 `error_distribution`）。
- [ ] 1.2 `service.py` 实现 `monitor(agent_id, range)`，返回结构化监控数据（本期可由 `agent_versions`/`call_count_7d` 聚合或返回占位结构，真实指标待「数据统计模块」落地后接入）。
- [ ] 1.3 `api.py` 新增 `GET /agents/{agent_id}/monitor`。
- **验收**：`pytest` 断言 monitor 返回结构与 `AgentMonitorRead` 一致。

### 任务 2：补缺测试端点

- [ ] 2.1 `schema.py` 定义 `AgentTestRequest(message, params?)` 与 `AgentTestResponse(reply, trace, input_tokens, output_tokens, latency)`。
- [ ] 2.2 `service.py` 实现 `test(agent_id, request)`，返回结构化响应（本期可返回基于 agent 配置的固定/代理响应）。
- [ ] 2.3 `api.py` 新增 `POST /agents/{agent_id}/test`。
- **验收**：`pytest` 断言 test 正常返回、缺失 agent 抛 404。

### 任务 3：RBAC 授权接线

- [ ] 3.1 按第五节映射表，为全部端点挂 `Depends(require_permission(...))`（依赖 [RBAC授权-plan.md](RBAC授权-plan.md) 任务 1）。
- **验收**：无 `agent:list` 权限访问 `GET /agents` 返回 `code=403`；超管全通。

### 任务 4：前端接线

- [ ] 4.1 `services/api/agent.ts` 补 `getAgentMonitor(id, range)`、`testAgent(id, payload)`（镜像后端类型，snake_case）。
- [ ] 4.2 `Monitor.tsx`/`Test.tsx` 改用真实 service（保留 Mock 回退）。
- [ ] 4.3 `List.tsx`/`Detail.tsx` 操作按钮（新建/编辑/删除/启动/停止/发布/测试/回滚）用 `<Can>` 门控。
- **验收**：`npm run build`/`lint` 通过；访客账号看不到写操作按钮。

## 八、验收标准与关注点

**关注点**：
1. `monitor`/`test` 的返回结构必须与前端 `AgentMonitor`/`AgentTest` 类型对齐（snake_case），否则 TS 严格模式报错。
2. `test`/`monitor` 不落库，避免与「对话日志/数据统计」模块职责重叠。
3. 授权码 `agent:toggle` 同时覆盖 `start` 与 `stop`；`agent:version` 覆盖 `versions`+`rollback`。
