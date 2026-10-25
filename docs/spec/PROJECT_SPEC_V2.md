# 辰光Agent平台 — 项目说明书 V2（RBAC 授权功能）

> 本文档是 [PROJECT_SPEC.md](../PROJECT_SPEC.md)（下称「V1」）的**增量需求文档**，聚焦「RBAC 授权（Authorization）功能」的实现。
>
> - **V1 已覆盖**：平台全貌、目录结构、前后端架构、认证机制、数据模型、开发规范、待实现清单。
> - **本文档只描述授权功能的增量**：在 V1 已实现的 RBAC 数据模型（用户/角色/权限 + 关联表 + 认证）之上，补齐「鉴权执行层」。
>
> 版本：V2（草稿，待评审）　|　关联基线：`docs/PROJECT_SPEC.md`

---

## 一、文档说明

### 1.1 定位

V1 的现状（见 V1「一、项目概述」）：

| 层 | 状态 |
|---|---|
| 后端 — RBAC 数据模型（用户/角色/权限/关联表） | ✅ 已实现 |
| 后端 — 认证（JWT + 验证码） | ✅ 已实现 |
| 后端 — **授权（权限校验/执行）** | ❌ **缺失（本文档目标）** |
| 前端 — 登录态守卫（未登录跳转） | ✅ 已实现 |
| 前端 — **权限控制（菜单/路由/按钮）** | ❌ **缺失（本文档目标）** |

### 1.2 现状诊断（依据代码核对）

1. **接口级鉴权完全缺失**：`src/core/deps.py` 中 `get_current_user` 仅返回用户对象（含角色、不含权限）；全项目没有任何一处做「权限校验」。**只要登录成功，所有接口全开放。**
2. **超级管理员字段形同虚设**：`src/modules/user/model.py` 中 `User.is_superuser` 已定义，但**从未被任何逻辑使用**，无超管绕过/判定。
3. **前端拿不到「用户能做什么」**：
   - 登录接口 `TokenResponse` 仅返回 `access_token`（`src/modules/auth/schema.py`），不返回用户信息与权限码。
   - `GET /users/me` 只返回 `UserRead`（无角色、无权限）。
4. **前端无权限状态**：
   - `AuthGuard` 仅校验 `isLoggedIn()`（token 是否存在）。
   - `DashboardLayout` 侧边栏菜单为**静态硬编码**，用户信息（管理员/admin@example.com）也硬编码。
   - 无权限存储（store/context）、无菜单显隐、无按钮级控制、无 403 处理。
5. **无统一权限码规范**：`permissions` 表的 `code` 字段自由填写，无命名约定、无完整权限清单、无种子数据。

---

## 二、目标、范围与约束

### 2.1 本期目标（Goals）

在 V1 既有 RBAC 数据模型之上，补齐「授权执行层」，实现**端到端的权限控制闭环**：

1. **后端接口级鉴权**：为每个受保护接口声明所需权限，未授权请求返回 `403` 业务码。
2. **超级管理员机制**：`is_superuser=True` 的用户绕过所有权限校验。
3. **权限码规范与完整清单**：定义 `模块:操作` 命名规范，产出覆盖全部模块的权限码目录。
4. **登录/用户信息下发权限**：登录成功及 `/users/me` 返回用户 + 角色 + 权限码集合，供前端判断。
5. **前端三层权限控制**：菜单显隐、路由守卫、按钮级控制。
6. **内置种子数据**：超级管理员账号 + 完整权限清单 + 建议内置角色。

### 2.2 非目标（Non-Goals）

- 不新增/修改 RBAC 数据表结构（复用 V1 现有 5 张表）。
- 不重构现有认证流程（登录/验证码/JWT 逻辑保持，仅扩展返回值）。
- 不实现业务模块（Agent/模型/知识库等）的新增功能——这些模块的接口若已存在，则纳入保护范围；不存在则不在本期实现。

### 2.3 反目标（Anti-Goals，做了即失败）

- 权限校验**只在前端做**（后端裸奔）——前端控制仅是体验优化，后端才是安全边界。
- 引入重型的第三方授权引擎（如 Casbin/OPA）导致依赖膨胀、学习成本陡增。
- 权限码设计**过度细化**到字段级，导致维护成本远超收益。

