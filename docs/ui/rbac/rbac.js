/* =========================================================
   辰光 Agent 平台 — RBAC 授权模块原型脚本
   权限目录数据 + 身份切换演示 + 菜单/按钮权限门控 + 通用交互
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 权限码目录（对应 PRD 4.2） ---------- */
  var PERMISSION_GROUPS = [
    { module: 'dashboard', name: '工作台', color: 'mod-dashboard', perms: [
      { code: 'dashboard:view', name: '工作台', desc: '查看数据大盘' }
    ]},
    { module: 'agent', name: 'Agent 管理', color: 'mod-agent', perms: [
      { code: 'agent:list', name: 'Agent 列表' }, { code: 'agent:view', name: 'Agent 详情' },
      { code: 'agent:create', name: '创建 Agent' }, { code: 'agent:update', name: '编辑 Agent' },
      { code: 'agent:delete', name: '删除 Agent' }, { code: 'agent:publish', name: '发布 Agent' },
      { code: 'agent:test', name: '测试 Agent' }, { code: 'agent:version', name: '版本管理' },
      { code: 'agent:toggle', name: '启停 Agent' }
    ]},
    { module: 'model', name: '模型管理', color: 'mod-model', perms: [
      { code: 'model:list', name: '模型列表' }, { code: 'model:view', name: '模型详情' },
      { code: 'model:create', name: '创建模型' }, { code: 'model:update', name: '编辑模型' },
      { code: 'model:delete', name: '删除模型' }, { code: 'model:test', name: '连接测试' }
    ]},
    { module: 'provider', name: '模型供应商', color: 'mod-model', perms: [
      { code: 'provider:list', name: '供应商列表' }, { code: 'provider:create', name: '创建供应商' },
      { code: 'provider:update', name: '编辑供应商' }, { code: 'provider:delete', name: '删除供应商' }
    ]},
    { module: 'prompt', name: 'Prompt 管理', color: 'mod-prompt', perms: [
      { code: 'prompt:list', name: 'Prompt 列表' }, { code: 'prompt:view', name: 'Prompt 详情' },
      { code: 'prompt:create', name: '创建 Prompt' }, { code: 'prompt:update', name: '编辑 Prompt' },
      { code: 'prompt:delete', name: '删除 Prompt' }, { code: 'prompt:publish', name: '发布 Prompt' },
      { code: 'prompt:test', name: '测试 Prompt' }, { code: 'prompt:version', name: '版本管理' }
    ]},
    { module: 'knowledge', name: '知识库', color: 'mod-knowledge', perms: [
      { code: 'knowledge:list', name: '知识库列表' }, { code: 'knowledge:view', name: '知识库详情' },
      { code: 'knowledge:create', name: '创建知识库' }, { code: 'knowledge:update', name: '编辑知识库' },
      { code: 'knowledge:delete', name: '删除知识库' }, { code: 'knowledge:document', name: '文档管理' },
      { code: 'knowledge:segment', name: '分段管理' }, { code: 'knowledge:test', name: '检索测试' },
      { code: 'knowledge:reindex', name: '重建索引' }
    ]},
    { module: 'tool', name: '工具管理', color: 'mod-tool', perms: [
      { code: 'tool:list', name: '工具列表' }, { code: 'tool:view', name: '工具详情' },
      { code: 'tool:create', name: '创建工具' }, { code: 'tool:update', name: '编辑工具' },
      { code: 'tool:delete', name: '删除工具' }, { code: 'tool:test', name: '测试工具' },
      { code: 'tool:toggle', name: '启禁用工具' }
    ]},
    { module: 'conversation', name: '对话日志', color: 'mod-conversation', perms: [
      { code: 'conversation:list', name: '对话列表' }, { code: 'conversation:view', name: '对话详情' },
      { code: 'conversation:export', name: '导出对话' }
    ]},
    { module: 'analytics', name: '数据统计', color: 'mod-analytics', perms: [
      { code: 'analytics:view', name: '用量统计' }, { code: 'analytics:cost', name: '费用分析' },
      { code: 'analytics:evaluation', name: '效果评估' }
    ]},
    { module: 'user', name: '用户管理', color: 'mod-user', perms: [
      { code: 'user:list', name: '用户列表' }, { code: 'user:view', name: '用户详情' },
      { code: 'user:create', name: '创建用户' }, { code: 'user:update', name: '编辑用户' },
      { code: 'user:delete', name: '删除用户' }, { code: 'user:assign_roles', name: '分配角色' }
    ]},
    { module: 'role', name: '角色管理', color: 'mod-role', perms: [
      { code: 'role:list', name: '角色列表' }, { code: 'role:view', name: '角色详情' },
      { code: 'role:create', name: '创建角色' }, { code: 'role:update', name: '编辑角色' },
      { code: 'role:delete', name: '删除角色' }, { code: 'role:assign_permissions', name: '分配权限' }
    ]},
    { module: 'permission', name: '权限管理', color: 'mod-permission', perms: [
      { code: 'permission:list', name: '权限列表' }, { code: 'permission:view', name: '权限详情' },
      { code: 'permission:create', name: '创建权限' }, { code: 'permission:update', name: '编辑权限' },
      { code: 'permission:delete', name: '删除权限' }
    ]}
  ];

  function allCodes() {
    var out = [];
    PERMISSION_GROUPS.forEach(function (g) { g.perms.forEach(function (p) { out.push(p.code); }); });
    return out;
  }
  function readOnlyCodes() {
    return allCodes().filter(function (c) { return /:(list|view)$/.test(c); });
  }

  /* ---------- 演示身份 ---------- */
  var IDENTITIES = {
    admin: { key: 'admin', display: '超级管理员', username: 'admin', email: 'admin@example.com', isSuperuser: true, permissions: [] },
    viewer: { key: 'viewer', display: '访客（只读）', username: 'viewer', email: 'viewer@example.com', isSuperuser: false, permissions: readOnlyCodes() }
  };

  /* ---------- 角色数据（角色管理页用） ---------- */
  var ROLES = [
    { code: 'admin', name: '超级管理员', desc: '系统内置，拥有全部权限（is_superuser 绕过）', system: true, permissions: allCodes() },
    { code: 'ops', name: '运营管理员', desc: '平台功能全部 + 只读系统管理', system: true, permissions: allCodes().filter(function (c) { return !/^(user|role|permission):(create|update|delete|assign)/.test(c); }) },
    { code: 'viewer', name: '访客', desc: '各模块只读权限', system: true, permissions: readOnlyCodes() },
    { code: 'kb_editor', name: '知识库编辑', desc: '仅知识库模块读写', system: false, permissions: allCodes().filter(function (c) { return c.indexOf('knowledge:') === 0; }) }
  ];

  var RBAC = {
    current: IDENTITIES.admin,
    groups: PERMISSION_GROUPS,
    roles: ROLES,
    identities: IDENTITIES,
    hasPermission: function (code) {
      if (this.current.isSuperuser) return true;
      return this.current.permissions.indexOf(code) >= 0;
    },
    applyGating: function () {
      // 按钮 / 行操作 / 导航项
      document.querySelectorAll('[data-perm]').forEach(function (el) {
        var perm = el.getAttribute('data-perm');
        el.hidden = !RBAC.hasPermission(perm);
      });
      // 导航分组：子项全部隐藏时隐藏分组标题
      document.querySelectorAll('.nav-group').forEach(function (group) {
        var el = group.nextElementSibling, anyVisible = false;
        while (el && !el.classList.contains('nav-group')) {
          if (el.classList.contains('nav-item') && !el.hidden) anyVisible = true;
          el = el.nextElementSibling;
        }
        group.hidden = !anyVisible;
      });
      // 更新侧边栏用户区
      var u = this.current;
      document.querySelectorAll('[data-role="user-name"]').forEach(function (e) { e.textContent = u.display; });
      document.querySelectorAll('[data-role="user-email"]').forEach(function (e) { e.textContent = u.email; });
      document.querySelectorAll('[data-role="user-avatar"]').forEach(function (e) { e.textContent = u.display.charAt(0); });
      document.dispatchEvent(new CustomEvent('rbac:changed', { detail: this.current }));
    },
    setIdentity: function (key) {
      this.current = this.identities[key];
      this.applyGating();
      // 高亮切换按钮
      document.querySelectorAll('.seg button').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-identity') === key);
      });
      toast('已切换为「' + this.current.display + '」', 'violet');
    }
  };

  /* ---------- 通用交互 ---------- */
  function toast(msg, tone) {
    var t = document.createElement('div');
    t.className = 'toast' + (tone ? ' toast-' + tone : '');
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 250); }, 2200);
  }

  function openModal(id) {
    var o = document.getElementById(id);
    if (o) o.classList.add('open');
  }
  function closeModal(id) {
    var o = document.getElementById(id);
    if (o) o.classList.remove('open');
  }

  /* ---------- 权限树渲染（角色管理页） ---------- */
  function renderPermTree(container, selected, onChange) {
    if (!container) return;
    var sel = selected || [];
    var html = '';
    RBAC.groups.forEach(function (g) {
      var gCodes = g.perms.map(function (p) { return p.code; });
      var gChecked = gCodes.every(function (c) { return sel.indexOf(c) >= 0; });
      html += '<div class="perm-group" data-group="' + g.module + '">';
      html += '  <div class="perm-group-head" data-toggle>' +
        '    <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>' +
        '    <span class="gname">' + g.name + '</span>' +
        '    <span class="gmeta">' + gCheckedCount(g, sel) + ' / ' + gCodes.length + '</span>' +
        '  </div>';
      html += '  <div class="perm-body">';
      g.perms.forEach(function (p) {
        var checked = sel.indexOf(p.code) >= 0 ? ' checked' : '';
        html += '<label class="perm-check"><input type="checkbox" data-permcode="' + p.code + '"' + checked + '>' +
          '<span class="pc">' + p.code + '</span><span class="pn">' + p.name + '</span></label>';
      });
      html += '  </div></div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.perm-group-head').forEach(function (head) {
      head.addEventListener('click', function () {
        head.parentElement.classList.toggle('collapsed');
      });
    });
    container.querySelectorAll('input[data-permcode]').forEach(function (cb) {
      cb.addEventListener('change', function () {
        if (onChange) onChange(collectSelected(container));
        // 刷新组计数
        var group = cb.closest('.perm-group');
        var g = RBAC.groups.find(function (x) { return x.module === group.getAttribute('data-group'); });
        if (g) group.querySelector('.gmeta').textContent = gCheckedCount(g, collectSelected(container)) + ' / ' + g.perms.length;
      });
    });
    return collectSelected;
  }

  function gCheckedCount(g, sel) {
    return g.perms.filter(function (p) { return sel.indexOf(p.code) >= 0; }).length;
  }
  function collectSelected(container) {
    var out = [];
    container.querySelectorAll('input[data-permcode]:checked').forEach(function (cb) {
      out.push(cb.getAttribute('data-permcode'));
    });
    return out;
  }

  /* ---------- 初始化 ---------- */
  function initIdentitySwitch() {
    var seg = document.querySelector('.seg');
    if (!seg) return;
    seg.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () { RBAC.setIdentity(b.getAttribute('data-identity')); });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    // 关闭遮罩（点击遮罩空白处）
    document.querySelectorAll('.overlay').forEach(function (o) {
      o.addEventListener('click', function (e) { if (e.target === o) o.classList.remove('open'); });
    });
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { var m = b.closest('.overlay'); if (m) m.classList.remove('open'); });
    });
    initIdentitySwitch();
    RBAC.applyGating();
  });

  window.RBAC = RBAC;
  window.RBACHtml = { renderPermTree: renderPermTree, collectSelected: collectSelected, openModal: openModal, closeModal: closeModal, toast: toast };
})();
