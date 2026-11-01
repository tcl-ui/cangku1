# 系统管理扩展模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/09-系统管理.md](../../../app/docs/09-系统管理.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)

---

**目标（Goal）**：在已实现的用户/角色/权限管理之上，补齐系统管理的四个扩展子模块——**API Key、审计日志、告警规则、系统配置**，并接入 RBAC 授权。

**架构（Architecture）**：新建 4 组后端资源，按既有 5 层组织（可合并为 `src/modules/system/` 单模块或拆分 `apikey`/`audit`/`alert`/`setting` 四模块）；API Key 用于程序化访问凭证，审计日志记录敏感操作，告警规则含活跃告警生命周期，系统配置以 key-value 存储。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步 + Alembic + `Depends`；前端 React 19 + TS（页面/Mock 已就绪，仅接线）。

**关联规格（Spec）**：`app/docs/09-系统管理.md`（四子模块数据结构）、`app/docs/10-API接口规范.md`。

---

## 一、全局约束

- 用户/角色/权限后端已实现（`/users`/`/roles`/`/permissions`），本期**不动**，仅补四扩展子模块。
- 授权码（本期写入种子数据）：`apikey:list/create/update/delete`、`audit:list/view/export`、`alert:list/create/update/delete`、`setting:view/update`。
- API Key 需脱敏存储/展示（`sk-xxx...xxx`）；审计日志只追加、不修改不删除。
- 新增表需 alembic 迁移。

## 二、范围边界

**范围内**：API Key CRUD；审计日志列表 + 导出；告警规则 CRUD + 活跃告警（确认/解决）+ 告警历史；系统配置读写；授权接线；前端四页接真实数据 + 按钮门控。

**范围外**：告警的**真实触发引擎**（定时任务/指标采集——本期只提供规则与告警的存储/状态流转，触发逻辑由后续运维组件承担）；双因素认证真实实现（仅存配置项）。

## 三、现状与差距

| 子模块 | 后端 | 前端 | 授权 |
|---|---|---|---|
| 用户/角色/权限管理 | ✅ | ✅ | ❌（由 RBAC 计划覆盖） |
| API Key 管理 | ❌ | ✅ | ❌ |
| 审计日志 | ❌ | ✅ | ❌ |
| 告警规则/活跃告警 | ❌ | ✅ | ❌ |
| 系统配置 | ❌ | ✅ | ❌ |

## 四、数据模型（新建表）

- `api_keys`：name, key(脱敏存储/仅首建时返回明文), permissions(all/readonly/agent_only), allowed_agent_ids(JSON), status(active/disabled/expired), rate_limit, expires_at, call_count, last_used_at, created_by。
- `audit_logs`：user_id, username, action(create/update/delete/publish/login/logout/config/upload), module, target_id, target_name, detail, ip_address, user_agent, created_at。
- `alert_rules`：name, description, condition(JSON：metric/operator/threshold/duration/scope), notification(JSON：channels/recipients), status(enabled/disabled), created_by。
- `active_alerts`：rule_id, rule_name, level(info/warning/error/critical), message, triggered_at, status(active/acknowledged/resolved), resolved_at, resolved_by。
- `system_settings`：key(unique), value(JSON), group(basic/api/storage/security/notification), updated_by。

## 五、API 契约

| 端点 | 权限码 | 说明 |
|---|---|---|
| `GET/POST /system/api-keys`、`PUT/DELETE /system/api-keys/{id}` | `apikey:*` | CRUD；创建时返回明文 key，后续只读脱敏 |
| `GET /system/audit-logs` | `audit:list` | 分页 + 筛选（时间/用户/操作/模块） |
| `POST /system/audit-logs/export` | `audit:export` | 导出 CSV |
| `GET/POST /system/alerts/rules`、`PUT/DELETE /system/alerts/rules/{id}` | `alert:*` | 告警规则 CRUD |
| `GET /system/alerts/active` | `alert:list` | 活跃告警列表 |
| `POST /system/alerts/{id}/acknowledge`、`/resolve` | `alert:update` | 确认/解决告警 |
| `GET /system/settings` | `setting:view` | 全部配置（按分组） |
| `PUT /system/settings` | `setting:update` | 更新配置 |

