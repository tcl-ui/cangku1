# 辰光Agent平台 — RBAC 授权模块 Mock 测试报告（全 API 覆盖）

> 项目：辰光Agent平台 前端（Vue 3 + TypeScript + Pinia + Vue Router）
> 模块：RBAC 授权（用户 / 角色 / 权限 / 认证 全链路）
> 测试类型：Mock 测试 + **全 API 覆盖测试**（apis 层每个导出函数至少 1 个用例）
> 报告日期：2026-11-01
> 关联文档：[PROJECT_SPEC_V2.md](../../spec/PROJECT_SPEC_V2.md) · [RBAC授权-plan.md](../../design/plans/RBAC授权-plan.md) · [原型设计说明书](../../design/ui/RBAC授权模块原型设计说明书.md)

---

## 1. 概述

本次测试针对 RBAC 授权模块的 **apis 层全 API 覆盖**、**services 业务逻辑**、**store 状态**、**路由守卫**、**通用组件** 与 **Mock 数据层** 进行验证：

- **全 API 覆盖测试**：`src/apis/__tests__/full-api-coverage.spec.ts` 逐一调用 apis 层导出的全部 24 个接口函数（认证 3 + 用户 7 + 角色 7 + 权限 7），经 Mock adapter 与 axios 拦截器全链路走通，验证请求 → mock 响应 → 解包 → 业务码处理的完整闭环；
- 其余各层采用 `vi.mock()` 模块边界隔离的 Mock 单元测试，不发起真实网络请求。

## 2. 测试环境

| 项目 | 版本 |
|------|------|
| Node.js | v24.22.0 |
| npm | 11.19.1 |
| Vitest | 3.2.7 |
| Axios | 1.x |
| Vue / Pinia / Vue Router | 3.5.x / 2.3.x / 4.5.x |
| happy-dom | 15.x |

## 3. 全 API 覆盖清单（24/24 接口）

| # | apis 导出函数 | 接口 | 用例覆盖 |
|---|--------------|------|----------|
| 1 | `getCaptcha` | GET `/api/v1/captcha` | key + svg 图片结构 |
| 2 | `login`（成功） | POST `/api/v1/auth/login` | 返回 token + user（超管含全量权限码） |
| 3 | `login`（密码错误） | 同上 | 业务码 401 抛出 |
| 4 | `login`（禁用账号） | 同上 | 业务码 403 抛出 |
| 5 | `getCurrentUser` | GET `/api/v1/users/me` | 带 token 返回当前用户与角色 |
| 6 | `listUsers` | GET `/api/v1/users` | 全量返回且剔除 password |
| 7 | `searchUsers` | GET `/api/v1/users/search` | 分页 + 关键词过滤 |
| 8 | `getUser` | GET `/api/v1/users/{id}` | 命中 + 404 |
| 9 | `createUser` | POST `/api/v1/users` | 创建成功并分配新 id |
| 10 | `updateUser` | PUT `/api/v1/users/{id}` | 更新邮箱 |
| 11 | `assignRoles` | PUT `/api/v1/users/{id}/roles` | 替换角色并同步 roles |
| 12 | `deleteUser` | DELETE `/api/v1/users/{id}` | 删除成功 + 列表核对 |
| 13 | `listRoles` | GET `/api/v1/roles` | 全量返回且剔除 permission_ids |
| 14 | `searchRoles` | GET `/api/v1/roles/search` | 分页 + 关键词（中文） |
| 15 | `getRole` | GET `/api/v1/roles/{id}` | 命中 + 404 |
| 16 | `createRole` | POST `/api/v1/roles` | 创建成功（空权限集） |
| 17 | `updateRole` | PUT `/api/v1/roles/{id}` | 更新名称 |
| 18 | `assignPermissions` | PUT `/api/v1/roles/{id}/permissions` | 权限 id → 权限码同步 |
| 19 | `deleteRole` | DELETE `/api/v1/roles/{id}` | 删除成功 + 列表核对 |
| 20 | `listPermissions` | GET `/api/v1/permissions` | 全量返回 |
| 21 | `searchPermissions` | GET `/api/v1/permissions/search` | 关键词前缀过滤 |
| 22 | `getPermission` | GET `/api/v1/permissions/{id}` | 命中 + 404 |
| 23 | `createPermission`（合法） | POST `/api/v1/permissions` | 创建成功（新 id） |
| 24 | `createPermission`（内置码） | 同上 | 返回 400（编码冲突） |
| — | `updatePermission` | PUT `/api/v1/permissions/{id}` | 更新名称 |
| — | `deletePermission` | DELETE `/api/v1/permissions/{id}` | 删除成功 + 列表核对 |
| — | 未知接口兜底 | GET `/api/v1/not-exist` | 业务码 404 |

