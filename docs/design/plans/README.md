# 模块计划书索引

> 本目录存放「辰光 Agent 平台」各模块的**实施计划说明书**，基于 [PROJECT_SPEC.md](../../PROJECT_SPEC.md) 与 [PROJECT_SPEC_V2.md](../../spec/PROJECT_SPEC_V2.md) 编写。
>
> 生成日期：2026-11-01

## 计划清单与依赖关系

| # | 计划书 | 当前状态 | 前置依赖 |
|---|--------|---------|---------|
| 1 | [RBAC授权-plan.md](RBAC授权-plan.md) | 授权执行层完全缺失（数据模型已就绪） | —（**根节点**） |
| 2 | [Agent管理-plan.md](Agent管理-plan.md) | 后端基本就绪，缺 monitor/test + 授权 | RBAC授权 |
| 3 | [模型管理-plan.md](模型管理-plan.md) | 后端就绪，缺模型 test + 路径对齐 + 授权 | RBAC授权 |
| 4 | [Prompt管理-plan.md](Prompt管理-plan.md) | 后端就绪，缺迁移 + test + 授权 | RBAC授权 |
| 5 | [知识库管理-plan.md](知识库管理-plan.md) | 后端就绪，缺 reindex + 命名对齐 + 授权 | RBAC授权 |
| 6 | [工具管理-plan.md](工具管理-plan.md) | 后端就绪，缺迁移 + 调用日志 + 授权 | RBAC授权 |
| 7 | [对话日志-plan.md](对话日志-plan.md) | 后端完全缺失 | RBAC授权 |
| 8 | [数据统计-plan.md](数据统计-plan.md) | 后端完全缺失 | RBAC授权、对话日志（数据源） |
| 9 | [工作台-plan.md](工作台-plan.md) | 后端完全缺失 | RBAC授权、数据统计、系统管理扩展 |
| 10 | [系统管理扩展-plan.md](系统管理扩展-plan.md) | 四扩展子模块缺失（用户/角色/权限已就绪） | RBAC授权 |

## 执行顺序建议

```
RBAC授权（根节点，先行）
   ├── Agent管理 / 模型管理 / Prompt管理 / 知识库管理 / 工具管理  （可并行）
   ├── 系统管理扩展 ──────────────────────┐
   └── 对话日志 ── 数据统计 ───────────────┼── 工作台
```

1. **先做 RBAC授权**：它产出 `require_permission` / 权限码种子 / `AuthContext` / `PermissionGuard` / `<Can>`，是所有模块「授权接线」任务的公共前置。
2. **再做可并行的业务补缺**（Agent/模型/Prompt/知识库/工具）：各自独立，可并行推进。
3. **最后做数据消费链路**：对话日志 → 数据统计 → 工作台（工作台还依赖系统管理扩展的告警表）。

## 通用约定（各计划书公共前提）

- 后端模块 5 层：`model.py` / `schema.py` / `repository.py` / `service.py` / `api.py`；响应统一 `{code, message, data}`；分页 `PageResult`；异常 `BizException`。
- 新增表一律走 `alembic revision --autogenerate` + `alembic upgrade head`。
- 授权码格式 `{resource}:{action}`，完整目录见 [RBAC授权-plan.md](RBAC授权-plan.md) 第五节。
- 前端服务层 Mock/API 切换（`VITE_USE_MOCK`）；API 类型字段统一 snake_case；操作按钮用 `<Can>` 门控。
- 后端鉴权是唯一安全边界，前端控制仅是体验优化。
