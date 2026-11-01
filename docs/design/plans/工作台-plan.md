# 工作台模块 计划说明书

> **版本**：v1　|　**日期**：2026-11-01　|　**关联需求**：[PROJECT_SPEC.md](../../PROJECT_SPEC.md)
> **关联设计**：[app/docs/01-工作台.md](../../../app/docs/01-工作台.md)、[app/docs/10-API接口规范.md](../../../app/docs/10-API接口规范.md)
> **依赖**：[RBAC授权-plan.md](RBAC授权-plan.md)、[数据统计-plan.md](数据统计-plan.md)（统计数据源）、[系统管理扩展-plan.md](系统管理扩展-plan.md)（告警数据源）

---

**目标（Goal）**：从零实现工作台（Dashboard）后端接口，提供全局运营大盘的统计卡片、趋势图、Agent 排行、最近告警与资源用量，并接入 RBAC 授权。

**架构（Architecture）**：新建 `src/modules/dashboard/` 标准 5 层（或轻量 api+service，因无独立表）；数据来自对 `conversations`/`agents` 的聚合 + 系统告警表 + 资源配额配置；前端页面/Mock 已就绪，仅接线。

**技术栈**：FastAPI + SQLAlchemy 2.0 异步聚合；前端 React 19 + TS（图表由前端渲染）。

**关联规格（Spec）**：`app/docs/01-工作台.md`（卡片/趋势/排行/告警/资源用量）、`app/docs/10-API接口规范.md`。

---

## 一、全局约束

- 授权码：`dashboard:view`（登录即可访问工作台，但页面需登录态；权限码用于可选的「只看部分数据」扩展）。
- 资源用量（Token 配额/存储/并发/知识库数量）来自系统配置或环境配额，需定义默认值与上限。
- 返回结构对齐前端 `DashboardStats`/`TrendData`/`AgentRanking`/`Alert`（snake_case）。

## 二、范围边界

**范围内**：五个端点（stats/trends/top-agents/recent-alerts/resource-usage）+ 授权 + 前端接线。

**范围外**：实时推送大盘刷新（前端定时轮询即可）；告警产生（属「系统管理扩展-告警」）。

## 三、现状与差距

| 项 | 状态 |
|---|---|
| 后端 `dashboard` 模块 | ❌ 完全缺失 |
| 前端 Dashboard 页面 + Mock | ✅ 已实现 |
| 授权 | ❌ 缺失 |

## 四、数据模型

**无新表**。数据源：
- 统计卡片/趋势：聚合 `conversations`（今日调用量、Token、费用、环比）。
- 活跃 Agent 数：`agents.status == active` 计数。
- Agent 排行：按 `conversations` 按 agent 聚合调用量/成功率/延迟 Top 5。
- 最近告警：读 `active_alerts` 表（依赖「系统管理扩展」模块）。
- 资源用量：读系统配置（`system_settings`）或环境变量配额。

## 五、API 契约

| 端点 | 权限码 | 说明 |
|---|---|---|
| `GET /dashboard/stats` | `dashboard:view` | 今日调用量/Token消耗/费用估算/活跃Agent + 环比 |
| `GET /dashboard/trends` | `dashboard:view` | 近 7 天调用量 + Token 趋势（input/output 区分） |
| `GET /dashboard/top-agents` | `dashboard:view` | 调用量 Top 5（含成功率/延迟） |
| `GET /dashboard/recent-alerts` | `dashboard:view` | 最近告警列表 |
| `GET /dashboard/resource-usage` | `dashboard:view` | Token/存储/并发/知识库配额用量 |

## 六、文件结构

**后端（Create）**：
- `src/modules/dashboard/schema.py` / `service.py` / `api.py`（无 repository，直接聚合）
- Modify：`src/main.py`（注册路由）

**前端（Modify）**：
- `app/src/services/api/dashboard.ts`（五个方法）
- `app/src/pages/Dashboard.tsx`（接真实数据）

## 七、任务拆解

### 任务 1：统计聚合 Service

- [ ] 1.1 `schema.py` 定义五类响应（镜像前端类型，snake_case）。
- [ ] 1.2 `service.py` 实现 stats/trends/top-agents 聚合（今日调用量 + 环比、7 天时序、Top5 排行）。
- **验收**：`pytest` 以样本数据断言卡片数值、环比、排行顺序正确。

### 任务 2：告警与资源用量

- [ ] 2.1 `service.py` 实现 recent-alerts（读 `active_alerts`）与 resource-usage（读配置/环境配额）。
- [ ] 2.2 无告警表时返回空列表、无配额配置时返回默认上限（不报错）。
- **验收**：`pytest` 断言空数据降级、默认配额。

### 任务 3：API 路由 + 授权

- [ ] 3.1 `api.py` 实现五端点，`main.py` 注册；挂 `require_permission("dashboard:view")`。
- **验收**：端点正常；无权限返回 403。

### 任务 4：前端接线

- [ ] 4.1 `services/api/dashboard.ts` 接真实端点；`Dashboard.tsx` 改用真实数据。
- **验收**：`VITE_USE_MOCK=false` 下大盘正常；`npm run build`/`lint` 通过。

## 八、验收标准与关注点

**关注点**：
1. **跨模块依赖**：recent-alerts 依赖「系统管理扩展」的 `active_alerts` 表；两模块未同时上线时，本端点必须**降级返回空数组**而非报错。
2. 环比（`↑12.5%`）计算需处理「昨日为 0」的除零情况（返回 0 或 `null`，前端据此隐藏箭头）。
3. 资源配额口径需集中定义（建议放 `system_settings`），避免前端 Mock 与后端真实值不一致。
4. `dashboard:view` 与登录态的关系：工作台「登录即可看」，但保留权限码以便后续做「数据范围」裁剪。
