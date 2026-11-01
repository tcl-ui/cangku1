# 模型管理模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/03-模型管理.md](../../../app/docs/03-模型管理.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)

---

**目标（Goal）**：补齐模型**连通性测试**端点，统一前后端「供应商」路由前缀，并为本模块（模型 + 供应商）全部接口接入 RBAC 授权。

**架构（Architecture）**：后端分两个模块 `model`（`/models`）与 `provider`（`/providers`）——供应商作为独立模块已实现 CRUD + 连接测试；前端设计文档将两者合并为「模型管理」一个页面模块。本期保持后端拆分，仅在前端服务层对齐前缀。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步；前端 React 19 + TS。

**关联规格（Spec）**：`app/docs/03-模型管理.md`、`app/docs/10-API接口规范.md`。

---

## 一、全局约束

- 模型字段含 `model_id`（API model ID）、`provider_id`、`capabilities`、`context_length`、`input_price`/`output_price`、`is_default`。
- 供应商字段含 `type(openai/anthropic/aliyun/azure/local/custom)`、`endpoint`、多 API Key 负载均衡、`config`。
- 授权码：`model:list/view/create/update/delete/test`、`provider:list/create/update/delete`。

## 二、范围边界

**范围内**：补缺 `POST /models/{id}/test`（模型连通性测试）；统一前后端供应商路径；模型 + 供应商全端点挂权限；前端 `services/api/model.ts` 供应商调用指向 `/providers`。

**范围外**：真实供应商 SDK 对接与流式（测试端点返回连通性探测结果即可）；API Key 加密存储方案（本期沿用现有 JSON 存储，加密属后续安全项）。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| 模型 CRUD（`/models`） | ✅ 已实现 |
| 供应商 CRUD + 连接测试（`/providers`） | ✅ 已实现（独立模块） |
| 数据表 `models` / `model_providers` | ✅ 迁移已存在 |
| `POST /models/{id}/test` 模型连通测试 | ❌ 缺失 |
| 前端路径对齐：设计为 `/models/providers`，后端为 `/providers` | ⚠️ 不一致 |
| 全端点 RBAC 授权 | ❌ 缺失 |

## 四、数据模型

复用现有表，**无新表**：

- `models`：name, model_id, provider_id, capabilities(JSON), context_length, status, input_price, output_price, currency, call_count_7d, token_usage_7d, is_default, config(JSON)。
- `model_providers`：name, type, status, endpoint, api_keys(JSON 多 Key 负载均衡), config(JSON), model_count。

## 五、API 契约

**已实现（加鉴权）**：

| 端点 | 权限码 |
|---|---|
| `GET /models` | `model:list` |
| `POST /models` | `model:create` |
| `GET /models/{id}` | `model:view` |
| `PUT /models/{id}` | `model:update` |
| `DELETE /models/{id}` | `model:delete` |
| `GET /providers` | `provider:list` |
| `POST /providers` | `provider:create` |
| `GET /providers/{id}` | `provider:view`（如未单列则并入 `list`） |
| `PUT /providers/{id}` | `provider:update` |
| `DELETE /providers/{id}` | `provider:delete` |
| `POST /providers/{id}/test` | `model:test`（连接测试复用模型测试权限，或新增 `provider:test`） |

**本期补缺**：

| 端点 | 权限码 | 说明 |
|---|---|---|
| `POST /models/{id}/test` | `model:test` | 连通性测试，返回 `{ok, latency, message}` |

## 六、文件结构

**后端**：
- Modify：`src/modules/model/schema.py`（`ModelTestResponse`）、`service.py`（`test_model`）、`api.py`（新增 test + 挂权限）
- Modify：`src/modules/provider/api.py`（挂权限）

**前端**：
- Modify：`app/src/services/api/model.ts`（`testModel`；供应商方法路径改为 `/providers`）、`app/src/pages/model/*`（按钮 `<Can>` 门控）

## 七、任务拆解

### 任务 1：补缺模型连通测试

- [ ] 1.1 `model/schema.py` 定义 `ModelTestResponse(ok: bool, latency: int, message: str)`。
- [ ] 1.2 `model/service.py` 实现 `test_model(model_id)`：读取 model + provider 配置做连通探测（本期可返回基于 provider 状态的探测结果）。
- [ ] 1.3 `model/api.py` 新增 `POST /models/{model_id}/test`。
- **验收**：`pytest` 断言 test 正常返回、缺失模型抛 404。

### 任务 2：前后端供应商路径对齐

- [ ] 2.1 核对 `services/api/model.ts` 中供应商调用是否指向 `/providers`（而非 `/models/providers`），修正 `getProviders`/`createProvider`/`testProvider` 等。
- [ ] 2.2 确认 `services/api/client.ts` 的 `API_BASE` 拼接后端点正确。
- **验收**：`VITE_USE_MOCK=false` 下供应商页面能加载真实数据。

### 任务 3：RBAC 授权接线

- [ ] 3.1 按第五节映射表为模型/供应商全端点挂 `require_permission`。
- **验收**：无 `model:list` 权限访问 `GET /models` 返回 403；`provider` 同理。

### 任务 4：前端接线

- [ ] 4.1 `services/api/model.ts` 补 `testModel`，类型镜像后端（snake_case）。
- [ ] 4.2 模型/供应商页面的新建/编辑/删除/测试按钮用 `<Can>` 门控。
- **验收**：`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **前缀不一致**是本模块最大坑：前端设计文档写 `/models/providers`，后端实为 `/providers`，务必以代码为准对齐，避免「供应商页面 404」。
2. 供应商连接测试与模型连接测试的权限码归属需明确（建议 `model:test` 复用，避免新增码导致种子数据变动）。
3. `is_default` 语义：设为默认模型时需保证全局唯一（如后端未约束，需在 service 层处理）。