### 2.4 范围边界（Scope）

**范围内**：后端接口级鉴权 + 前端菜单/路由/按钮级控制 + 权限码规范 + 种子数据。

**范围外（本期不做，见第十一章预留设计）**：
- 行级数据权限（本人/本部门/全部数据可见范围）。
- 字段级权限（同一资源部分字段可见）。
- 多租户隔离、审计日志、API Key 鉴权、动态数据脱敏。

### 2.5 约束（Constraints）

- **技术栈锁定**：后端 FastAPI + SQLAlchemy 2.0 异步 + `Depends` 依赖注入；前端 React 19 + TS 严格模式，**不引入全局状态库**（遵循现有 `useState` 约定，用 React Context 即可）。
- **兼容现有架构**：新鉴权依赖放在 `src/core/deps.py`，与现有 `get_current_user`/`PageParams` 共存；异常走 `BizException`。
- **响应格式不变**：统一 `{code, message, data}`；业务错误码 `code` 为 4 位内数字。
- **默认拒绝（白名单制）**：除显式声明的公开接口外，其余接口默认要求登录 + 权限。

---

## 三、方案选型（Approaches）

> 本节为需求评审记录了三类关键技术方案及选型结论，供实施方理解「为什么这么做」。

### 3.1 后端鉴权执行方式

| 方案 | 说明 | 取舍 | 结论 |
|---|---|---|---|
| **A. 声明式依赖注入** | 新增 `require_permission("user:list")` 等依赖，逐个路由显式声明 | 清晰可读、零新依赖、贴合现有 `Depends` 风格；缺点是每个路由需手写 | ✅ **采用** |
| B. 全局中间件 + 路由映射表 | 集中一张「路由→权限码」表，中间件统一拦截 | 集中管理，但可读性差、易漏、与 FastAPI 路由定义分离 | ❌ 不采用 |
| C. 引入 Casbin/OPA 策略引擎 | 专业 RBAC 引擎 | 功能强，但引入重依赖、学习成本高，本项目规模不需要 | ❌ 不采用 |

### 3.2 权限码下发方式（前端如何获知权限）

| 方案 | 说明 | 取舍 | 结论 |
|---|---|---|---|
| **A. 登录返回 + /me 刷新** | 登录响应直接携带 `user`（含角色+权限码）；`GET /users/me` 返回同样结构用于页面刷新恢复 | 前端一次到位、刷新可恢复；需扩展两个 schema | ✅ **采用** |
| B. 仅登录返回 | 登录一次返回全部 | 页面刷新丢失，需重新登录或本地缓存 | ❌ 不采用 |
| C. JWT 内嵌权限 | 权限码写进 token | token 膨胀；权限变更需重新登录才生效；后端仍须查库校验（不安全） | ❌ 不采用 |

### 3.3 前端权限状态管理

| 方案 | 说明 | 取舍 | 结论 |
|---|---|---|---|
| **A. React Context（`AuthProvider` + `useAuth`）** | 登录后注入用户 + 权限码集合，提供 `hasPermission`/`hasRole` | 零新依赖，贴合「无全局状态库」约定 | ✅ **采用** |
| B. 引入 Zustand | 轻量全局 store | 引入新依赖，超出本期最小改动 | ❌ 不采用 |
| C. 纯 localStorage 缓存 | 每次调用读 localStorage 判断 | 无响应式更新，刷新/登出需手动同步 | ❌ 不采用 |

### 3.4 鉴权默认策略

- **默认拒绝（白名单）**：未挂权限依赖的受保护路由一律拒绝（`403`）；仅 `/health`、`/api/v1/auth/login`、`/api/v1/captcha/*` 为公开接口。
- **超管绕过**：`current_user.is_superuser is True` 时跳过一切权限校验。
- **权限实时查库**：后端每次请求从数据库加载用户→角色→权限，**权限变更即时生效**（无需重新登录）；前端缓存的权限码在页面刷新/重新登录时同步。

---

## 四、权限模型与权限码目录

### 4.1 权限码命名规范

```
格式：{resource}:{action}      // 全小写，resource 为资源名，action 为操作
示例：user:list、agent:publish、role:assign_permissions
```

