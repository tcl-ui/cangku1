# 知识库管理模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/05-知识库管理.md](../../../app/docs/05-知识库管理.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)

---

**目标（Goal）**：补齐知识库**重新索引**端点，统一前后端「文档重试/检索测试」端点命名，并为本模块全部接口接入 RBAC 授权。

**架构（Architecture）**：沿用既有 5 层与 `KnowledgeService`（已含 MinIO 上传、后台分段处理、检索测试）；`reindex` 作为新增方法复用现有异步分段管线；鉴权挂 `require_permission`。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步 + MinIO + 异步后台任务（`BackgroundTasks`）；前端 React 19 + TS。

**关联规格（Spec）**：`app/docs/05-知识库管理.md`、`app/docs/10-API接口规范.md`、`app/docs/知识库后端开发流程.md`（MinIO/异步分段/pgvector 流程）。

---

## 一、全局约束

- 文档上传经 MinIO 存储，分段处理为**后台异步**（`BackgroundTasks`），`status: pending/processing/completed/failed`。
- 分段策略/检索策略配置已支持（`PUT /{kb_id}/config`）。
- 授权码：`knowledge:list/view/create/update/delete/document/segment/test/reindex`。
- 文档/分段为知识库子资源，路由前缀 `/knowledge-bases/{kb_id}/...`。

## 二、范围边界

**范围内**：补缺 `POST /knowledge-bases/{id}/reindex`；统一命名（后端 `retry`/`retrieval-test` ↔ 前端设计 `reprocess`/`test`）；全端点挂权限；前端服务对齐 + 按钮门控。

**范围外**：向量数据库选型变更（沿用现有 pgvector 方案）；文档解析器扩展（OCR 等）；Rerank 模型真实接入。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| 知识库 CRUD + 分段/检索配置 | ✅ 已实现 |
| 文档上传/列表/删除/重试/分段列表 | ✅ 已实现 |
| 分段列表/编辑/删除 | ✅ 已实现 |
| 检索测试（`retrieval-test`） | ✅ 已实现 |
| 数据表 `knowledge_bases`/`documents`/`segments` + 检索配置字段 | ✅ 迁移已存在 |
| `POST /knowledge-bases/{id}/reindex` 重新索引 | ❌ 缺失 |
| 命名对齐（`reprocess`→`retry`、`test`→`retrieval-test`） | ⚠️ 前端需对齐 |
| 全端点 RBAC 授权 | ❌ 缺失 |

## 四、数据模型

复用现有表，**无新表**：

- `knowledge_bases`：name, description, status(ready/indexing/error/empty), embedding_model, 分段策略字段, 检索策略字段, document_count, segment_count, vector_count, storage_size。
- `documents`：knowledge_base_id, file_name, file_type, minio_path, status(pending/processing/completed/failed), segment_count, word_count, error_message。
- `segments`：document_id, position, content, word_count, token_count, keywords(JSON), hit_count, metadata。

## 五、API 契约

**已实现（加鉴权）**：

| 端点 | 权限码 |
|---|---|
| `GET /knowledge-bases` | `knowledge:list` |
| `POST /knowledge-bases` | `knowledge:create` |
| `GET /knowledge-bases/{id}` | `knowledge:view` |
| `PUT /knowledge-bases/{id}` | `knowledge:update` |
| `PUT /knowledge-bases/{id}/config` | `knowledge:update` |
| `DELETE /knowledge-bases/{id}` | `knowledge:delete` |
| `POST/GET/DELETE /knowledge-bases/{id}/documents...` | `knowledge:document` |
| `GET/PUT/DELETE /knowledge-bases/{id}/segments...` | `knowledge:segment` |
| `POST /knowledge-bases/{id}/retrieval-test` | `knowledge:test` |

**本期补缺**：

| 端点 | 权限码 | 说明 |
|---|---|---|
| `POST /knowledge-bases/{id}/reindex` | `knowledge:reindex` | 对知识库全部文档重建索引（后台异步），返回 `{status: "indexing"}` |

## 六、文件结构

**后端**：
- Modify：`src/modules/knowledge/schema.py`、`service.py`（`reindex`）、`api.py`（新增 reindex + 全端点挂权限）

**前端**：
- Modify：`app/src/services/api/knowledge.ts`（`reindexKnowledgeBase`；`retryDocument`/`testRetrieval` 命名与后端对齐）、`app/src/pages/knowledge/*`（按钮 `<Can>`）

## 七、任务拆解

### 任务 1：补缺重新索引端点

- [ ] 1.1 `service.py` 实现 `reindex(kb_id, background_tasks)`：将知识库状态置 `indexing`，后台对所有已完成文档重新分段/向量化。
- [ ] 1.2 `api.py` 新增 `POST /knowledge-bases/{kb_id}/reindex`，返回 `ResponseSchema(data={"status": "indexing"})`。
- **验收**：`pytest` 断言调用后知识库 `status` 变更；缺失知识库抛 404。

### 任务 2：命名对齐

- [ ] 2.1 核对前端 `services/api/knowledge.ts` 的 `reprocessDocument`→`POST /documents/{doc}/retry`、`testRetrieval`→`POST /retrieval-test`，确保与后端端点一致。
- **验收**：`VITE_USE_MOCK=false` 下文档重试/检索测试功能正常。

### 任务 3：RBAC 授权接线

- [ ] 3.1 按第五节映射表挂 `require_permission`（注意子资源端点用 `document`/`segment` 而非 `update`/`delete`）。
- **验收**：无 `knowledge:document` 权限无法上传/删除文档；无 `knowledge:reindex` 权限无法重建索引。

### 任务 4：前端接线

- [ ] 4.1 `services/api/knowledge.ts` 补 `reindexKnowledgeBase`。
- [ ] 4.2 知识库详情/文档/分段页面的操作按钮（新建/编辑/删除/上传/重试/检索测试/重建索引）用 `<Can>` 门控。
- **验收**：`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **子资源权限粒度**：文档/分段操作必须用 `knowledge:document`/`knowledge:segment`，不要误用 `knowledge:update`/`delete`（避免「能删知识库就能删文档」的越权）。
2. `reindex` 是重操作，必须后台异步，接口立即返回，前端轮询知识库 `status`。
3. 上传端点的 `UploadFile` 与 `BackgroundTasks` 参数顺序在 FastAPI 中敏感，新增/调整签名时需保持 `user: User = Depends(get_current_user)` 在鉴权挂载后仍可正常注入。
