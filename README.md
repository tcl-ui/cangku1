# 辰光Agent平台 — 前端框架

基于 **Vue 3 + TypeScript + Pinia + Vue Router** 的前端工程化框架，配套 Mock 数据层与 Mock 测试体系。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3（`<script setup lang="ts">`） |
| 语言 | TypeScript（strict） |
| 构建 | Vite 6 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| HTTP | Axios（封装 + 拦截器） |
| 测试 | Vitest + @vue/test-utils + happy-dom |

## 目录结构（分层架构）

```
src/
├── apis/             # ① axios 异步请求层：实例、拦截器、各模块 API 封装
│   ├── http.ts       #    axios 实例 + token 注入 + 响应解包 + 401/403 处理
│   ├── token.ts      #    token 存取工具
│   ├── auth.api.ts   #    认证/验证码/当前用户
│   ├── user.api.ts   #    用户 CRUD + 分页 + 分配角色
│   ├── role.api.ts   #    角色 CRUD + 分页 + 分配权限
│   └── permission.api.ts  # 权限 CRUD + 分页
├── services/         # ② 业务逻辑层：编排 API + 入参校验 + 权限判断
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── role.service.ts
│   ├── permission.service.ts
│   └── access.service.ts   # 纯函数权限判断（hasPermission/hasRole 等）
├── router/           # ③ 路由层：路由表 + 全局守卫（登录态 + 权限码）
├── store/            # ④ Pinia 状态层：认证状态 + 用户列表状态
├── pages/            # ⑤ 页面组件层（按模块分目录）
├── components/       # ⑥ 通用组件层（layout / common）
├── mock/             # Mock 数据层：本地数据 + axios adapter（无后端可运行）
├── types/            # 领域类型定义（DTO / 通用响应）
└── styles/           # 全局样式
```

**分层依赖方向**（单向，禁止反向引用）：

```
pages / components → store / services → apis → http(axios)
                     └── access.service（纯函数）
router → store → services
```

## 快速开始

```bash
npm install
npm run dev          # Mock 模式（默认，无需后端）
```

访问 http://localhost:5173，使用 Mock 账号 `admin / admin123` 登录。

切换到真实后端：

```bash
VITE_USE_MOCK=false VITE_API_BASE=http://localhost:8080 npm run dev
```

## 常用脚本

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Mock 模式） |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run typecheck` | 仅类型检查（vue-tsc） |
| `npm test` | 运行全部 Mock 测试（单次） |
| `npm run test:watch` | 监听模式 |
| `npm run test:coverage` | 生成覆盖率报告 |

## Mock 机制

`src/mock/adapter.ts` 实现了自定义 **axios adapter**，在 `VITE_USE_MOCK !== 'false'` 时替换 axios 底层网络请求，由本地内存数据直接响应。因此：

- 拦截器（token 注入 / 响应解包 / 业务码处理）与真实后端**完全一致**，切换无感；
- Mock 数据覆盖 RBAC 已实现接口：验证码、登录、用户/角色/权限 CRUD 与分页搜索。

## 权限控制（三层）

| 层级 | 实现 |
|------|------|
| 菜单显隐 | `components/layout/SidebarNav.vue` 按权限码过滤菜单 |
| 路由守卫 | `router/guards.ts` 校验 `meta.permission`，无权限跳 `/403` |
| 按钮级 | `components/common/PermissionButton.vue` 无权限时整按钮不渲染 |

## 新增模块的标准步骤

1. 在 `types/` 定义数据结构；
2. 在 `apis/<module>.api.ts` 封装接口；
3. 在 `services/<module>.service.ts` 编写业务逻辑；
4. 在 `store/<module>.store.ts`（如需要）封装状态；
5. 在 `pages/<module>/` 编写页面组件；
6. 在 `router/routes.ts` 登记路由（标注 `meta.permission`）；
7. 在 `mock/handlers.ts` 补充 Mock 接口。

## 测试

测试采用 **Mock 测试**策略：通过 `vi.mock` 在模块边界隔离依赖，测试业务逻辑与状态，不发起真实网络请求。详见 [docs/tests/前端框架Mock测试报告.md](docs/tests/前端框架Mock测试报告.md)。