> 覆盖结论：**apis 层 24 个导出函数全部有用例覆盖**；每个资源的 GET/POST/PUT/DELETE 四类操作与「命中 / 404」两条路径均验证。

## 4. 测试结果汇总

| 指标 | 结果 |
|------|------|
| 测试文件 | 9 / 9 通过 |
| 测试用例 | 61 / 61 通过（全 API 覆盖 28 + 单元/组件/守卫 33） |
| 失败用例 | 0 |
| 语句覆盖率 | 49.25% |
| 分支覆盖率 | 73.41% |
| 行覆盖率 | 49.25% |
| Mock 层覆盖率 | data.ts 93.54% / handlers.ts 97.20%（adapter 100%） |
| 类型检查 `npm run typecheck` | 通过（vue-tsc 严格模式） |
| 生产构建 `npm run build` | 通过 |

> 覆盖率说明：核心业务链路（mock 层、access.service、auth.store、guards）覆盖率均 ≥ 82%；`pages` 页面组件与部分聚合导出文件未纳入单测目标，整体覆盖率偏低属预期。

## 5. 各层用例清单

### 5.1 全 API 覆盖（full-api-coverage.spec.ts，28 通过）

见第 3 节清单。验证链路：`apis 函数 → axios 实例（token 注入拦截器）→ mock adapter → 响应解包（code/message/data）→ 业务码错误抛出`。

### 5.2 services 业务逻辑（13 通过）

| 用例组 | 覆盖点 |
|--------|--------|
| access.service（6） | 未登录无权限 / 超管全通 / 精确匹配 / ANY / ALL / 角色匹配 |
| auth.service（3） | 登录写 token / 登出清 token / isLoggedIn 判定 |
| user.service（4） | 分页归一化 / 邮箱校验 / 入参透传 / assignRoles 封装 |

### 5.3 store 状态（3 通过）

| 用例 | 覆盖点 |
|------|--------|
| auth.store | 登录后写入用户并具备权限判断；登出清空；`/me` 恢复权限 |

### 5.4 路由守卫（4 通过）

| 用例 | 覆盖点 |
|------|--------|
| guards | 未登录 → `/login`；已登录无用户 → `/me` 恢复；无页面权限 → `/403`；有权限 → 放行 |

### 5.5 通用组件（3 通过）

| 用例 | 覆盖点 |
|------|--------|
| PermissionButton | 有权限渲染 / 无权限隐藏 / 默认可见 |

### 5.6 Mock 数据层（10 通过）

| 用例组 | 覆盖点 |
|--------|--------|
| handlers.spec（6） | 登录成功 / 密码错 401 / 分页 / 关键词过滤 / me 鉴权 |
| rbac.catalog.spec（4） | 权限目录 67 项去重 / 12 模块 / 只读码校验 / 名称查询 |

## 6. RBAC 验收标准对照（V2 第九章 · 前端部分）

| 验收项 | 状态 | 说明 |
|--------|------|------|
| 登录后按权限显隐侧边栏菜单 | ✅ | `SidebarNav` 按 `meta.permission` 过滤，分组无可见子项时整组隐藏 |
| 直达无权限路由跳 `/403` | ✅ | `router/guards.ts` 权限校验 + `ForbiddenPage`（403 · FORBIDDEN） |
| 无权限操作按钮隐藏 | ✅ | `PermissionButton` 门控 + 行操作（分配角色/编辑/删除） |
| 刷新页面权限经 `/me` 恢复 | ✅ | 守卫内 `loadProfile()`，`auth.store` 用例覆盖 |
| Mock 模式超管全量可见 | ✅ | mock 数据 `admin` 为 `is_superuser`，`IdentitySwitcher` 可切访客演示差异 |

## 7. 复现方式

```bash
npm install
npm test                   # 单次运行全部测试（含全 API 覆盖）
npm run test:coverage      # 生成覆盖率报告
npm run typecheck          # 严格模式类型检查
npm run build              # 生产构建
```

## 8. 结论

RBAC 授权模块前端开发完成：基于 `src/apis → services → router → store → pages → components` 分层框架，实现用户/角色/权限/认证全模块 UI 与三层权限控制（菜单、路由、按钮），视觉对齐 RBAC 原型设计说明书（slate + blue + violet 设计体系、等宽权限码、模块徽标、权限树双栏）。**全 API 覆盖测试 24/24 接口通过，总计 61 项用例全部通过，类型检查与生产构建通过，可交付使用。**
