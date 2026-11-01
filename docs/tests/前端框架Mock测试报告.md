# 辰光Agent平台 前端框架 — Mock 测试报告

> 项目：辰光Agent平台 前端框架（Vue 3 + TypeScript + Pinia + Vue Router）
> 测试类型：Mock 测试（模块级隔离，不发起真实网络请求）
> 报告日期：2026-11-01

---

## 1. 概述

本次测试针对前端工程化框架的**业务逻辑层（services）**、**状态层（store）**、**路由守卫（router）**、**通用组件（components）** 以及 **Mock 数据层（mock）** 进行验证。

测试策略为 **Mock 测试**：

- 单元测试通过 `vi.mock()` 在模块边界对 `apis` 层进行打桩，隔离 axios 网络依赖；
- 组件与路由守卫测试配合 `@vue/test-utils` 与内存路由验证交互行为；
- Mock 数据层单独验证其请求处理逻辑（登录、分页、鉴权等）。

## 2. 测试环境

| 项目 | 版本 |
|------|------|
| Node.js | v24.22.0 |
| npm | 11.19.1 |
| Vitest | 3.2.7 |
| @vue/test-utils | 2.4.x |
| happy-dom | 15.x |
| TypeScript | 5.6.x |
| Vite | 6.4.x |

## 3. 测试范围

| 被测模块 | 测试文件 | 说明 |
|----------|----------|------|
| services（业务逻辑） | `access.service.spec.ts` / `auth.service.spec.ts` / `user.service.spec.ts` | 权限判断、认证编排、入参校验 |
| store（状态） | `auth.store.spec.ts` | 登录/登出/权限恢复 |
| router（守卫） | `guards.spec.ts` | 未登录拦截、权限拦截、放行 |
| components（组件） | `PermissionButton.spec.ts` | 按钮级权限显隐 |
| mock（Mock 层） | `handlers.spec.ts` | 登录/分页/鉴权 Mock 逻辑 |

## 4. 测试结果汇总

**结论：全部通过 ✅**

| 指标 | 结果 |
|------|------|
| 测试文件 | 7 / 7 通过 |
| 测试用例 | 29 / 29 通过 |
| 失败用例 | 0 |
| 语句覆盖率 | 42.04% |
| 分支覆盖率 | 68.08% |
| 函数覆盖率 | 48.07% |
| 行覆盖率 | 42.04% |

> 覆盖率说明：当前框架的 `pages`（页面组件）与部分 `index.ts` 聚合文件未纳入本次单测目标，故整体覆盖率偏低；**核心业务与状态逻辑覆盖率较高**（access.service、PermissionButton、auth.store 行覆盖均 ≥ 89%）。

## 5. 详细用例清单

### 5.1 services — access.service（6 通过）

| 用例 | 预期 | 结果 |
|------|------|------|
| 未登录用户不具备任何权限 | 返回 false | ✅ |
| 超级管理员默认拥有全部权限 | 返回 true | ✅ |
| 普通用户按权限码精确匹配 | 命中 true / 未命中 false | ✅ |
| hasAnyPermission 满足任一即通过 | 任一命中 true | ✅ |
| hasAllPermissions 需全部满足 | 全命中 true / 部分命中 false | ✅ |
| hasRole 按角色码匹配 | 命中 true / 未命中 false | ✅ |

### 5.2 services — auth.service（3 通过）

| 用例 | 预期 | 结果 |
|------|------|------|
| 登录成功后写入 token 并返回当前用户 | 调用 API、写入 token、返回 user | ✅ |
| 登出时清除 token | 调用 tokenStorage.remove | ✅ |
| isLoggedIn 依据 token 存储判定 | 有 token true / 无 token false | ✅ |

### 5.3 services — user.service（4 通过）

| 用例 | 预期 | 结果 |
|------|------|------|
| getUsers 归一化分页参数 | 缺省补 page=1 / page_size=10 | ✅ |
| createUser 非法邮箱直接抛错 | 抛出「邮箱格式不正确」 | ✅ |
| createUser 合法入参透传 API | 参数原样传给 API | ✅ |
| assignRoles 封装 role_ids | roleIds → { role_ids } | ✅ |

### 5.4 store — auth.store（3 通过）

| 用例 | 预期 | 结果 |
|------|------|------|
| 登录成功后写入用户并具备权限判断 | user 写入、超管放行 | ✅ |
| 登出后清空用户并调用服务 | 调用 logout、user 置空 | ✅ |
| loadProfile 从 /me 恢复用户与权限 | 用户与权限码恢复 | ✅ |

### 5.5 router — guards（4 通过）

| 用例 | 预期 | 结果 |
|------|------|------|
| 未登录访问受保护页面 | 重定向 /login | ✅ |
| 已登录但内存无用户信息 | 调用 /me 恢复后放行 | ✅ |
| 已登录但缺少页面权限 | 重定向 /403 | ✅ |
| 已登录且具备权限 | 正常放行 | ✅ |

### 5.6 components — PermissionButton（3 通过）

| 用例 | 预期 | 结果 |
|------|------|------|
| 具备权限时渲染按钮 | 按钮存在且显示文案 | ✅ |
| 缺少权限时不渲染按钮 | 按钮不存在 | ✅ |
| 未指定权限时默认可见 | 按钮存在 | ✅ |

### 5.7 mock — handlers（6 通过）

| 用例 | 预期 | 结果 |
|------|------|------|
| 登录成功返回 token 与当前用户 | code=200、token=用户名 | ✅ |
| 密码错误返回业务码 401 | code=401、data=null | ✅ |
| 分页搜索用户返回 items 与 total | items 长度 3、total>0 | ✅ |
| 关键词搜索过滤结果 | 仅返回匹配用户 | ✅ |
| 未携带 token 访问 /users/me | code=401 | ✅ |
| 携带 token 访问 /users/me | code=200、返回当前用户 | ✅ |

## 6. 结论

前端框架的分层架构（apis / services / router / store / pages / components）已搭建完成，并通过 **29 项 Mock 测试**，覆盖了：

1. **业务逻辑正确性**：认证编排、入参校验、权限判断；
2. **状态管理**：Pinia 登录态与权限恢复；
3. **路由安全**：登录态守卫与权限码守卫；
4. **组件权限控制**：按钮级显隐；
5. **Mock 数据层**：登录、分页、鉴权等请求处理逻辑。

测试全部通过，`npm run typecheck` 与 `npm run build` 亦均通过，框架可交付使用。

## 7. 复现方式

```bash
npm install
npm test                # 单次运行全部测试
npm run test:coverage   # 生成覆盖率报告
```
