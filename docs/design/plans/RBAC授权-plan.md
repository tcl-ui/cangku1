# RBAC 授权模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC_V2.md](../../spec/PROJECT_SPEC_V2.md)
> **关联原型**：[RBAC授权模块原型设计说明书.md](../ui/RBAC授权模块原型设计说明书.md)
> **关联基线**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)

---

**目标（Goal）**：在已实现的 RBAC 数据模型（用户/角色/权限 5 张表 + 认证）之上，补齐「授权执行层」，实现后端接口级鉴权 + 前端菜单/路由/按钮三层权限控制的端到端闭环。

**架构（Architecture）**：后端采用**声明式依赖注入**——新增 `require_permission` / `require_permissions` / `require_roles` 三个 FastAPI 依赖，逐个路由显式声明所需权限码；`is_superuser` 绕过一切校验，权限每次请求实时查库（变更即时生效）。前端采用 **React Context**（`AuthProvider` + `useAuth`）持有用户与权限码集合，提供 `hasPermission` 供菜单/按钮/路由门控。

**技术栈**：后端 FastAPI + SQLAlchemy 2.0 异步 + `Depends`；前端 React 19 + TS 严格模式 + React Context（**不引入全局状态库**）。无新表、无第三方授权引擎。

**关联规格（Spec）**：`docs/spec/PROJECT_SPEC_V2.md`（本文档即其落地实施计划）。

---

## 一、全局约束（Global Constraints）

- 复用 V1 现有 5 张表（`users`/`roles`/`permissions`/`user_roles`/`role_permissions`），**不新增/修改表结构**。
- 鉴权逻辑放 `src/core/deps.py`，与现有 `get_current_user`/`PageParams` 共存。
- 异常沿用 `BizException(code, message)`（HTTP 200 + 业务码），新增 `403` 无权限码。
- 响应格式不变：`{code, message, data}`；前端 `apiClient` 已能识别非 200 业务码。
- **默认拒绝（白名单制）**：除显式公开接口外，其余接口一律要求登录 + 权限。
- 权限码格式 `{resource}:{action}`（全小写），精确匹配，本期**不做通配符**。
- 前端遵循「无全局状态库」约定，用 React Context；严格模式需避免 `noUnusedLocals`/类型错误。
- 权限码写入种子数据走 ORM（防 SQL 注入）；超管密码由环境变量注入，禁止硬编码弱口令。

## 二、范围边界（Scope）

**范围内**：
1. 后端接口级鉴权（声明式依赖注入 + 超管绕过 + 实时查库）。
2. 权限码规范与完整目录（约 67 项，覆盖 12 模块）。
3. 登录响应 / `GET /users/me` 下发 `roles` + `permissions`。
4. 前端三层权限控制（菜单显隐、路由守卫、按钮级 `<Can>`）。
5. 内置种子数据（`admin` 超管账号 + 完整权限清单 + 建议内置角色 `ops`/`viewer`）。

**范围外（本期不做，见 V2 第十一章）**：行级数据权限、字段级权限、多租户隔离、审计日志、API Key 鉴权、动态数据脱敏。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| RBAC 数据模型（5 张表 + 认证 + 验证码） | ✅ 已实现 |
| `src/core/deps.py` 权限依赖（`require_permission` 等） | ❌ 缺失 |
| `get_current_user` 加载权限链 | ❌ 缺失（仅加载角色，未加载角色→权限） |
| 403 错误码常量 | ❌ 缺失（`exceptions.py` 仅 400/404/500） |
| 登录/`/me` 返回权限码 | ❌ 缺失（`TokenResponse` 仅 `access_token`） |
| 前端 `AuthContext`/`useAuth`/`PermissionGuard`/`<Can>`/403 页 | ❌ 缺失 |
| 权限码种子数据 / 超管账号 | ❌ 缺失 |

## 四、数据模型

**无新表**。复用现有关系：`Users ─M:N→ Roles ─M:N→ Permissions`。

新增 Pydantic Schema（非 ORM）：

```python
# src/modules/user/schema.py
class CurrentUserRead(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    roles: list[str]          # 角色 code 列表
    permissions: list[str]    # 权限码列表（去重、排序）
    model_config = {"from_attributes": True}
```

## 五、API 契约变更

