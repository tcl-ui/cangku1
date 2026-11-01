# 对话日志模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/07-对话日志.md](../../../app/docs/07-对话日志.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)

---

**目标（Goal）**：从零实现对话日志后端模块（对话列表/详情/标注/导出），支撑前端已就绪的对话日志页面，并接入 RBAC 授权。

**架构（Architecture）**：新建 `src/modules/conversation/` 标准 5 层；对话轮次与链路追踪（Trace）以 JSON 列存储（`conversation_turns` 表或对话主表内嵌 JSON），标注独立存储；导出走同步生成 CSV/JSON。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步 + Alembic + `Depends`；前端 React 19 + TS（页面/Mock 已就绪，仅接线）。

**关联规格（Spec）**：`app/docs/07-对话日志.md`（数据结构 + 链路追踪）、`app/docs/10-API接口规范.md`。

---

## 一、全局约束

- 模块 5 层结构 + `ResponseSchema`/`PageResult`/`PageParams` + `BizException`。
- 授权码：`conversation:list/view/export`。
- 对话数据含链路追踪 `TurnTrace`（steps 含 receive/retrieval/tool_call/prompt_build/llm_call/response）。
- 新增表需 alembic 迁移。

## 二、范围边界

**范围内**：对话列表（多条件筛选 + 分页）、对话详情（轮次 + 链路追踪）、标注（评分/标签/备注）、导出（CSV/JSON）；前端 `services/conversation.ts` 接真实 API + 按钮门控。

**范围外**：对话的**产生**（真实 Agent 运行时写入日志——由「Agent 测试/运行」模块负责落库，本模块只读展示）；流式链路追踪实时推送。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| 后端 `conversation` 模块 | ❌ 完全缺失 |
| 前端 `ConversationList`/`ConversationDetail` + Mock | ✅ 已实现 |
| 授权 | ❌ 缺失 |

## 四、数据模型（新建表）

- `conversations`：id, agent_id(FK), agent_name(冗余), user_id, status(active/completed/error), total_tokens, total_cost, total_duration, satisfaction(positive/negative/null), started_at, ended_at。
- `conversation_turns`：id, conversation_id(FK CASCADE), role(user/assistant), content(Text), position, trace(JSON：`TurnTrace`), created_at。
- `conversation_annotations`：id, conversation_id(FK 唯一), rating(1-5), tags(JSON), notes(Text), annotated_by, annotated_at。

> 说明：链路追踪 `trace` 用 JSON 列存 `{steps[], input_tokens, output_tokens, total_duration, model}`，避免为 trace step 单独建表带来的复杂度。

## 五、API 契约（对齐前端 API 规范）

| 端点 | 权限码 | 说明 |
|---|---|---|
| `GET /conversations` | `conversation:list` | 分页 + 筛选（agent_id/status/时间范围/user_id/keyword/标注状态/满意度） |
| `GET /conversations/{id}` | `conversation:view` | 详情：轮次 + 链路追踪 + 标注 |
| `POST /conversations/{id}/annotate` | `conversation:view` | 保存标注（rating/tags/notes） |
| `POST /conversations/export` | `conversation:export` | 按当前筛选导出 CSV/JSON |

## 六、文件结构

**后端（Create，全部）**：
- `src/modules/conversation/model.py` / `schema.py` / `repository.py` / `service.py` / `api.py`
- `alembic/versions/xxxx_创建conversations表.py`
- Modify：`src/main.py`（注册路由）

**前端（Modify）**：
- `app/src/services/api/conversation.ts`（`getConversations`/`getConversation`/`annotateConversation`/`exportConversations`）
- `app/src/pages/conversation/List.tsx`/`Detail.tsx`（按钮 `<Can>`、标注保存）

## 七、任务拆解

### 任务 1：数据模型与迁移

- [ ] 1.1 建 `conversation/model.py` 三张表（见第四节），`alembic/env.py` 导入 metadata。
- [ ] 1.2 `alembic revision --autogenerate` + `upgrade head`。
- **验收**：三表存在，外键/唯一约束正确。

### 任务 2：Repository + Service + Schema

- [ ] 2.1 `schema.py` 定义 `ConversationRead`/`ConversationDetailRead`/`ConversationTurnRead`/`AnnotateRequest`（镜像前端类型，snake_case）。
- [ ] 2.2 `repository.py` 继承 `BaseRepository[Conversation]`，`SEARCH_FIELDS` 覆盖 agent_name/user_id；实现多条件筛选查询。
- [ ] 2.3 `service.py` 实现列表（分页+筛选）、详情（组装 turns + trace + annotation）、标注（upsert）、导出（生成 CSV 字符串）。
- **验收**：`pytest` 断言分页筛选、详情组装、标注 upsert、导出格式。

### 任务 3：API 路由

- [ ] 3.1 `api.py` 实现四个端点，`main.py` 注册 `/api/v1`。
- **验收**：`pytest` 或 `curl` 验证四端点返回正确 `ResponseSchema`。

### 任务 4：RBAC 授权接线

- [ ] 4.1 挂 `require_permission`（list/view/export）。
- **验收**：无权限返回 403。

### 任务 5：前端接线

- [ ] 5.1 `services/api/conversation.ts` 接真实端点（snake_case 类型）。
- [ ] 5.2 `List.tsx` 筛选/分页/导出、`Detail.tsx` 链路追踪/标注保存接真实数据。
- [ ] 5.3 导出/标注按钮 `<Can>` 门控。
- **验收**：`VITE_USE_MOCK=false` 下页面功能正常；`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **链路追踪 JSON 结构**必须与前端 `TurnTrace` 完全一致（`steps[].type` 六类枚举、`inputTokens/outputTokens/totalDuration/model`），否则详情页链路渲染空白。
2. `satisfaction`/标注状态派生自 `annotations`，列表接口需正确 join/聚合，避免每行 N+1。
3. 导出用 `POST /export` 携带当前筛选条件（而非 GET），以支持复杂筛选。
4. 对话数据来源依赖 Agent 运行/测试模块写入；本模块只读，需在 README 说明「无写入方时列表为空」。
