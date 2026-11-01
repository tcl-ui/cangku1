# 工具管理模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/06-工具管理.md](../../../app/docs/06-工具管理.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)

---

**目标（Goal）**：补齐工具**数据库迁移**与**调用日志**能力，并为本模块全部接口接入 RBAC 授权。

**架构（Architecture）**：沿用既有 5 层与 `ToolService`（已含 enable/disable/test）；调用日志需新增 `tool_call_logs` 表与查询端点；鉴权挂 `require_permission`。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步 + Alembic；前端 React 19 + TS。

**关联规格（Spec）**：`app/docs/06-工具管理.md`（含 Function Definition、HTTP API 配置、调用日志 Tab）、`app/docs/10-API接口规范.md`。

---

## 一、全局约束

- 工具三类型：`builtin` / `http_api` / `custom_function`；`function_definition` 为 OpenAI Function Calling 格式 JSON。
- `config` 因类型而异（HttpApiConfig / CustomFunctionConfig）。
- 授权码：`tool:list/view/create/update/delete/test/toggle`。
- 新增表必须经 alembic 迁移。

## 二、范围边界

**范围内**：补缺 `tools` 表迁移；新增 `tool_call_logs` 表 + `GET /tools/{id}/logs`；全端点挂权限；前端服务补 logs + 按钮门控。

**范围外**：真实工具执行引擎（HTTP 调用/代码执行沙箱）；调用日志的实时流式推送。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| 工具 CRUD + enable/disable + test | ✅ 已实现（代码层） |
| `tools` 表迁移 | ❌ **缺失**（model.py 已定义，无迁移） |
| `tool_call_logs` 表 + `GET /tools/{id}/logs` 调用日志 | ❌ 缺失 |
| 全端点 RBAC 授权 | ❌ 缺失 |

## 四、数据模型

- `tools`（已定义，需迁移）：name(unique), description, type, status(enabled/disabled/error), config(JSON), function_definition(JSON), call_count_7d, success_rate, avg_latency, created_by。
- `tool_call_logs`（**新增**）：tool_id(FK CASCADE), agent_id(可空), input_params(JSON), output(JSON/Text), status(success/error), latency, created_at。

## 五、API 契约

**已实现（加鉴权）**：

| 端点 | 权限码 |
|---|---|
| `GET /tools` | `tool:list` |
| `POST /tools` | `tool:create` |
| `GET /tools/{id}` | `tool:view` |
| `PUT /tools/{id}` | `tool:update` |
| `DELETE /tools/{id}` | `tool:delete` |
| `POST /tools/{id}/enable`、`/disable` | `tool:toggle` |
| `POST /tools/{id}/test` | `tool:test` |

**本期补缺**：

| 端点 | 权限码 | 说明 |
|---|---|---|
| `GET /tools/{id}/logs` | `tool:view` | 分页返回该工具调用日志（`PageResult[ToolCallLogRead]`） |

## 六、文件结构

**后端**：
- Create：`alembic/versions/xxxx_创建tools和tool_call_logs表.py`
- Modify：`src/modules/tool/model.py`（新增 `ToolCallLog`）、`schema.py`（`ToolCallLogRead`）、`repository.py`、`service.py`（`list_logs`）、`api.py`（新增 logs + 挂权限）

**前端**：
- Modify：`app/src/services/api/tool.ts`（`getToolLogs`）、`app/src/pages/tool/Detail.tsx`（调用日志 Tab 接真实数据）、`List.tsx`/`Create.tsx`（按钮 `<Can>`）

## 七、任务拆解

### 任务 1：补迁移 + 新增调用日志表

- [ ] 1.1 在 `tool/model.py` 新增 `ToolCallLog`（见第四节），并确保 `alembic/env.py` 导入。
- [ ] 1.2 `alembic revision --autogenerate -m "创建tools和tool_call_logs表"`，检查含 `tools`/`tool_call_logs` 两表 + 外键，`alembic upgrade head`。
- **验收**：迁移成功，`tools`/`tool_call_logs` 表存在。

### 任务 2：补调用日志查询端点

- [ ] 2.1 `schema.py` 定义 `ToolCallLogRead`；`repository.py` 提供分页查询（按 tool_id 过滤）。
- [ ] 2.2 `service.py` 实现 `list_logs(tool_id, params)`；`api.py` 新增 `GET /tools/{tool_id}/logs`。
- **验收**：`pytest` 断言按工具过滤、分页正确。

### 任务 3：RBAC 授权接线

- [ ] 3.1 按第五节映射表挂 `require_permission`。
- **验收**：无 `tool:toggle` 权限无法启停工具；无 `tool:test` 无法测试。

### 任务 4：前端接线

- [ ] 4.1 `services/api/tool.ts` 补 `getToolLogs`；`Detail.tsx` 调用日志 Tab 接真实数据。
- [ ] 4.2 列表/创建/详情操作按钮用 `<Can>` 门控。
- **验收**：`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **迁移缺失**阻断：不补则 `tools` 表不存在。`ToolCallLog` 需与 `Tool` 建 `ondelete=CASCADE`。
2. 调用日志由测试/真实执行写入，本期至少保证 `test` 端点写入一条 log，避免 logs 页永远为空。
3. `config`/`function_definition` 为 JSON，service 层做结构校验（HTTP API 需 method/url/parameters，Function 需 name/parameters），防止非法 JSON 落库。