| 接口 | 变更 | 说明 |
|---|---|---|
| `POST /api/v1/auth/login` | 变更返回 | `TokenResponse` 增加 `user: CurrentUserRead` |
| `GET /api/v1/users/me` | 变更返回 | `UserRead` → `CurrentUserRead` |
| 全部受保护接口 | 变更鉴权 | 挂载 `require_permission` 依赖 |
| 无新接口 | — | 本期不新增业务接口 |

**公开接口（无需登录/权限）**：`GET /health`、`GET/POST /api/v1/captcha`、`POST /api/v1/auth/login`。

**权限码目录（权威清单，共约 67 项，写入种子数据）**：完整目录见 V2 第四章 4.2，此处仅列分组——
- 系统管理（17）：`user:list/view/create/update/delete/assign_roles`、`role:list/view/create/update/delete/assign_permissions`、`permission:list/view/create/update/delete`
- 平台功能（约 40）：`dashboard:view`、`agent:*`（9）、`model:*`（6）、`provider:*`（4）、`prompt:*`（8）、`knowledge:*`（9）、`tool:*`（7）、`conversation:list/view/export`、`analytics:view/cost/evaluation`
- 预留（不写种子）：`apikey:*`、`audit:*`、`alert:*`、`setting:*`（对应模块实现时再补）

## 六、文件结构

**后端（Modify）**：
- `src/core/deps.py` — 增强 `get_current_user`（加载 roles→permissions）+ 新增 `get_user_permission_codes`、`require_permission`、`require_permissions`、`require_roles`
- `src/core/exceptions.py` — 新增 `403` 错误码常量
- `src/modules/auth/schema.py` / `service.py` — 登录返回扩展
- `src/modules/user/schema.py`（新增 `CurrentUserRead`）、`api.py`（`/me` 返回扩展）
- 各业务模块 `api.py` — 挂载权限依赖
- `scripts/init_permissions.py`（或 `bootstrap_rbac.py`）— 幂等种子数据脚本

**前端（Create/Modify）**：
- Create：`app/src/contexts/AuthContext.tsx`、`app/src/components/PermissionGuard.tsx`、`app/src/components/Can.tsx`、`app/src/pages/403.tsx`
- Modify：`app/src/services/api/auth.ts` / `mock/auth.ts` / `auth.ts`、`app/src/components/AuthGuard.tsx`、`app/src/layouts/DashboardLayout.tsx`、`app/src/App.tsx`、`app/src/services/api/client.ts`

## 七、任务拆解

### 任务 1：后端鉴权基础设施（依赖函数 + 403）

- [ ] 1.1 在 `exceptions.py` 新增 `ERROR_CODE_403 = 403` / `ERROR_MSG_403 = "无权限访问该资源"`。
- [ ] 1.2 在 `deps.py` 新增 `get_user_permission_codes(user: User) -> set[str]`，展平 `user.roles[*].permissions[*].code` 去重；增强 `get_current_user` 确保 `selectin` 预加载 roles→permissions（避免 N+1）。
- [ ] 1.3 在 `deps.py` 新增三个依赖（语义见 V2 5.1.2）：
  - `require_permission(*codes)` → 拥有**任一**（ANY），`is_superuser` 直通；
  - `require_permissions(*codes)` → 需**同时**拥有（AND）；
  - `require_roles(*role_codes)` → 拥有任一角色。
- [ ] 1.4 无权限时 `raise BizException(code=403, message="无权限访问该资源")`。
- **验收**：`pytest` 新增 `test/test_permission.py`：超管直通、ANY/AND 语义、无权限抛 403、权限变更后下一次请求即生效。

### 任务 2：登录与 `/me` 下发权限

- [ ] 2.1 `user/schema.py` 新增 `CurrentUserRead`（见第四节）。
- [ ] 2.2 `auth/schema.py` 的 `TokenResponse` 增加 `user: CurrentUserRead`。
- [ ] 2.3 `auth/service.py` 登录成功后组装角色/权限码（去重、排序）一并返回。
- [ ] 2.4 `user/api.py` 的 `GET /users/me` 改为返回 `ResponseSchema[CurrentUserRead]`。
- **验收**：`pytest test/test_auth.py`：登录返回含 `user.roles`/`user.permissions` 且去重无空值；`/me` 返回同结构。

### 任务 3：受保护接口挂载权限依赖

