/**
 * RBAC 权限码目录（权威清单，共 67 项、覆盖 12 个模块）。
 * 与 docs/spec/PROJECT_SPEC_V2.md 4.2 及 docs/ui/rbac/rbac.js 原型对齐。
 * 前端 UI（权限树/模块徽标）与 Mock 数据（permissions 表种子）共用此目录。
 */

export interface PermissionMeta {
  code: string
  name: string
  desc?: string
}

export interface PermissionGroup {
  /** 资源名（模块） */
  module: string
  /** 模块中文名称 */
  name: string
  /** 模块徽标 css class（见 styles/main.css .mod-*） */
  color: string
  perms: PermissionMeta[]
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  { module: 'dashboard', name: '工作台', color: 'mod-dashboard', perms: [
    { code: 'dashboard:view', name: '工作台', desc: '查看数据大盘' },
  ]},
  { module: 'agent', name: 'Agent 管理', color: 'mod-agent', perms: [
    { code: 'agent:list', name: 'Agent 列表' },
    { code: 'agent:view', name: 'Agent 详情' },
    { code: 'agent:create', name: '创建 Agent' },
    { code: 'agent:update', name: '编辑 Agent' },
    { code: 'agent:delete', name: '删除 Agent' },
    { code: 'agent:publish', name: '发布 Agent', desc: '生成版本快照' },
    { code: 'agent:test', name: '测试 Agent' },
    { code: 'agent:version', name: '版本管理', desc: '查看/回滚版本' },
    { code: 'agent:toggle', name: '启停 Agent' },
  ]},
  { module: 'model', name: '模型管理', color: 'mod-model', perms: [
    { code: 'model:list', name: '模型列表' },
    { code: 'model:view', name: '模型详情' },
    { code: 'model:create', name: '创建模型' },
    { code: 'model:update', name: '编辑模型' },
    { code: 'model:delete', name: '删除模型' },
    { code: 'model:test', name: '连接测试', desc: '模型连通性测试' },
  ]},
  { module: 'provider', name: '模型供应商', color: 'mod-model', perms: [
    { code: 'provider:list', name: '供应商列表' },
    { code: 'provider:create', name: '创建供应商' },
    { code: 'provider:update', name: '编辑供应商' },
    { code: 'provider:delete', name: '删除供应商' },
  ]},
  { module: 'prompt', name: 'Prompt 管理', color: 'mod-prompt', perms: [
    { code: 'prompt:list', name: 'Prompt 列表' },
    { code: 'prompt:view', name: 'Prompt 详情' },
    { code: 'prompt:create', name: '创建 Prompt' },
    { code: 'prompt:update', name: '编辑 Prompt' },
    { code: 'prompt:delete', name: '删除 Prompt' },
    { code: 'prompt:publish', name: '发布 Prompt' },
    { code: 'prompt:test', name: '测试 Prompt' },
    { code: 'prompt:version', name: '版本管理' },
  ]},
  { module: 'knowledge', name: '知识库', color: 'mod-knowledge', perms: [
    { code: 'knowledge:list', name: '知识库列表' },
    { code: 'knowledge:view', name: '知识库详情' },
    { code: 'knowledge:create', name: '创建知识库' },
    { code: 'knowledge:update', name: '编辑知识库' },
    { code: 'knowledge:delete', name: '删除知识库' },
    { code: 'knowledge:document', name: '文档管理', desc: '上传/处理/重试文档' },
    { code: 'knowledge:segment', name: '分段管理', desc: '查看/管理分段' },
    { code: 'knowledge:test', name: '检索测试' },
    { code: 'knowledge:reindex', name: '重建索引' },
  ]},
  { module: 'tool', name: '工具管理', color: 'mod-tool', perms: [
    { code: 'tool:list', name: '工具列表' },
    { code: 'tool:view', name: '工具详情' },
    { code: 'tool:create', name: '创建工具' },
    { code: 'tool:update', name: '编辑工具' },
    { code: 'tool:delete', name: '删除工具' },
    { code: 'tool:test', name: '测试工具' },
    { code: 'tool:toggle', name: '启禁用工具' },
  ]},
  { module: 'conversation', name: '对话日志', color: 'mod-conversation', perms: [
    { code: 'conversation:list', name: '对话列表' },
    { code: 'conversation:view', name: '对话详情' },
    { code: 'conversation:export', name: '导出对话' },
  ]},
  { module: 'analytics', name: '数据统计', color: 'mod-analytics', perms: [
    { code: 'analytics:view', name: '用量统计' },
    { code: 'analytics:cost', name: '费用分析' },
    { code: 'analytics:evaluation', name: '效果评估' },
  ]},
  { module: 'user', name: '用户管理', color: 'mod-user', perms: [
    { code: 'user:list', name: '用户列表', desc: '分页搜索用户' },
    { code: 'user:view', name: '用户详情', desc: '查看用户及其角色' },
    { code: 'user:create', name: '创建用户' },
    { code: 'user:update', name: '编辑用户' },
    { code: 'user:delete', name: '删除用户' },
    { code: 'user:assign_roles', name: '分配角色', desc: '给用户分配/替换角色' },
  ]},
  { module: 'role', name: '角色管理', color: 'mod-role', perms: [
    { code: 'role:list', name: '角色列表' },
    { code: 'role:view', name: '角色详情', desc: '含角色权限' },
    { code: 'role:create', name: '创建角色' },
    { code: 'role:update', name: '编辑角色' },
    { code: 'role:delete', name: '删除角色' },
    { code: 'role:assign_permissions', name: '分配权限', desc: '给角色分配权限' },
  ]},
  { module: 'permission', name: '权限管理', color: 'mod-permission', perms: [
    { code: 'permission:list', name: '权限列表' },
    { code: 'permission:view', name: '权限详情' },
    { code: 'permission:create', name: '创建权限' },
    { code: 'permission:update', name: '编辑权限' },
    { code: 'permission:delete', name: '删除权限' },
  ]},
]