- **资源（resource）**：对应业务模块，如 `user`、`role`、`permission`、`agent`、`model`、`provider`、`prompt`、`knowledge`、`tool`、`conversation`、`analytics`、`dashboard`。
- **基础操作（action）**：`list`（列表/分页搜索）、`view`（详情）、`create`（创建）、`update`（编辑）、`delete`（删除）。
- **特殊操作**：`assign`（分配）、`publish`（发布）、`test`（测试）、`toggle`（启停/启禁用）、`version`（版本管理/回滚）、`document`（文档管理）、`segment`（分段管理）、`reindex`（重建索引）、`export`（导出）。
- **匹配规则**：精确匹配（相等）。**本期不做通配符**（如 `agent:*`），「全量权限」由超级管理员机制承担。如后续需要「模块全量」授权，可扩展为 `agent:*` 前缀匹配（见第十一章）。

> 说明：`view`（详情）在实施阶段可与 `list` 合并以降低粒度（若列表与详情页始终同权）。默认按拆分设计，合并需在评审中明确。

### 4.2 权限码完整目录（基线清单）

> 共约 50 条，作为 `permissions` 表种子数据基线。实施时允许按评审微调粒度，但**编码格式必须统一**。

**A. 系统管理（system）**

| 权限码 | 名称 | 说明 |
|---|---|---|
| `user:list` | 用户列表 | 分页搜索用户 |
| `user:view` | 用户详情 | 查看用户及其角色 |
| `user:create` | 创建用户 | |
| `user:update` | 编辑用户 | |
| `user:delete` | 删除用户 | |
| `user:assign_roles` | 分配角色 | 给用户分配/替换角色 |
| `role:list` | 角色列表 | |
| `role:view` | 角色详情 | 含角色权限 |
| `role:create` | 创建角色 | |
| `role:update` | 编辑角色 | |
| `role:delete` | 删除角色 | |
| `role:assign_permissions` | 分配权限 | 给角色分配权限 |
| `permission:list` | 权限列表 | |
| `permission:view` | 权限详情 | |
| `permission:create` | 创建权限 | |
| `permission:update` | 编辑权限 | |
| `permission:delete` | 删除权限 | |

**B. 平台功能（platform）**

| 权限码 | 名称 | 说明 |
|---|---|---|
| `dashboard:view` | 工作台 | 查看数据大盘 |
| `agent:list` | Agent 列表 | |
| `agent:view` | Agent 详情 | |
| `agent:create` | 创建 Agent | |
| `agent:update` | 编辑 Agent | |
| `agent:delete` | 删除 Agent | |
| `agent:publish` | 发布 Agent | 生成版本快照 |
| `agent:test` | 测试 Agent | |
| `agent:version` | 版本管理 | 查看/回滚版本 |
| `agent:toggle` | 启停 Agent | 启动/停止 |
| `model:list` | 模型列表 | |
| `model:view` | 模型详情 | |
| `model:create` | 创建模型 | |
| `model:update` | 编辑模型 | |
| `model:delete` | 删除模型 | |
| `model:test` | 连接测试 | 模型连通性测试 |
| `provider:list` | 供应商列表 | |
| `provider:create` | 创建供应商 | |
| `provider:update` | 编辑供应商 | |
| `provider:delete` | 删除供应商 | |
| `prompt:list` | Prompt 列表 | |
| `prompt:view` | Prompt 详情 | |
| `prompt:create` | 创建 Prompt | |
| `prompt:update` | 编辑 Prompt | |
| `prompt:delete` | 删除 Prompt | |
| `prompt:publish` | 发布 Prompt | |
| `prompt:test` | 测试 Prompt | |
| `prompt:version` | 版本管理 | |
| `knowledge:list` | 知识库列表 | |
| `knowledge:view` | 知识库详情 | |
| `knowledge:create` | 创建知识库 | |
| `knowledge:update` | 编辑知识库 | |
| `knowledge:delete` | 删除知识库 | |
| `knowledge:document` | 文档管理 | 上传/处理/重试文档 |
| `knowledge:segment` | 分段管理 | 查看/管理分段 |
| `knowledge:test` | 检索测试 | |
| `knowledge:reindex` | 重建索引 | |
| `tool:list` | 工具列表 | |
| `tool:view` | 工具详情 | |
| `tool:create` | 创建工具 | |
| `tool:update` | 编辑工具 | |
| `tool:delete` | 删除工具 | |
| `tool:test` | 测试工具 | |
| `tool:toggle` | 启禁用工具 | |
| `conversation:list` | 对话列表 | |
| `conversation:view` | 对话详情 | |
| `conversation:export` | 导出对话 | |
| `analytics:view` | 用量统计 | |
| `analytics:cost` | 费用分析 | |
| `analytics:evaluation` | 效果评估 | |