- [ ] 3.1 系统管理接口按 V2 5.5「已核对表」逐个挂 `require_permission`（`GET /users/search` → `user:list`、`DELETE /users/{id}` → `user:delete`、`PUT /roles/{id}/permissions` → `role:assign_permissions` …）。
- [ ] 3.2 业务模块接口按映射规则挂载：`GET 集合`→`{module}:list`、`GET /{id}`→`{module}:view`、`POST`→`create`、`PUT`→`update`、`DELETE`→`delete`、特殊端点→对应特殊权限码（`publish`/`test`/`version`/`toggle`/`document`/`segment`/`reindex`）。
- [ ] 3.3 `GET /users/me` 仅登录即可（不挂权限码）。
- **验收**：无权限账号访问各业务接口均返回 `code=403` 且不泄露数据；有权限账号正常；超管全通。

### 任务 4：幂等种子数据脚本

- [ ] 4.1 幂等写入约 67 项权限码（按 `code` 唯一，存在则跳过/更新名称描述）。
- [ ] 4.2 幂等创建超管账号 `admin`（`is_superuser=True`，密码读环境变量，不覆盖已存在密码）。
- [ ] 4.3（可选）创建内置角色 `ops`（平台功能全部 + 系统只读）、`viewer`（各 `*:list`/`*:view` + `dashboard:view`）并关联权限。
- **验收**：脚本重复执行不产生重复权限码/账号、不重置超管密码。

### 任务 5：前端权限状态层 + 登录接线

- [ ] 5.1 新增 `AuthContext.tsx`：状态 `user/permissions(Set)/roles/loading`；方法 `login/logout/loadProfile/hasPermission/hasAnyPermission/hasAllPermissions/hasRole`；权限码不落盘，刷新经 `/me` 恢复。
- [ ] 5.2 `services/api/auth.ts` 的 `TokenResponse` 增加 `user` 字段，新增 `CurrentUser` 类型（snake_case）；`mock/auth.ts` 返回内置超管（全量权限）。
- [ ] 5.3 `Login.tsx` 登录成功后注入 `AuthProvider`。
- **验收**：Mock 与 API 模式登录后均能取得 `permissions`；刷新页面权限经 `/me` 恢复。

### 任务 6：前端菜单/路由/按钮控制 + 403

- [ ] 6.1 `DashboardLayout.tsx` 菜单项加 `permission` 字段，用 `hasPermission` 过滤；无子项时隐藏「系统管理」分组；用户区改读 `useAuth().user`（替换硬编码）。
- [ ] 6.2 新增 `PermissionGuard`（无权限重定向 `/403`），`App.tsx` 对需要权限的路由包 `PermissionGuard`。
- [ ] 6.3 新增 `<Can>`（支持 `permission`/`anyOf`/`allOf`/`fallback`），覆盖各列表页「新建/编辑/删除/分配/发布/测试/回滚」按钮。
- [ ] 6.4 `api/client.ts` 的 `handleResponse` 对 `code===403` 抛带 code 的错误；页面级跳 `/403`，按钮级 toast「无权限」；新增 `/403` 页。
- **验收**：`npm run build`、`npm run lint` 通过；访客看不到系统管理菜单与写操作按钮；直达无权限 URL 跳 `/403`。

## 八、验收标准与关注点（Review Focus）

**后端验收（来自 V2 第九章）**：未登录→`401`；无权限→`403` 不泄露数据；超管全通；改权限后下一次请求即生效；种子脚本幂等。

**前端验收**：菜单按权限显隐；无权限路由跳 `/403`；无权限按钮隐藏/禁用；刷新恢复权限；Mock 超管全量可见；lint/build 通过。

**关注点（最易踩坑）**：
1. **权限链 N+1**：`get_current_user` 必须 `selectin` 预加载 `roles` → `permissions`，否则每个请求多次查询。
2. **403 与通用错误混淆**：前端 `apiClient` 必须单独识别 `code===403`，否则会被当作普通业务错误吞掉。
3. **`is_superuser` 优先级**：三个依赖函数第一行都要先判超管，避免超管被权限码误拦截。
4. **公开接口遗漏**：`/health`、`captcha`、`login` 必须保持公开，否则登录死锁。
5. **种子幂等**：`admin` 密码不可被重复执行覆盖；权限码按 `code` upsert。
6. **Mock 与 API 模式一致性**：`mock/auth.ts` 必须返回与后端 `CurrentUserRead` 同构的用户对象，否则 Mock 下 `useAuth` 类型崩溃。