/** 全部权限码（67 项） */
export const ALL_PERMISSION_CODES: string[] = PERMISSION_GROUPS.flatMap((g) =>
  g.perms.map((p) => p.code),
)

/** 稳定 id 映射：权限码 → 顺序 id（1 起）。目录内权限码 id 与此一致。 */
export const CODE_TO_ID = new Map<string, number>(
  ALL_PERMISSION_CODES.map((code, i) => [code, i + 1]),
)

/** 权限码 → 稳定 id（目录内码必命中） */
export function codeToId(code: string): number {
  return CODE_TO_ID.get(code) ?? 0
}

/** 权限码集合 → 稳定 id 集合（保持去重与排序） */
export function idsOfCodes(codes: string[]): number[] {
  const ids = codes
    .map((c) => CODE_TO_ID.get(c))
    .filter((v): v is number => v !== undefined)
  return Array.from(new Set(ids)).sort((a, b) => a - b)
}

/** 稳定 id 集合 → 权限码集合（排序） */
export function codesOfIds(ids: number[]): string[] {
  const map = new Map<number, string>([...CODE_TO_ID].map(([k, v]) => [v, k]))
  return ids
    .map((id) => map.get(id))
    .filter((c): c is string => c !== undefined)
    .sort()
}

/** 只读权限码（`:list` / `:view`，访客角色的建议集合） */
export const READ_ONLY_PERMISSION_CODES: string[] = ALL_PERMISSION_CODES.filter(
  (c) => /:(list|view)$/.test(c),
)

/** 权限码 → 所属模块信息 */
export function moduleOfCode(code: string): PermissionGroup | undefined {
  const prefix = code.split(':')[0]
  return PERMISSION_GROUPS.find((g) => g.module === prefix)
}

/** 权限码 → 中文名（未命中返回原码） */
export function permissionNameOf(code: string): string {
  for (const group of PERMISSION_GROUPS) {
    const hit = group.perms.find((p) => p.code === code)
    if (hit) return hit.name
  }
  return code
}