**C. 预留（待实现系统功能，见 V1 待实现清单）**

| 权限码 | 名称 | 说明 |
|---|---|---|
| `apikey:list` / `apikey:create` / `apikey:update` / `apikey:delete` | API 密钥 | 系统管理扩展，预留 |
| `audit:list` / `audit:view` / `audit:export` | 审计日志 | 预留 |
| `alert:list` / `alert:create` / `alert:update` / `alert:delete` | 告警规则 | 预留 |
| `setting:view` / `setting:update` | 系统配置 | 预留 |

> 预留项本期**不写入种子数据**，仅登记编码规范，待对应模块实现时再补。

### 4.3 内置角色建议（种子数据）

| 角色 code | 角色名称 | 建议权限 | 说明 |
|---|---|---|---|
| —（超管账号，非角色） | 超级管理员 | 全部（`is_superuser=True` 绕过） | 内置账号 `admin` |
| `ops` | 运营管理员 | 平台功能全部 + 只读系统管理 | 可选内置 |
| `viewer` | 访客（只读） | 各模块 `*:list`/`*:view` + `dashboard:view` | 可选内置 |

> `ops`/`viewer` 为**建议**种子角色，可在实施阶段决定是否内置；`admin` 超管账号为**必须**内置。

---

## 五、后端设计

### 5.1 核心依赖扩展（`src/core/deps.py`）

**5.1.1 `get_current_user` 增强**

- 保持签名与语义不变（认证：校验 token → 返回 `User`）。
- 增强点：确保加载出完整的 `user → roles → permissions` 链（当前 `lazy="selectin"` 仅确保 roles 加载，需显式加载角色下的权限）。
- 新增辅助函数 `get_user_permission_codes(user: User) -> set[str]`：展平 `user.roles[*].permissions[*].code` 为去重集合。

**5.1.2 新增鉴权依赖**

```python
# 拥有任一权限码（ANY）
def require_permission(*codes: str):
    async def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.is_superuser:
            return current_user
        user_codes = get_user_permission_codes(current_user)
        if not any(c in user_codes for c in codes):
            raise BizException(code=403, message="无权限访问该资源")
        return current_user
    return checker

# 需同时拥有全部权限码（AND）
def require_permissions(*codes: str): ...

# 拥有任一角色（按角色 code）
def require_roles(*role_codes: str): ...
```

**语义约定**：
- `require_permission("a", "b")`：拥有 `a` **或** `b` 即可（ANY）。
- `require_permissions("a", "b")`：需**同时**拥有 `a` 和 `b`（AND）。
- `require_roles("admin")`：拥有任一指定角色即可。
- 三者均先判断 `is_superuser`，超管直接放行。

### 5.2 鉴权流程

```
请求 → LoggingMiddleware → 路由
  └─ Depends(require_permission("user:list"))
       └─ get_current_user: 解析JWT → 查库加载 user+roles+permissions → 校验 is_active
            └─ is_superuser? → 放行
            └─ 权限码集合 ⊇ 所需权限? → 放行 / 否则 raise BizException(403)
```

### 5.3 异常与错误码

在 `src/core/exceptions.py` 新增：

| 错误码 | 含义 | 说明 |
|---|---|---|
| `401` | 未登录/token 失效 | 已有 |
| `403` | 无权限 | **新增**，返回 `{"code":403,"message":"无权限访问该资源","data":null}` |

> 沿用 `BizException` 抛错（HTTP 200 + 业务码），前端 `apiClient` 已能识别非 200 业务码并抛错，但需补充对 `403` 的 UI 处理（见 6.6）。