> 说明：前端 API 规范中系统管理走 `/system/*` 前缀；用户/角色/权限已实现的真实后端是 `/users`/`/roles`/`/permissions`。本扩展子模块统一用 `/system/*` 前缀，避免与现有路由冲突（实施时在 `main.py` 用 `prefix="/api/v1/system"` 注册）。

## 六、文件结构

**后端（Create）**：
- 四组资源（建议单模块 `src/modules/system/`，内分 `apikey/audit/alert/setting` 子包，或四个独立模块）
- `alembic/versions/xxxx_创建系统管理扩展表.py`
- Modify：`src/main.py`（注册路由）

**前端（Modify）**：
- `app/src/services/api/system.ts`（补 apikey/audit/alerts/settings 方法）
- `app/src/pages/system/ApiKeys.tsx`/`Audit.tsx`/`Alerts.tsx`/`Settings.tsx`（接真实数据 + 按钮 `<Can>`）

## 七、任务拆解

### 任务 1：数据模型与迁移

- [ ] 1.1 建五张表（见第四节），`alembic/env.py` 导入，autogenerate + upgrade head。
- **验收**：五表存在，`api_keys.key`、`system_settings.key` 唯一约束正确。

### 任务 2：API Key 子模块

- [ ] 2.1 实现 CRUD；创建时生成 `sk-` 前缀随机 key，返回明文一次，落库存哈希/脱敏。
- [ ] 2.2 支持权限范围、Agent 限制、速率限制、过期时间；`call_count`/`last_used_at` 由鉴权消费方更新（预留）。
- **验收**：`pytest` 断言创建返回明文、再次查询脱敏、过期/禁用状态正确。

### 任务 3：审计日志子模块

- [ ] 3.1 实现列表（筛选+分页）+ 导出 CSV；`write_audit()` 工具函数供其他模块写入（预留）。
- **验收**：`pytest` 断言筛选、导出、只追加不修改。

### 任务 4：告警子模块

- [ ] 4.1 告警规则 CRUD；活跃告警列表 + acknowledge/resolve 状态流转。
- **验收**：`pytest` 断言规则 CRUD、告警状态流转（active→acknowledged→resolved）、非法状态转换报错。

### 任务 5：系统配置子模块

- [ ] 5.1 实现按分组读写配置（key-value JSON）；提供默认配置种子。
- **验收**：`pytest` 断言按 key 读写、分组返回、未知 key 报错。

### 任务 6：授权接线

- [ ] 6.1 按第五节挂 `require_permission`；同时将 `apikey/audit/alert/setting` 权限码补入 RBAC 种子数据脚本。
- **验收**：无 `audit:list` 权限访问审计日志返回 403。

### 任务 7：前端接线

- [ ] 7.1 `services/api/system.ts` 补四子模块方法（snake_case）。
- [ ] 7.2 四页接真实数据；操作按钮 `<Can>` 门控；API Key 明文仅创建时展示一次。
- **验收**：`VITE_USE_MOCK=false` 下四页正常；`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **API Key 安全**：明文仅创建时返回一次，落库不可逆哈希；列表永远脱敏，防止泄露。
2. **审计日志完整性**：只追加不修改/删除；预留 `write_audit()` 供登录/关键操作调用，避免审计成为「空表」。
3. **前缀冲突**：用户/角色/权限已用 `/users` 等前缀，扩展子模块统一 `/system/*`，勿与现有路由重叠。
4. **告警触发缺口**：本期只做存储/状态流转，真实触发引擎不在范围，需在 README 明确「告警如何产生」以避免验收误解。
5. 权限码种子数据需与 RBAC 计划的任务 4 协同，避免漏写 `apikey/audit/alert/setting`。
