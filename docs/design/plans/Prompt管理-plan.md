# Prompt 管理模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/04-Prompt管理.md](../../../app/docs/04-Prompt管理.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)

---

**目标（Goal）**：补齐 Prompt **数据库迁移**与**在线测试**端点，并为本模块全部接口接入 RBAC 授权。

**架构（Architecture）**：沿用既有 5 层与 `PromptService`（已含 publish/versions/rollback 版本能力）；测试端点作为新增方法，不引入新表；鉴权通过 `require_permission` 挂载。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步 + Alembic；前端 React 19 + TS。

**关联规格（Spec）**：`app/docs/04-Prompt管理.md`（含 `{{variable}}` 变量机制）、`app/docs/10-API接口规范.md`。

---

## 一、全局约束

- Prompt 内容支持 `{{variable}}` 变量；`variables` 为 `PromptVariable[]`（name/type/description/defaultValue/required）。
- 版本语义化（`v1.0`），`PromptVersion` 存内容快照 + `is_current` + changelog。
- 授权码：`prompt:list/view/create/update/delete/publish/test/version`。
- 新增表必须经 `alembic revision --autogenerate` 生成迁移并 `upgrade head`。

## 二、范围边界

**范围内**：补缺 `prompts`/`prompt_versions` 迁移；补缺 `POST /prompts/{id}/test`；全端点挂权限；前端 `services/api/prompt.ts` 补 test + 按钮门控。

**范围外**：真实 LLM 渲染（测试端点返回变量替换后的预览/代理响应）；模板市场与多用户协作。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| Prompt CRUD + publish + versions + rollback | ✅ 已实现（代码层） |
| `prompts` / `prompt_versions` 表迁移 | ❌ **缺失**（model.py 已定义，无 alembic 迁移） |
| `POST /prompts/{id}/test` | ❌ 缺失 |
| 全端点 RBAC 授权 | ❌ 缺失 |

## 四、数据模型

表已在 `src/modules/prompt/model.py` 定义，需生成迁移：

- `prompts`：name, description, category, tags(JSON), content(Text), variables(JSON), version, status(draft/published), created_by。
- `prompt_versions`：prompt_id(FK CASCADE), version, content(Text 快照), changelog, is_current, published_by, published_at。

## 五、API 契约

**已实现（加鉴权）**：

| 端点 | 权限码 |
|---|---|
| `GET /prompts` | `prompt:list` |
| `POST /prompts` | `prompt:create` |
| `GET /prompts/{id}` | `prompt:view` |
| `PUT /prompts/{id}` | `prompt:update` |
| `DELETE /prompts/{id}` | `prompt:delete` |
| `POST /prompts/{id}/publish` | `prompt:publish` |
| `GET /prompts/{id}/versions`、`POST /prompts/{id}/rollback` | `prompt:version` |

**本期补缺**：

| 端点 | 权限码 | 说明 |
|---|---|---|
| `POST /prompts/{id}/test` | `prompt:test` | 请求 `{variables: {name: value}}`，返回变量替换后的渲染内容或模型响应 |

## 六、文件结构

**后端**：
- Modify：`src/modules/prompt/schema.py`（`PromptTestRequest`/`PromptTestResponse`）、`service.py`（`test`）、`api.py`（新增 test + 挂权限）
- Create：`alembic/versions/xxxx_创建prompts和prompt_versions表.py`（autogenerate）

**前端**：
- Modify：`app/src/services/api/prompt.ts`（`testPrompt`）、`app/src/pages/prompt/Create.tsx`/`List.tsx`/`Versions.tsx`（按钮 `<Can>`）

## 七、任务拆解

### 任务 1：补数据库迁移

- [ ] 1.1 确认 `prompt/model.py` 已导入 `alembic/env.py` 的 metadata；执行 `alembic revision --autogenerate -m "创建prompts和prompt_versions表"`。
- [ ] 1.2 检查生成的迁移脚本含 `prompts`/`prompt_versions` 两表 + 外键 `ondelete=CASCADE`；执行 `alembic upgrade head`。
- **验收**：`alembic upgrade head` 后数据库中 `prompts`/`prompt_versions` 表存在；`pytest` 通过。

### 任务 2：补缺测试端点

- [ ] 2.1 `schema.py` 定义 `PromptTestRequest(variables: dict)` 与 `PromptTestResponse(rendered: str)`。
- [ ] 2.2 `service.py` 实现 `test(prompt_id, variables)`：读取 content，用 `variables` 替换 `{{var}}`（缺省用 `defaultValue`，缺失必填变量报错）。
- [ ] 2.3 `api.py` 新增 `POST /prompts/{prompt_id}/test`。
- **验收**：`pytest` 断言变量替换正确、缺失必填变量抛业务异常。

### 任务 3：RBAC 授权接线

- [ ] 3.1 按第五节映射表挂 `require_permission`。
- **验收**：无 `prompt:list` 权限返回 403。

### 任务 4：前端接线

- [ ] 4.1 `services/api/prompt.ts` 补 `testPrompt`。
- [ ] 4.2 `Create.tsx`（测试 Tab）/`List.tsx`/`Versions.tsx` 操作按钮用 `<Can>` 门控。
- **验收**：`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **迁移缺失**是阻断项：不补迁移则 `prompts` 表不存在，接口运行即 500。务必先 `autogenerate` + `upgrade head`。
2. `{{variable}}` 替换需处理「变量未传」时的回退策略（`defaultValue` / 报错），与前端变量定义一致。
3. `tags`/`variables` 用 JSON 列存储，service 层需做 JSON↔Pydantic 转换，避免直接透传 dict 导致的类型漂移。