### 5.4 API 契约变更

**5.4.1 登录响应扩展（`src/modules/auth/schema.py`）**

```python
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: CurrentUserRead          # 新增：当前用户（含角色、权限码）
```

`CurrentUserRead`（建议新增于 `src/modules/user/schema.py`）：

```python
class CurrentUserRead(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool
    is_superuser: bool
    roles: list[str]              # 角色 code 列表
    permissions: list[str]        # 权限码列表（去重、排序）
    model_config = {"from_attributes": True}
```

**5.4.2 `GET /users/me` 返回扩展**

- 由 `ResponseSchema[UserRead]` 改为 `ResponseSchema[CurrentUserRead]`，返回完整角色 + 权限码，供前端页面刷新/恢复权限。

**5.4.3 登录逻辑（`src/modules/auth/service.py`）**

- `AuthService.login` 在生成 token 后，额外查询用户的角色与权限，组装 `CurrentUserRead` 一并返回。

### 5.5 接口与权限码映射表

**公开接口（无需登录）**：

| 接口 | 说明 |
|---|---|
| `GET /health` | 健康检查 |
| `GET /api/v1/captcha`、`POST /api/v1/captcha` | 验证码 |
| `POST /api/v1/auth/login` | 登录 |

**受保护接口（登录 + 权限）——系统管理（已核对）**：

| 接口 | 所需权限码 |
|---|---|
| `GET /api/v1/users/search`、`GET /api/v1/users` | `user:list` |
| `GET /api/v1/users/{id}`、`GET /api/v1/users/{id}/roles` | `user:view` |
| `POST /api/v1/users` | `user:create` |
| `PUT /api/v1/users/{id}/roles` | `user:assign_roles` |
| `DELETE /api/v1/users/{id}` | `user:delete` |
| `GET /api/v1/roles/search`、`GET /api/v1/roles` | `role:list` |
| `GET /api/v1/roles/{id}` | `role:view` |
| `POST /api/v1/roles` | `role:create` |
| `PUT /api/v1/roles/{id}` | `role:update` |
| `DELETE /api/v1/roles/{id}` | `role:delete` |
| `PUT /api/v1/roles/{id}/permissions` | `role:assign_permissions` |
| `GET /api/v1/permissions/search`、`GET /api/v1/permissions` | `permission:list` |
| `GET /api/v1/permissions/{id}` | `permission:view` |
| `POST /api/v1/permissions` | `permission:create` |
| `PUT /api/v1/permissions/{id}` | `permission:update` |
| `DELETE /api/v1/permissions/{id}` | `permission:delete` |
| `GET /api/v1/users/me` | 登录即可（无额外权限码） |

**受保护接口——业务模块（按资源映射）**：

> 业务模块（agent/model/provider/prompt/knowledge/tool 等）的 API 已存在。映射规则：`list`/`search`/`GET 集合` → `{module}:list`；`GET /{id}` → `{module}:view`；`POST` → `{module}:create`；`PUT` → `{module}:update`；`DELETE` → `{module}:delete`；其余特殊端点（发布/测试/版本/回滚/启停/上传/分段/检索测试/重建索引/连接测试）对应 4.2 中的特殊权限码。实施时逐端点落实，本文档以权限码目录为权威清单。

### 5.6 种子数据与迁移

- **无需新增表结构**（复用 V1 现有 5 张表），因此**无 schema 迁移**。
- 需一次**数据迁移/幂等初始化脚本**（参考现有 `init_data.py`/`bootstrap_db.py`）：
  1. 幂等写入 4.2 权限码目录（按 `code` 唯一，存在则跳过/更新名称描述）。
  2. 幂等创建超级管理员账号 `admin`（`is_superuser=True`），密码由环境变量注入，禁止硬编码默认弱口令。
  3. （可选）创建 `ops`/`viewer` 角色并关联对应权限。
- 幂等性要求：脚本可重复执行不产生重复数据、不覆盖已存在的超管密码。

---

## 六、前端设计

### 6.1 权限状态层（新增 `AuthProvider` / `useAuth`）

- 新增 `app/src/contexts/AuthContext.tsx`（或 `hooks/useAuth.ts`），在应用根部提供：
  - 状态：`user: CurrentUserRead | null`、`permissions: Set<string>`、`roles: string[]`、`loading`。
  - 方法：`login()`、`logout()`、`loadProfile()`（调 `/users/me` 刷新）、`hasPermission(code)`、`hasAnyPermission(codes)`、`hasAllPermissions(codes)`、`hasRole(code)`。
- 持久化：token 沿用 `tokenStorage`；权限码**不落盘**（或仅内存），每次刷新通过 `loadProfile()` 从 `/me` 重新拉取。
- 严格模式注意：`permissions` 用不可变 Set 更新，避免 `noUnusedLocals`/类型问题。

### 6.2 登录流程变更（`services/api/auth.ts` + `Login.tsx`）

- 登录成功后：`authService.login()` 返回 `TokenResponse`（含 `user`），将其注入 `AuthProvider`。
- Mock 模式（`mock/auth.ts`）：同步返回一份内置超管用户（`is_superuser=true` + 全量权限码），保证 Mock 下菜单/按钮全可见。

### 6.3 路由守卫升级（`AuthGuard`）

- 现有 `AuthGuard` 只校验登录态，保留。
- 新增 `PermissionGuard`（或 `RequirePermission` 组件）：接收 `permission` 或 `permissions` 属性，无权限时重定向到 `/403`。
- `App.tsx` 中，需要权限的路由外层包裹 `PermissionGuard`；工作台等仅登录即可的路由只包 `AuthGuard`。

### 6.4 菜单显隐（`DashboardLayout.tsx`）

- `menuItems` / `systemMenuItems` 增加 `permission` 字段（对应 4.2 权限码）。
- 渲染时用 `useAuth().hasPermission()` 过滤；**无任何子项时隐藏整个「系统管理」分组**。
- 用户区（头像/昵称/邮箱）改为读取 `useAuth().user`，替换现有硬编码「管理员/admin@example.com」。

### 6.5 按钮级控制（新增 `<Can>` 组件）

```tsx
// 用法示意（PRD 层）
<Can permission="user:create">
  <Button>新建用户</Button>
</Can>
// 或 hook 形式
const { hasPermission } = useAuth()
{hasPermission('user:delete') && <Button>删除</Button>}
```

- `<Can>` 支持 `permission`（单个）与 `anyOf` / `allOf`（多个）；无权限时返回 `null`（隐藏）或按需支持 `fallback`（禁用态）。
- 覆盖各列表页的「新建/编辑/删除/分配角色/分配权限/发布/测试/回滚」等操作按钮。

### 6.6 无权限处理（403）

- `services/api/client.ts` 的 `handleResponse` 增加：当业务码 `code === 403` 时，抛带 code 的错误（不再与通用错误混淆）。
- 新增 `/403` 页面（「无权访问」提示 + 返回工作台）。
- 前端接口返回 403 时，若发生在页面级操作，跳转 `/403`；按钮级操作则 toast 提示「无权限」。

### 6.7 类型定义

- `services/api/auth.ts` 的 `TokenResponse` 增加 `user` 字段，新增 `CurrentUser` 类型（镜像后端 `CurrentUserRead`，snake_case 字段）。
- 涉及文件的类型按 TS 严格模式补齐，避免 `noUnusedParameters`。

---

## 七、数据模型与迁移清单

| 项 | 类型 | 说明 |
|---|---|---|
| 现有 5 张表 | 复用 | `users`/`roles`/`permissions`/`user_roles`/`role_permissions` 结构不变 |
| 权限码种子数据 | 数据迁移 | 4.2 目录（约 50 条） |
| 超管账号 `admin` | 数据迁移 | `is_superuser=True`，密码环境变量注入 |
| 内置角色 `ops`/`viewer`（可选） | 数据迁移 | 建议项 |
| 无新表/新字段 | — | 本期不加表 |

---

## 八、接口清单汇总（新增/变更）

| 接口 | 变更类型 | 说明 |
|---|---|---|
| `POST /api/v1/auth/login` | 变更返回 | `TokenResponse` 增加 `user`（角色+权限码） |
| `GET /api/v1/users/me` | 变更返回 | `UserRead` → `CurrentUserRead` |
| 全部受保护接口 | 变更鉴权 | 挂载对应 `require_permission` 依赖 |
| 无新接口 | — | 本期不新增业务接口 |

---

## 九、验收标准（Acceptance Criteria）

### 后端

1. 未登录访问受保护接口 → 返回 `code=401`。
2. 已登录但无权限访问 → 返回 `code=403`，且**不泄露业务数据**。
3. 拥有对应权限 → 正常访问；`is_superuser=True` → 访问一切受保护接口。
4. 修改用户/角色权限后，**下一次请求即生效**（无需重新登录）。
5. 登录响应与 `/users/me` 均返回正确的 `roles` + `permissions` 权限码集合（去重、无空值）。
6. 种子脚本幂等：重复执行不产生重复权限码/账号。

### 前端

1. 登录后，侧边栏仅显示用户有权限的菜单；无任何系统权限时隐藏「系统管理」分组。
2. 直接输入 URL 访问无权限路由 → 重定向 `/403`。
3. 无权限操作按钮被隐藏或禁用（按 `<Can>` 语义）。
4. 刷新页面后权限正确恢复（经 `/me`）。
5. Mock 模式下超管账号全量权限可见，不影响开发。
6. `npm run build`、`npm run lint` 通过（严格模式无类型/未用变量错误）。

---

## 十、非功能需求

- **安全**：后端鉴权是唯一安全边界；权限码严禁只在前端校验。权限码写入种子数据时避免 SQL 注入（走 ORM）。
- **性能**：`get_current_user` 的权限链加载使用 `selectin` 预加载，避免 N+1；权限码集合计算 O(角色数×权限数)，规模可控。
- **兼容**：现有前端 Mock/API 切换（`USE_MOCK`）机制不被破坏；现有认证流程、分页、异常处理保持不变。
- **可维护**：权限码目录集中登记（本文档 4.2），新增模块时同步补权限码与路由映射。

---

## 十一、后续扩展预留（数据权限 / 更多能力）

> 本期不做，仅登记方向，供后续版本评估。

1. **行级数据权限（数据范围）**：在 `User` 或 `Role` 上增加 `data_scope` 字段（`self` / `dept` / `all` / `custom`），Service 层查询时按范围注入过滤条件（`created_by = current_user.id` 或部门条件）。涉及组织架构（部门表）与「创建人」字段，需单独一期。
2. **权限码通配/前缀匹配**：支持 `agent:*` 表示模块全量，简化批量授权。
3. **字段级权限与数据脱敏**：接口返回字段级裁剪。
4. **审计日志**：记录权限相关操作（分配角色/权限）与敏感接口调用。
5. **API Key 鉴权**：为程序化访问提供独立于用户的凭证与权限。

---

## 十二、变更记录

| 日期 | 变更 |
|---|---|
| 2026-10-25 | 初版：基于 V1 完成 RBAC 授权功能需求分析；范围=后端接口鉴权 + 前端菜单/路由/按钮控制；数据权限列为后续扩展。 |

---

## 附：涉及文件清单（实施参考，非本期产出）

**后端**
- `src/core/deps.py`（增强 `get_current_user`、新增 `require_permission` 等、`get_user_permission_codes`）
- `src/core/exceptions.py`（新增 403 错误码常量）
- `src/modules/auth/schema.py` / `service.py`（登录返回扩展）
- `src/modules/user/schema.py`（新增 `CurrentUserRead`）、`api.py`（`/me` 返回扩展）
- 各业务模块 `api.py`（挂载权限依赖）
- 种子数据脚本（幂等初始化）

**前端**
- `app/src/contexts/AuthContext.tsx`（新增）/ `hooks/useAuth.ts`
- `app/src/services/api/auth.ts`、`mock/auth.ts`、`auth.ts`（登录返回扩展 + 类型）
- `app/src/components/AuthGuard.tsx`（保留）+ 新增 `PermissionGuard` / `Can` 组件
- `app/src/layouts/DashboardLayout.tsx`（菜单过滤 + 真实用户信息）
- `app/src/pages/403.tsx`（新增无权限页）、`App.tsx`（路由守卫接线）
- `app/src/services/api/client.ts`（403 处理）
