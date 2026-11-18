/* 班级积分榜 — 纯静态单页应用
 * 数据源：同目录 data.json
 * 教师写入：GitHub Contents API（Token 只保存在本机浏览器）
 */
(() => {
  'use strict';

  /* ============================================================
   * 常量
   * ============================================================ */
  const API_ROOT = 'https://api.github.com';
  const POLL_MS = 20000;
  const FLUSH_DELAY = 5000;
  const LS = {
    cfg: 'cp.cfg.v1',
    token: 'cp.token.v1',
    outbox: 'cp.outbox.v1',
    cache: 'cp.cache.v1',
    last: 'cp.last.v1',
    roll: 'cp.roll.v1',
  };
  const collator = new Intl.Collator('zh-Hans-CN', { numeric: true, sensitivity: 'base' });
  const STAR_LABEL = { homework: '作业之星', notes: '笔记之星' };

  const ICON = {
    flame: '<svg class="ic" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
    check: '<svg class="ic" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
    x: '<svg class="ic" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    arrow: '<svg class="ic" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg class="ic" viewBox="0 0 24 24"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    trash: '<svg class="ic" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>',
    zap: '<svg class="ic" viewBox="0 0 24 24"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    clipboard: '<svg class="ic" viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h4"/></svg>',
    link: '<svg class="ic" viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
    download: '<svg class="ic" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    upload: '<svg class="ic" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
    undo: '<svg class="ic" viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
    info: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/></svg>',
    spark: '<svg class="ic" viewBox="0 0 24 24"><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3z"/></svg>',
    star: '<svg class="ic" viewBox="0 0 24 24"><path d="M12 2l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17l-6.2 3.3 1.6-6.8L2.2 8.9l6.9-.6L12 2z"/></svg>',
    shuffle: '<svg class="ic" viewBox="0 0 24 24"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22M18 2l4 4-4 4M2 6h1.9c1.5 0 2.9.9 3.6 2.2M22 18h-5.9c-1.5 0-2.9-.9-3.6-2.2M18 14l4 4-4 4"/></svg>',
    award: '<svg class="ic" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.5 13 17 22l-5-3-5 3 1.5-9"/></svg>',
    image: '<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
  };

  /* ============================================================
   * 小工具
   * ============================================================ */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad2 = (n) => String(n).padStart(2, '0');
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
  const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const pct = (x) => `${Math.round((x || 0) * 100)}%`;

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function nowISO() { return new Date().toISOString(); }
  function toLocalDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  function fmtStamp(iso) {
    if (!iso) return '尚未更新';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '尚未更新';
    return `${d.getMonth() + 1}/${d.getDate()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  function fmtMD(dateStr) {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || '';
    const [, m, d] = dateStr.split('-');
    return `${Number(m)}/${Number(d)}`;
  }
  function fmtStarDate(d) {
    if (!d || !/^\d{8}$/.test(d)) return d || '';
    return `${d.slice(0, 4)}/${d.slice(4, 6)}/${d.slice(6, 8)}`;
  }
  function normalizeStarDate(s) {
    const t = String(s == null ? '' : s).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t.replace(/-/g, '');
    const v = t.replace(/[^\d]/g, '');
    return /^\d{8}$/.test(v) ? v : '';
  }
  function makeId(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }
  function storageGet(key, store = localStorage) {
    try { return store.getItem(key); } catch { return null; }
  }
  function storageSet(key, val, store = localStorage) {
    try { store.setItem(key, val); return true; } catch { return false; }
  }
  function storageDel(key, store = localStorage) {
    try { store.removeItem(key); } catch { /* ignore */ }
  }

  /* ============================================================
   * 数据模型
   * ============================================================ */
  function normalizeStudents(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    const seen = new Set();
    for (const item of raw) {
      const id = str(item);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
    return out.sort(collator.compare);
  }

  function normalizeHw(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = str(raw.id);
    const date = str(raw.date);
    if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return {
      id,
      date,
      title: str(raw.title) || '作业',
      points: clamp(num(raw.points, 2), 0, 1000),
      completed: Array.isArray(raw.completed) ? Array.from(new Set(raw.completed.map(String).filter(Boolean))) : [],
      createdAt: str(raw.createdAt) || nowISO(),
    };
  }

  function normalizeClassEntry(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = str(raw.id);
    const student = str(raw.student);
    if (!id || !student) return null;
    return {
      id,
      at: str(raw.at) || nowISO(),
      student,
      points: clamp(num(raw.points, 1), -1000, 1000),
      note: str(raw.note),
    };
  }

  function normalizeStars(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const date = normalizeStarDate(item.date);
      if (!date || seen.has(date)) continue;
      const ids = Array.isArray(item.ids) ? item.ids.map((x) => str(x)).filter(Boolean).slice(0, 3) : [];
      if (!ids.length) continue;
      seen.add(date);
      out.push({ date, ids, createdAt: str(item.createdAt) || nowISO() });
    }
    out.sort((a, b) => b.date.localeCompare(a.date));
    return out;
  }

  function normalizeData(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('data.json 格式不正确：需要是一个 JSON 对象');
    }
    const students = normalizeStudents(raw.students);
    if (!students.length) throw new Error('data.json 里没有学生名单（students 字段）');
    const meta = raw.meta && typeof raw.meta === 'object' ? raw.meta : {};
    const settings = raw.settings && typeof raw.settings === 'object' ? raw.settings : {};
    const homework = (Array.isArray(raw.homework) ? raw.homework : []).map(normalizeHw).filter(Boolean);
    const classLog = (Array.isArray(raw.classLog) ? raw.classLog : []).map(normalizeClassEntry).filter(Boolean);
    const starsRaw = raw.stars && typeof raw.stars === 'object' ? raw.stars : {};
    return {
      version: 1,
      meta: {
        className: str(meta.className) || '班级积分榜',
        term: str(meta.term),
        createdAt: str(meta.createdAt) || nowISO(),
        updatedAt: meta.updatedAt ? String(meta.updatedAt) : null,
      },
      settings: {
        homeworkPoints: clamp(num(settings.homeworkPoints, 2), 0, 1000),
        classPoints: clamp(num(settings.classPoints, 1), 0, 1000),
      },
      students,
      homework,
      classLog,
      stars: {
        homework: normalizeStars(starsRaw.homework),
        notes: normalizeStars(starsRaw.notes),
      },
    };
  }

  function cloneData(d) {
    return {
      version: d.version,
      meta: { ...d.meta },
      settings: { ...d.settings },
      students: d.students.slice(),
      homework: d.homework.map((h) => ({ ...h, completed: h.completed.slice() })),
      classLog: d.classLog.map((e) => ({ ...e })),
      stars: {
        homework: (d.stars.homework || []).map((e) => ({ ...e, ids: e.ids.slice() })),
        notes: (d.stars.notes || []).map((e) => ({ ...e, ids: e.ids.slice() })),
      },
    };
  }

  function hwCompare(a, b) {
    return String(a.date).localeCompare(String(b.date)) || String(a.createdAt).localeCompare(String(b.createdAt));
  }

  /** 纯函数：把一个操作应用到数据上，返回新对象（用于离线重放与冲突重试） */
  function applyOp(data, op) {
    const d = cloneData(data);
    const at = op.at || nowISO();
    switch (op.t) {
      case 'hw.upsert': {
        const hw = normalizeHw(op.hw);
        if (!hw) return d;
        const i = d.homework.findIndex((h) => h.id === hw.id);
        if (i >= 0) d.homework[i] = hw;
        else d.homework.push(hw);
        d.homework.sort(hwCompare);
        break;
      }
      case 'hw.del':
        d.homework = d.homework.filter((h) => h.id !== op.id);
        break;
      case 'class.add': {
        const e = normalizeClassEntry(op.entry);
        if (e && !d.classLog.some((x) => x.id === e.id)) d.classLog.push(e);
        break;
      }
      case 'class.del':
        d.classLog = d.classLog.filter((e) => e.id !== op.id);
        break;
      case 'settings.patch':
        d.settings = { ...d.settings, ...(op.patch || {}) };
        d.settings.homeworkPoints = clamp(num(d.settings.homeworkPoints, 2), 0, 1000);
        d.settings.classPoints = clamp(num(d.settings.classPoints, 1), 0, 1000);
        break;
      case 'meta.patch':
        d.meta = { ...d.meta, ...(op.patch || {}) };
        break;
      case 'roster.set':
        d.students = normalizeStudents(op.students);
        break;
      case 'config.set':
        d.meta = { ...d.meta, ...(op.meta || {}) };
        d.settings = { ...d.settings, ...(op.settings || {}) };
        d.settings.homeworkPoints = clamp(num(d.settings.homeworkPoints, 2), 0, 1000);
        d.settings.classPoints = clamp(num(d.settings.classPoints, 1), 0, 1000);
        break;
      case 'clear':
        d.homework = [];
        d.classLog = [];
        break;
      case 'stars.add': {
        const type = op.type === 'notes' ? 'notes' : 'homework';
        const e = normalizeStars([op.entry])[0];
        if (!e) return d;
        d.stars[type] = [e].concat(d.stars[type].filter((x) => x.date !== e.date)).sort((a, b) => b.date.localeCompare(a.date));
        break;
      }
      case 'stars.del': {
        const type = op.type === 'notes' ? 'notes' : 'homework';
        d.stars[type] = d.stars[type].filter((x) => x.date !== op.date);
        break;
      }
      case 'replace': {
        const next = normalizeData(op.data);
        next.meta.updatedAt = at;
        return next;
      }
      default:
        return d;
    }
    d.meta.updatedAt = at;
    return d;
  }

  function applyOps(data, ops) {
    let out = data;
    for (const op of ops || []) {
      if (!op || typeof op !== 'object' || !op.t) continue;
      out = applyOp(out, op);
    }
    return out;
  }

  /* ============================================================
   * 统计
   * ============================================================ */
  function compute(data) {
    const hw = data.homework.slice().sort(hwCompare);
    const hwSets = hw.map((h) => new Set(h.completed));
    const today = todayISO();
    const rows = data.students.map((id) => ({
      id, hwPts: 0, hwCount: 0, streak: 0, best: 0,
      classPts: 0, classCount: 0, todayPts: 0, todayCount: 0,
      total: 0, totalRank: 0, hwRank: 0, rate: 0, recent: [], lastDate: '',
    }));
    const byId = new Map(rows.map((r) => [r.id, r]));

    for (const e of data.classLog) {
      const r = byId.get(e.student);
      if (!r) continue;
      r.classPts += e.points;
      r.classCount += 1;
      if (toLocalDate(e.at) === today) {
        r.todayPts += e.points;
        r.todayCount += 1;
      }
    }

    let completions = 0;
    hw.forEach((h, i) => {
      for (const id of hwSets[i]) {
        const r = byId.get(id);
        if (!r) continue;
        r.hwPts += h.points;
        r.hwCount += 1;
        completions += 1;
        if (h.date > r.lastDate) r.lastDate = h.date;
      }
    });

    const recentHw = hw.slice(-6).reverse();
    for (const r of rows) {
      r.total = r.hwPts + r.classPts;
      r.rate = hw.length ? r.hwCount / hw.length : 0;
      r.recent = recentHw.map((h, idx) => {
        const hwIndex = hw.length - 1 - idx;
        return { date: h.date, title: h.title, ok: hwSets[hwIndex].has(r.id) };
      });
      let k = hw.length - 1;
      while (k >= 0 && hwSets[k].has(r.id)) { r.streak += 1; k -= 1; }
      let run = 0;
      for (let i = 0; i < hw.length; i += 1) {
        if (hwSets[i].has(r.id)) { run += 1; if (run > r.best) r.best = run; }
        else run = 0;
      }
    }

    const totalSorted = rows.slice().sort((a, b) =>
      b.total - a.total || b.hwPts - a.hwPts || b.classPts - a.classPts || collator.compare(a.id, b.id));
    totalSorted.forEach((r, i) => { r.totalRank = i + 1; });

    const hwSorted = rows.slice().sort((a, b) =>
      b.hwPts - a.hwPts || b.classPts - a.classPts || b.streak - a.streak || collator.compare(a.id, b.id));
    hwSorted.forEach((r, i) => { r.hwRank = i + 1; });

    const last = hw.length ? hw[hw.length - 1] : null;
    const lastDone = last ? last.completed.filter((id) => byId.has(id)).length : 0;
    const avgRate = hw.length ? completions / (data.students.length * hw.length) : 0;

    return {
      rows, byId, totalSorted, hwSorted, last, hwTotal: hw.length,
      classStats: {
        students: data.students.length,
        hwTotal: hw.length,
        lastDone,
        lastRate: data.students.length ? lastDone / data.students.length : 0,
        avgRate,
      },
    };
  }

  /* ============================================================
   * 全局状态
   * ============================================================ */
  let cfg = null;              // { owner, repo, branch, path, token, remember }
  let remote = null;           // 服务器（或 Pages）上的原始数据
  let remoteSha = null;
  let pending = [];            // 尚未写回 GitHub 的操作
  let state = null;            // 视图数据 = remote + pending
  let cmp = null;
  let flushing = false;
  let flushTimer = null;
  let lastRouteKey = '';
  let connEditing = false;
  let apiIssue = null;
  let scoreAmt = null;
  let roll = null;
  let rolling = false;
  let rollTimer = null;
  let booted = false;

  const app = $('#app');

  function cfgKey(c) {
    return c ? `${c.owner}/${c.repo}@${c.branch}:${c.path}` : '';
  }
  function canWrite() {
    return !!(cfg && cfg.token && cfg.owner && cfg.repo && cfg.branch && cfg.path);
  }
  function isAdmin() { return parseRoute().name === 'admin'; }

  /* ============================================================
   * 存储
   * ============================================================ */
  function loadCfg() {
    try {
      const base = JSON.parse(storageGet(LS.cfg) || 'null');
      if (!base || !base.owner || !base.repo) return null;
      const token = storageGet(LS.token) || storageGet(LS.token, sessionStorage) || '';
      return {
        owner: String(base.owner), repo: String(base.repo),
        branch: String(base.branch || 'main'), path: String(base.path || 'data.json'),
        token, remember: base.remember !== false,
      };
    } catch { return null; }
  }
  function saveCfg(next) {
    storageSet(LS.cfg, JSON.stringify({
      owner: next.owner, repo: next.repo, branch: next.branch, path: next.path, remember: next.remember !== false,
    }));
    if (next.remember === false) {
      storageSet(LS.token, next.token, sessionStorage);
      storageDel(LS.token);
    } else {
      storageSet(LS.token, next.token);
      storageDel(LS.token, sessionStorage);
    }
  }
  function clearCfg() {
    storageDel(LS.cfg);
    storageDel(LS.token);
    storageDel(LS.token, sessionStorage);
  }
  function loadOutbox() {
    try {
      const box = JSON.parse(storageGet(LS.outbox) || 'null');
      if (!box || !Array.isArray(box.ops)) return [];
      if (!cfg || (box.key && box.key !== cfgKey(cfg))) return [];
      return box.ops.filter((op) => op && typeof op === 'object' && op.t);
    } catch { return []; }
  }
  function saveOutbox() {
    if (!cfg && !pending.length) return;
    storageSet(LS.outbox, JSON.stringify({ key: cfg ? cfgKey(cfg) : '', ops: pending }));
  }
  function cacheSet(data) {
    try {
      storageSet(LS.cache, JSON.stringify({ at: Date.now(), data }));
    } catch { /* quota */ }
  }
  function cacheGet() {
    try {
      const box = JSON.parse(storageGet(LS.cache) || 'null');
      if (!box || !box.data) return null;
      return normalizeData(box.data);
    } catch { return null; }
  }
  function lastId() {
    const id = storageGet(LS.last) || '';
    if (!state || !state.students.includes(id)) return '';
    return id;
  }
  function saveLastId(id) {
    if (id) storageSet(LS.last, id);
  }

  /* ============================================================
   * 学号解析
   * ============================================================ */
  function resolveId(rawValue, students) {
    const s = String(rawValue == null ? '' : rawValue).trim();
    if (!s || !students || !students.length) return null;
    if (students.includes(s)) return s;
    const upper = students.find((x) => x.toUpperCase() === s.toUpperCase());
    if (upper) return upper;
    if (/^\d+$/.test(s)) {
      const n = String(parseInt(s, 10));
      return students.find((x) => /^\d+$/.test(x) && String(parseInt(x, 10)) === n) || null;
    }
    return null;
  }
  function parseIds(text, students) {
    const tokens = String(text || '').split(/[\s,，、;；/]+/).map((s) => s.trim()).filter(Boolean);
    const ids = [];
    const unknown = [];
    for (const t of tokens) {
      const hit = resolveId(t, students);
      if (hit) { if (!ids.includes(hit)) ids.push(hit); }
      else if (!unknown.includes(t)) unknown.push(t);
    }
    return { ids, unknown };
  }
  function parseRoster(text) {
    return normalizeStudents(String(text || '').split(/[\s,，、;；]+/).filter(Boolean));
  }
  function fieldValue(form, name) {
    const el = form.elements.namedItem(name);
    return el ? String(el.value || '') : '';
  }

  /* ============================================================
   * GitHub API
   * ============================================================ */
  class ApiError extends Error {
    constructor(message, status) { super(message); this.status = status || 0; }
  }
  function errText(e) {
    if (!e) return '未知错误';
    if (e.status === 401) return 'Token 无效或已过期，请重新生成一个。';
    if (e.status === 403) return '没有权限：请确认 Token 对这个仓库有 Contents 读写权限。';
    if (e.status === 404) return '找不到仓库或 data.json，请检查仓库名、分支和文件路径。';
    if (e.status === 409) return '数据刚被其他设备改过，正在自动重试。';
    if (e.status === 422) return 'GitHub 拒绝了这次写入，请检查 Token 权限和分支。';
    return e.message || '网络请求失败，请稍后重试。';
  }
  function contentsUrl(c, withRef = true) {
    const path = String(c.path).split('/').map(encodeURIComponent).join('/');
    const base = `${API_ROOT}/repos/${encodeURIComponent(c.owner)}/${encodeURIComponent(c.repo)}/contents/${path}`;
    return withRef ? `${base}?ref=${encodeURIComponent(c.branch)}` : base;
  }
  function apiHeaders(c, extra) {
    return {
      Authorization: `Bearer ${c.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(extra || {}),
    };
  }
  async function apiGet(c = cfg) {
    if (!c || !c.token) throw new ApiError('尚未连接 GitHub', 0);
    let r;
    try {
      r = await fetch(contentsUrl(c), { headers: apiHeaders(c), cache: 'no-store' });
    } catch {
      throw new ApiError('网络不可用，连不上 GitHub', 0);
    }
    if (r.status === 401) throw new ApiError('Token 无效', 401);
    if (r.status === 404) throw new ApiError('找不到仓库或数据文件', 404);
    if (r.status === 403) {
      const remain = r.headers.get('x-ratelimit-remaining');
      throw new ApiError(remain === '0' ? 'GitHub 接口调用次数已用完' : '没有权限', 403);
    }
    if (!r.ok) throw new ApiError(`GitHub 返回 ${r.status}`, r.status);
    const j = await r.json();
    if (j.encoding !== 'base64' || typeof j.content !== 'string') {
      throw new ApiError('无法读取 data.json（文件可能过大）', 0);
    }
    let parsed;
    try {
      parsed = JSON.parse(decodeBase64(j.content));
    } catch {
      throw new ApiError('data.json 不是合法的 JSON', 0);
    }
    return { data: normalizeData(parsed), sha: j.sha };
  }
  async function apiPut(data, sha, ops) {
    if (!cfg || !cfg.token) throw new ApiError('尚未连接 GitHub', 0);
    const body = {
      message: commitMessage(ops),
      content: encodeBase64(`${JSON.stringify(data, null, 2)}\n`),
      branch: cfg.branch,
    };
    if (sha) body.sha = sha;
    let r;
    try {
      r = await fetch(contentsUrl(cfg, false), {
        method: 'PUT',
        headers: apiHeaders(cfg, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(body),
      });
    } catch {
      throw new ApiError('网络不可用，修改已保存在本机，稍后自动重试', 0);
    }
    if (r.status === 409) throw new ApiError('版本冲突', 409);
    if (r.status === 401) throw new ApiError('Token 无效', 401);
    if (r.status === 403) throw new ApiError('没有写入权限', 403);
    if (r.status === 404) throw new ApiError('找不到仓库或数据文件', 404);
    if (r.status === 422) throw new ApiError('GitHub 拒绝了写入', 422);
    if (!r.ok) throw new ApiError(`写入失败（${r.status}）`, r.status);
    let j = null;
    try { j = await r.json(); } catch { /* ignore */ }
    return { sha: j && j.content ? j.content.sha : null };
  }
  function commitMessage(ops) {
    const list = ops || [];
    const cls = list.filter((o) => o.t === 'class.add' || o.t === 'class.del').length;
    const hw = list.filter((o) => o.t === 'hw.upsert' || o.t === 'hw.del').length;
    if (cls && !hw) return `课堂加分 ${cls} 条`;
    if (hw && !cls) return '导入/更新作业';
    return `更新班级积分数据（${list.length} 项）`;
  }
  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function decodeBase64(b64) {
    const clean = String(b64).replace(/\s/g, '');
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ============================================================
   * 读取数据（教师设备走 API，其他设备走 Pages 上的 data.json）
   * ============================================================ */
  async function fetchPublic() {
    let r;
    try {
      r = await fetch(`./data.json?v=${Date.now()}`, { cache: 'no-store' });
    } catch {
      throw new Error('读不到 data.json。请通过网址访问页面，不要直接双击打开 HTML 文件。');
    }
    if (!r.ok) throw new Error(r.status === 404 ? '找不到 data.json，请确认它和 index.html 在同一个目录。' : `读取 data.json 失败（${r.status}）`);
    let raw;
    try { raw = await r.json(); } catch { throw new Error('data.json 不是合法的 JSON。'); }
    return normalizeData(raw);
  }
  async function readSource() {
    if (canWrite()) {
      try {
        const res = await apiGet();
        apiIssue = null;
        return res;
      } catch (e) {
        apiIssue = e;
        console.warn('[积分榜] GitHub 读取失败，回退到页面数据：', e);
      }
    }
    return { data: await fetchPublic(), sha: null };
  }

  /* ============================================================
   * 同步
   * ============================================================ */
  function setSync(kind, msg) {
    const el = $('#syncState');
    const txt = $('#syncText');
    if (!el || !txt) return;
    el.className = `sync ${kind}`;
    const labels = {
      ok: '实时',
      syncing: '同步中',
      pending: `待同步 ${pending.length}`,
      error: '连接异常',
      offline: '离线',
      cache: '缓存数据',
    };
    txt.textContent = msg || labels[kind] || '';
    el.title = kind === 'error' && apiIssue ? errText(apiIssue) : (labels[kind] || '');
  }

  function scheduleFlush(delay = FLUSH_DELAY) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, delay);
  }

  async function flush(manual = false) {
    if (!canWrite()) {
      if (manual) toast('请先在「教师 → 连接 GitHub」里完成连接', 'bad');
      return;
    }
    if (!pending.length) {
      if (manual) {
        setSync('syncing');
        try {
          const res = await apiGet();
          remote = res.data;
          remoteSha = res.sha;
          apiIssue = null;
          state = applyOps(remote, pending);
          cmp = compute(state);
          cacheSet(state);
          if (isAdmin()) { renderIdGrid(true); refreshAdmin(); } else render();
          setSync('ok');
          toast('已是最新数据', 'ok');
        } catch (e) {
          apiIssue = e;
          setSync('error');
          toast(errText(e), 'bad');
        }
      }
      return;
    }
    if (flushing) return;
    flushing = true;
    setSync('syncing');
    let tries = 0;
    let failure = null;

    while (pending.length && tries < 3) {
      const batch = pending.slice();
      try {
        const res = await apiGet();
        let next = res.data;
        for (const op of batch) next = applyOp(next, op);
        next.meta.updatedAt = batch[batch.length - 1].at || nowISO();
        const out = await apiPut(next, res.sha, batch);
        remote = next;
        remoteSha = out.sha || remoteSha;
        apiIssue = null;
        pending.splice(0, batch.length);
        saveOutbox();
        state = applyOps(remote, pending);
        cmp = compute(state);
        cacheSet(state);
        setSync('ok');
        if (isAdmin()) {
          refreshAdmin();
        } else if (!isEditingField()) {
          render();
        }
      } catch (e) {
        failure = e;
        if (e.status === 409) {
          tries += 1;
          continue;
        }
        const firstFailure = tries === 0;
        tries = 3;
        apiIssue = e.status === 401 || e.status === 403 ? e : apiIssue;
        setSync(navigator.onLine ? 'error' : 'offline');
        if (manual || firstFailure) toast(errText(e), 'bad');
        break;
      }
    }

    flushing = false;
    if (pending.length) {
      const hardFail = failure && [401, 403, 404, 422].includes(failure.status);
      if (hardFail) {
        setSync('error');
      } else {
        setSync(navigator.onLine ? 'pending' : 'offline');
        if (!flushTimer) scheduleFlush(15000);
      }
    } else {
      setSync('ok');
    }
  }

  function commit(op, opts = {}) {
    if (!canWrite()) {
      toast('请先在「教师 → 连接 GitHub」里完成连接', 'bad');
      return false;
    }
    op.at = op.at || nowISO();
    pending.push(op);
    saveOutbox();
    state = applyOp(state, op);
    cmp = compute(state);
    cacheSet(state);
    if (isAdmin()) refreshAdmin();
    else if (parseRoute().name === 'roll') setRollUI();
    else render();
    setSync('pending');
    scheduleFlush(opts.immediate ? 80 : FLUSH_DELAY);
    return true;
  }

  function isEditingField() {
    const ae = document.activeElement;
    return !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT');
  }

  /* ============================================================
   * 路由与渲染
   * ============================================================ */
  function parseRoute() {
    const raw = location.hash.replace(/^#\/?/, '');
    if (raw.startsWith('me/')) {
      let id = raw.slice(3);
      try { id = decodeURIComponent(id); } catch { /* ignore */ }
      return { name: 'me', id };
    }
    if (raw === 'board' || raw === 'total' || raw === 'me' || raw === 'admin' || raw === 'roll') return { name: raw };
    if (raw === 'stars') return { name: 'stars' };
    if (raw.startsWith('stars/')) {
      const seg = raw.slice(6).split('/').map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
      const type = seg[0] === 'notes' ? 'notes' : (seg[0] === 'homework' ? 'homework' : null);
      if (!type) return { name: 'stars' };
      if (seg.length === 1) return { name: 'starsType', type };
      return { name: 'starsScan', type, date: seg[1] || '', id: seg[2] || '' };
    }
    return { name: 'board' };
  }
  function routeKey(r) {
    return r.name + (r.type ? `/${r.type}` : '') + (r.date ? `/${r.date}` : '') + (r.id ? `/${r.id}` : '');
  }

  function updateNav(name) {
    $$('[data-nav]').forEach((a) => a.classList.toggle('on', a.dataset.nav === name));
  }

  function render() {
    if (!state) return;
    const r = parseRoute();
    const key = routeKey(r);
    const routeChanged = key !== lastRouteKey;
    lastRouteKey = key;
    if (r.name !== 'admin') connEditing = false;
    updateNav(r.name);
    const brand = $('#brandClass');
    if (brand) brand.textContent = state.meta.className || '班级';
    cmp = compute(state);

    if (r.name === 'admin') {
      if (scoreAmt == null) scoreAmt = clamp(Math.round(state.settings.classPoints) || 1, 1, 3);
      app.innerHTML = viewAdmin();
      initAdmin();
    } else if (r.name === 'roll') {
      app.innerHTML = viewRoll();
      initRoll();
    } else if (r.name === 'stars' || r.name === 'starsType' || r.name === 'starsScan') {
      app.innerHTML = viewStars(r);
      if (r.name === 'starsScan') initScan(r);
    } else if (r.name === 'total') {
      app.innerHTML = viewTotal();
    } else if (r.name === 'me') {
      app.innerHTML = viewMe(r);
      if (r.id) {
        const id = resolveId(r.id, state.students);
        if (id) saveLastId(id);
      }
      if (routeChanged && r.id) {
        setTimeout(() => {
          const input = $('#lookupInput');
          if (input && document.activeElement !== input) input.blur();
        }, 0);
      }
    } else {
      app.innerHTML = viewBoard();
    }
    if (routeChanged) window.scrollTo({ top: 0, behavior: 'auto' });
    updateSyncAfterRender();
  }

  function updateSyncAfterRender() {
    if (pending.length) setSync(navigator.onLine ? 'pending' : 'offline');
    else if (apiIssue && canWrite()) setSync('error');
    else setSync('ok');
  }

  function viewBoard() {
    const cs = cmp.classStats;
    const top = cmp.hwSorted.slice(0, 5);
    const hasHw = state.homework.length > 0;
    const head = boardHead(cs);
    const foot = boardFoot();
    if (!hasHw) {
      return `<div class="board">
        ${head}
        <div class="empty">
          <div class="eicon">${ICON.clipboard}</div>
          <h2>榜单等着第一次作业</h2>
          <p>批改完第一次作业后，在「教师」里导入完成情况，这里就会亮起来。</p>
          <p class="hint">学生输入学号，就能看到自己的排名、积分和连击。</p>
        </div>
        ${honorStrip()}
        ${foot}
      </div>`;
    }
    const podium = top.slice(0, 3).map((s, i) => podiumCard(s, i + 1)).join('');
    const rest = top.slice(3).map((s, i) => chaseRow(s, i + 4)).join('');
    return `<div class="board">
      ${head}
      <div class="podium">${podium}</div>
      ${rest ? `<div class="chase">${rest}</div>` : ''}
      ${honorStrip()}
      ${foot}
    </div>`;
  }

  function boardHead(cs) {
    const last = cmp.last;
    const lastCard = last ? `
      <div class="last-card" title="${esc(last.title)}">
        <span class="lc-label">最近一次作业</span>
        <div class="lc-main"><b>${fmtMD(last.date)}</b><span>${cs.lastDone} / ${cs.students} 人提交</span></div>
        <div class="lc-bar"><i style="width:${Math.round(cs.lastRate * 100)}%"></i></div>
      </div>` : '';
    return `<div class="board-head">
      <div class="bh-title">
        <div class="eyebrow"><span class="live-dot"></span>CLASS LEADERBOARD${state.meta.term ? ` <span class="thin">· ${esc(state.meta.term)}</span>` : ''}</div>
        <h1>作业提交榜 <span class="top-n">TOP 5</span></h1>
        <p class="bh-sub">累计 <b>${cs.hwTotal}</b> 次作业 <span class="d">·</span> 全班提交率 <b>${pct(cs.avgRate)}</b> <span class="d">·</span> 更新于 <b>${fmtStamp(state.meta.updatedAt)}</b></p>
      </div>
      ${lastCard}
    </div>`;
  }

  function podiumCard(s, place) {
    const streak = s.streak > 0
      ? `<span class="streak">${ICON.flame}<span>${s.streak} 连</span></span>`
      : '<span class="streak zero">暂无连击</span>';
    return `<article class="pcard p${place}" data-rank="${place}">
      <div class="pc-head"><span class="medal">${place}</span><span class="pc-place">第 ${place} 名</span>${streak}</div>
      <div class="pc-id">${esc(s.id)}</div>
      <div class="pc-metric"><b>${s.hwCount}</b><i>次作业</i></div>
      <div class="pc-foot"><span>作业积分 <b>${s.hwPts}</b></span><span>提交率 <b>${pct(s.rate)}</b></span></div>
    </article>`;
  }

  function chaseRow(s, place) {
    const streak = s.streak > 0
      ? `${ICON.flame}<span>${s.streak} 连</span>`
      : '<span>连击 0</span>';
    return `<article class="rrow">
      <span class="rrank">${place}</span>
      <span class="rid">${esc(s.id)}</span>
      <span class="rmeta">${s.hwCount} 次作业 <span class="rdot">·</span> <span class="rflame">${streak}</span> <span class="rdot">·</span> 提交率 ${pct(s.rate)}</span>
      <span class="rscore">${s.hwPts}<small>分</small></span>
    </article>`;
  }

  function boardFoot() {
    return `<footer class="board-foot">
      <p class="legend"><b>只显示学号，不记录姓名</b> · 作业积分 = 每次完成 +${state.settings.homeworkPoints} 分 · 同分按课堂表现与连击排序</p>
      <a class="cta" href="#/me">查我的成绩 ${ICON.arrow}</a>
    </footer>`;
  }

  function honorStrip() {
    const hw = (state.stars.homework || [])[0];
    const nt = (state.stars.notes || [])[0];
    return `<section class="honor">
      ${honorCard('homework', '作业之星', hw)}
      ${honorCard('notes', '笔记之星', nt)}
    </section>`;
  }

  function honorCard(type, label, entry) {
    const ids = entry ? entry.ids.map((id) => `<span class="hc-id">${esc(id)}</span>`).join('') : '';
    return `<a class="honor-card" href="#/stars/${type}">
      <div class="hc-top">${ICON.star}<span>${label}</span></div>
      ${entry
        ? `<div class="hc-date">${fmtStarDate(entry.date)}</div><div class="hc-ids">${ids}</div>`
        : '<div class="hc-none">本期未评选</div>'}
      <div class="hc-more">查看往期 ${ICON.arrow}</div>
    </a>`;
  }

  function viewTotal() {
    const rows = cmp.totalSorted;
    const mine = lastId();
    return `<div class="total-wrap">
      <div class="sec-head">
        <div>
          <div class="eyebrow">TOTAL RANKING</div>
          <h1>总榜</h1>
          <p>总分 = 作业积分 + 课堂表现积分 · 共 ${rows.length} 人</p>
        </div>
        <a class="btn small ghost" href="#/me">${ICON.arrow} 查我的成绩</a>
      </div>
      ${!cmp.hwTotal ? '<p class="hint" style="margin:-2px 0 12px">还没有作业记录。老师导入第一次作业后，总分和排名就会自动出现。</p>' : ''}
      <div class="table">
        <div class="thead">
          <span>排名</span><span>学号</span><span class="num">总分</span>
          <span class="num col-hw">作业</span><span class="num col-cls">课堂</span><span>连击</span>
        </div>
        ${rows.map((s) => totalRow(s, mine)).join('')}
        <div class="tfoot">同分依次比较：作业积分 → 课堂积分 → 学号。连续提交 = 最近连续完成作业的次数。</div>
      </div>
    </div>`;
  }

  function totalRow(s, mine) {
    const place = s.totalRank;
    const cls = place <= 3 ? ` t${place}` : '';
    const me = mine && s.id === mine ? ' me' : '';
    return `<div class="trow${cls}${me}">
      <span class="rk">${place}</span>
      <span class="tid">${esc(s.id)}</span>
      <span class="tot">${s.total}</span>
      <span class="num col-hw">${s.hwPts}</span>
      <span class="num col-cls">${s.classPts}</span>
      <span class="st${s.streak ? '' : ' zero'}">${s.streak ? `${ICON.flame}${s.streak} 连` : '—'}</span>
    </div>`;
  }

  function viewMe(r) {
    const resolved = r.id ? resolveId(r.id, state.students) : null;
    const invalid = !!(r.id && !resolved);
    const s = resolved ? cmp.byId.get(resolved) : null;
    const inputValue = r.id || lastId() || '';
    const last = lastId();
    return `<div class="me-wrap">
      <section class="lookup">
        <div class="eyebrow">CHECK MY SCORE</div>
        <h1>查我的成绩</h1>
        <p class="lead">输入学号，查看自己的排名、积分、连击和作业提交情况。</p>
        <form class="lookup-form" id="lookupForm" autocomplete="off" novalidate>
          <label class="sr-only" for="lookupInput">学号</label>
          <input id="lookupInput" name="id" inputmode="numeric" maxlength="16" placeholder="输入学号" value="${esc(inputValue)}" aria-describedby="lookupErr">
          <button class="btn primary" type="submit">查看</button>
        </form>
        <div class="lookup-err${invalid ? ' show' : ''}" id="lookupErr">${invalid ? `没有找到学号「${esc(r.id)}」，请检查后重试。` : ''}</div>
        ${!r.id && last ? `<div class="last-chip">上次查询：<a href="#/me/${encodeURIComponent(last)}">${esc(last)} 号 · 继续查看</a></div>` : ''}
        <p class="hint">页面只记录学号，不收集姓名、班级或学校信息。</p>
      </section>
      ${s ? meCard(s) : ''}
    </div>`;
  }

  function meCard(s) {
    const total = s.total;
    const hwPct = total > 0 ? Math.round((s.hwPts / total) * 100) : 0;
    const hwTotal = cmp.hwTotal;
    const recent = s.recent.length
      ? s.recent.map((h) => `<div class="rc ${h.ok ? 'ok' : 'no'}" title="${esc(h.date)} · ${esc(h.title)}">
          <span class="dot">${h.ok ? ICON.check : ICON.x}</span><span>${fmtMD(h.date)}</span>
        </div>`).join('')
      : '<div class="empty-line">还没有作业记录</div>';
    const streakBadge = s.streak > 0 ? `<span class="badge gold">${ICON.flame}${s.streak} 连</span>` : '';
    return `<section class="me-card">
      <div class="me-hero">
        <div>
          <div class="mh-label">学号</div>
          <div class="mh-id">${esc(s.id)}</div>
          <div class="mh-tags"><span class="badge plain">作业榜第 ${s.hwRank}</span>${streakBadge}</div>
        </div>
        <div class="mh-side">
          <div class="mh-label">总积分</div>
          <div class="mh-total"><b>${s.total}</b><i>分</i></div>
          <div class="mh-rank">总榜第 <b>${s.totalRank}</b> 名 / ${cmp.rows.length} 人</div>
        </div>
      </div>
      <div class="split-box">
        <div class="split-head"><span>作业 <b>${s.hwPts}</b> 分</span><span>课堂 <b>${s.classPts}</b> 分</span></div>
        <div class="split">${total > 0 ? `<i class="s-hw" style="width:${hwPct}%"></i><i class="s-cls" style="width:${100 - hwPct}%"></i>` : ''}</div>
        <div class="split-legend"><span><i class="hw"></i>作业积分</span><span><i class="cls"></i>课堂表现</span></div>
      </div>
      <div class="stat-grid">
        <div class="stat"><span>连续提交</span><b>${s.streak}</b><i>次</i></div>
        <div class="stat"><span>最佳连击</span><b>${s.best}</b><i>次</i></div>
        <div class="stat"><span>作业提交率</span><b>${hwTotal ? pct(s.rate) : '—'}</b><small>${s.hwCount} / ${hwTotal} 次</small></div>
        <div class="stat"><span>课堂发言</span><b>${s.classCount}</b><i>次</i><small>+${s.classPts} 分</small></div>
      </div>
      <div class="recent-box">
        <h3>最近作业 · 新 → 旧</h3>
        <div class="recent-list">${recent}</div>
      </div>
      <div class="motivate">${ICON.spark}${motivation(s)}</div>
    </section>`;
  }

  function motivation(s) {
    if (!state.homework.length) return '第一次作业导入后，这里会出现你的提交记录和连击。';
    if (s.totalRank === 1) return '总榜第一，保持住这个位置。';
    const above = cmp.totalSorted[s.totalRank - 2];
    let msg = '';
    if (above) {
      const gap = above.total - s.total;
      msg = gap > 0
        ? `距离第 ${s.totalRank - 1} 名（${esc(above.id)} 号）还差 <b>${gap}</b> 分。`
        : `与第 ${s.totalRank - 1} 名（${esc(above.id)} 号）同分，下一次作业就能反超。`;
    }
    if (s.hwRank > 5) {
      const fifth = cmp.hwSorted[4];
      const gap5 = fifth ? fifth.hwPts - s.hwPts : 0;
      if (gap5 > 0 && gap5 <= Math.max(1, state.settings.homeworkPoints)) {
        msg += ' 再完成 <b>1</b> 次作业就能进入作业榜前五。';
      }
    }
    return msg;
  }

  /* ============================================================
   * 课堂点名（随机抽取，一轮不重复）
   * ============================================================ */
  function loadRoll() {
    try {
      const o = JSON.parse(storageGet(LS.roll) || 'null');
      if (o && Array.isArray(o.drawn)) {
        return {
          round: Math.max(1, Number(o.round) || 1),
          drawn: o.drawn.filter((x) => typeof x === 'string'),
          current: typeof o.current === 'string' ? o.current : '',
          graded: !!o.graded,
        };
      }
    } catch { /* ignore */ }
    return { round: 1, drawn: [], current: '', graded: false };
  }
  function saveRoll() {
    if (roll) storageSet(LS.roll, JSON.stringify(roll));
  }
  function rollPool() {
    return state.students.filter((id) => !roll.drawn.includes(id));
  }

  function viewRoll() {
    return `<div class="roll">
      <div class="roll-head">
        <div class="eyebrow">ROLL CALL · 课堂点名</div>
        <h1>课堂点名</h1>
        <p class="hint">点「点名」随机滚动学号，点「确定」锁定；答对 +2 分自动计入总榜。</p>
      </div>
      <div class="roll-stage">
        <div class="roll-meta" id="rollMeta"></div>
        <div class="roll-id" id="rollId">—</div>
        <div class="roll-id-label">学号</div>
      </div>
      <div class="roll-actions">
        <button class="btn primary big" id="btnRollStart" data-act="roll-start" type="button">${ICON.shuffle} 点名</button>
        <button class="btn big" id="btnRollConfirm" data-act="roll-confirm" type="button" disabled>确定</button>
      </div>
      <div class="roll-grade" id="rollGrade">
        <button class="btn ok big" id="btnRollCorrect" data-act="roll-correct" type="button" disabled>${ICON.award} 回答正确 +2</button>
        <button class="btn ghost big" id="btnRollWrong" data-act="roll-wrong" type="button" disabled>回答错误 0</button>
      </div>
      <div class="roll-pool" id="rollPool"></div>
      <div class="roll-foot">
        <span class="hint">一轮内每人只出现一次，抽完自动进入下一轮。</span>
        <button class="btn small ghost" data-act="roll-reset" type="button">重置本轮</button>
      </div>
    </div>`;
  }

  function initRoll() {
    if (!roll) roll = loadRoll();
    roll.drawn = roll.drawn.filter((id) => state.students.includes(id));
    saveRoll();
    setRollUI();
  }

  function setRollUI() {
    const idEl = document.getElementById('rollId');
    if (idEl) {
      idEl.textContent = roll.current || '—';
      idEl.classList.toggle('rolling', rolling);
      idEl.classList.toggle('settled', !rolling && !!roll.current);
    }
    const start = document.getElementById('btnRollStart');
    if (start) { start.textContent = rolling ? '抽取中…' : '点名'; start.disabled = rolling; }
    const confirm = document.getElementById('btnRollConfirm');
    if (confirm) confirm.disabled = !rolling;
    const grade = document.getElementById('rollGrade');
    if (grade) grade.classList.toggle('on', !rolling && !!roll.current);
    const ok = document.getElementById('btnRollCorrect');
    const no = document.getElementById('btnRollWrong');
    if (ok) ok.disabled = rolling || !roll.current || roll.graded;
    if (no) no.disabled = rolling || !roll.current || roll.graded;
    const meta = document.getElementById('rollMeta');
    if (meta) {
      const left = state.students.length - roll.drawn.length;
      meta.textContent = `第 ${roll.round} 轮 · 本轮还剩 ${left} 人 · 已抽 ${roll.drawn.length} 人`;
    }
    const pool = document.getElementById('rollPool');
    if (pool) {
      pool.innerHTML = roll.drawn.length
        ? `<span class="roll-pool-label">本轮已抽</span> ${roll.drawn.map((id) => `<span class="roll-chip${id === roll.current && !rolling ? ' now' : ''}">${esc(id)}</span>`).join('')}`
        : '<span class="roll-pool-label">本轮还没开始</span>';
    }
  }

  function rollTick() {
    let candidates = rollPool();
    if (!candidates.length) {
      roll.round += 1;
      roll.drawn = [];
      candidates = rollPool();
      if (!candidates.length) return;
    }
    roll.current = candidates[Math.floor(Math.random() * candidates.length)];
    const el = document.getElementById('rollId');
    if (el) el.textContent = roll.current;
  }

  function rollStart() {
    if (rolling) return;
    if (!rollPool().length) { roll.round += 1; roll.drawn = []; }
    roll.graded = false;
    rolling = true;
    saveRoll();
    setRollUI();
    rollTick();
    if (rollTimer) clearInterval(rollTimer);
    rollTimer = setInterval(rollTick, 60);
  }

  function rollConfirm() {
    if (!rolling) return;
    if (rollTimer) { clearInterval(rollTimer); rollTimer = null; }
    rolling = false;
    const id = roll.current;
    if (id && !roll.drawn.includes(id)) roll.drawn.push(id);
    if (roll.drawn.length >= state.students.length) {
      roll.round += 1;
      roll.drawn = [];
      toast(`第 ${roll.round - 1} 轮完成，进入第 ${roll.round} 轮`, 'ok');
    }
    roll.graded = false;
    saveRoll();
    setRollUI();
  }

  function rollCorrect() {
    const id = roll.current;
    if (!id) { toast('先点名确定学号', 'bad'); return; }
    if (roll.graded) return;
    if (!canWrite()) { toast('请先在「教师」里连接 GitHub，才能计分', 'bad'); return; }
    const entry = { id: makeId('cl'), at: nowISO(), student: id, points: 2, note: '课堂点名·回答正确' };
    if (!commit({ t: 'class.add', entry }, { immediate: true })) return;
    roll.graded = true;
    saveRoll();
    setRollUI();
    toast(`${id} 号 +2 分`, 'ok');
  }

  function rollWrong() {
    if (!roll.current) { toast('先点名确定学号', 'bad'); return; }
    if (roll.graded) return;
    roll.graded = true;
    saveRoll();
    setRollUI();
    toast(`${roll.current} 号 未加分`, '');
  }

  function rollReset() {
    if (!confirm('重置本轮点名？已抽过的学号会重新进入随机池（已经加的分会保留）。')) return;
    if (rollTimer) { clearInterval(rollTimer); rollTimer = null; }
    rolling = false;
    roll.round = 1;
    roll.drawn = [];
    roll.current = '';
    roll.graded = false;
    saveRoll();
    setRollUI();
  }

  /* ============================================================
   * 荣誉墙（作业之星 / 笔记之星）
   * ============================================================ */
  function viewStars(r) {
    if (r.name === 'starsScan') return viewStarsScan(r);
    if (r.name === 'starsType') return viewStarsType(r);
    return viewStarsLanding();
  }

  function viewStarsLanding() {
    const hw = (state.stars.homework || [])[0];
    const nt = (state.stars.notes || [])[0];
    return `<div class="stars">
      <div class="sec-head">
        <div>
          <div class="eyebrow">HONOR WALL</div>
          <h1>荣誉墙</h1>
          <p>作业之星 · 笔记之星 · 每两周评选 3 人</p>
        </div>
        <a class="btn small ghost" href="#/board">${ICON.back} 返回榜单</a>
      </div>
      <div class="stars-cards">
        ${starLandingCard('homework', '作业之星', hw)}
        ${starLandingCard('notes', '笔记之星', nt)}
      </div>
      <p class="hint">点击学号可查看该学生的扫描件（由老师上传到仓库）。</p>
    </div>`;
  }

  function starLandingCard(type, label, entry) {
    return `<a class="stars-card" href="#/stars/${type}">
      <div class="sc-top">${ICON.star}<span>${label}</span><span class="sc-count">${(state.stars[type] || []).length} 期</span></div>
      ${entry
        ? `<div class="sc-date">${fmtStarDate(entry.date)}</div><div class="sc-ids">${entry.ids.map((id) => `<span class="sc-id">${esc(id)}</span>`).join('')}</div>`
        : '<div class="sc-none">还没有评选记录</div>'}
      <div class="sc-more">查看全部 ${ICON.arrow}</div>
    </a>`;
  }

  function viewStarsType(r) {
    const type = r.type;
    const list = state.stars[type] || [];
    return `<div class="stars">
      <div class="sec-head">
        <div>
          <div class="eyebrow">HONOR WALL</div>
          <h1>${STAR_LABEL[type]}</h1>
          <p>每两周评选 3 人 · 点击学号查看扫描件</p>
        </div>
        <a class="btn small ghost" href="#/stars">${ICON.back} 返回</a>
      </div>
      ${list.length
        ? `<div class="star-list">${list.map((e) => starEntry(type, e)).join('')}</div>`
        : `<div class="empty"><div class="eicon">${ICON.star}</div><h2>还没有评选记录</h2></div>`}
    </div>`;
  }

  function starEntry(type, e) {
    return `<div class="star-entry">
      <div class="se-date">${fmtStarDate(e.date)}</div>
      <div class="se-ids">${e.ids.map((id) => `<a class="se-id" href="#/stars/${type}/${e.date}/${encodeURIComponent(id)}">${esc(id)}</a>`).join('')}</div>
    </div>`;
  }

  function viewStarsScan(r) {
    const type = r.type;
    const date = r.date;
    const id = r.id;
    const entry = (state.stars[type] || []).find((e) => e.date === date);
    const idx = entry ? entry.ids.indexOf(id) : -1;
    const prev = idx > 0 ? entry.ids[idx - 1] : null;
    const next = idx >= 0 && idx < entry.ids.length - 1 ? entry.ids[idx + 1] : null;
    return `<div class="scan">
      <div class="scan-head">
        <a class="btn small ghost" href="#/stars/${type}">${ICON.back} 返回</a>
        <span class="scan-title">${STAR_LABEL[type]} · ${fmtStarDate(date)}</span>
        <span class="scan-id">学号 ${esc(id)}</span>
      </div>
      <div class="scan-box" id="scanBox">
        <img id="scanImg" alt="${STAR_LABEL[type]} ${fmtStarDate(date)} 学号 ${esc(id)} 的扫描件">
      </div>
      <div class="scan-nav">
        ${prev ? `<a class="btn" href="#/stars/${type}/${date}/${encodeURIComponent(prev)}">${ICON.back} 上一张 ${esc(prev)}</a>` : '<span></span>'}
        ${next ? `<a class="btn" href="#/stars/${type}/${date}/${encodeURIComponent(next)}">下一张 ${esc(next)} ${ICON.arrow}</a>` : '<span></span>'}
      </div>
    </div>`;
  }

  function initScan(r) {
    const img = document.getElementById('scanImg');
    const box = document.getElementById('scanBox');
    if (!img || !box) return;
    const base = `stars/${r.type}/${r.date}/${r.id}`;
    const exts = ['jpg', 'jpeg', 'png', 'webp'];
    let i = 0;
    const tryNext = () => {
      if (i >= exts.length) {
        box.classList.add('missing');
        box.innerHTML = `<div class="scan-missing">${ICON.image}<p>没有找到 <b>${esc(r.id)}</b> 号的扫描件。</p><p class="hint">请把图片按 <code>stars/${r.type}/${r.date}/${r.id}.jpg</code> 上传到仓库。</p></div>`;
        return;
      }
      img.src = `${base}.${exts[i++]}`;
    };
    img.addEventListener('error', tryNext);
    img.addEventListener('load', () => box.classList.add('loaded'));
    tryNext();
  }

  /* ============================================================
   * 教师控制台
   * ============================================================ */
  function viewAdmin() {
    const head = `<header class="admin-head">
      <div>
        <div class="eyebrow">TEACHER CONSOLE</div>
        <h1>教师控制台</h1>
      </div>
      ${canWrite() && !connEditing ? `<nav class="admin-quick">
        <button type="button" data-scroll="admin-score">加分</button><button type="button" data-scroll="admin-import">导入</button><button type="button" data-scroll="admin-stars">荣誉墙</button><button type="button" data-scroll="admin-log">记录</button><button type="button" data-scroll="admin-settings">设置</button><button type="button" data-scroll="admin-data">备份</button>
      </nav>` : ''}
    </header>
    <div class="stat-strip" id="adminStats">${adminStats()}</div>`;

    if (!canWrite() || connEditing) {
      return `<div class="admin">${head}
        <div class="admin-grid">
          <section class="panel wide" id="admin-connect">${connectPanel()}</section>
          <section class="panel wide">${onboarding()}</section>
        </div>
      </div>`;
    }

    return `<div class="admin">${head}
      <div class="admin-grid">
        ${connectedPanel()}
        ${scorePanel()}
        ${importPanel()}
        ${starsPanel()}
        ${hwHistoryPanel()}
        ${classHistoryPanel()}
        ${settingsPanel()}
        ${dataPanel()}
      </div>
    </div>`;
  }

  function adminStats() {
    const n = state.classLog.length;
    const pend = pending.length ? ` <span class="warnb">· 待同步 ${pending.length} 条</span>` : '';
    return `共 <b>${state.students.length}</b> 人 · <b>${state.homework.length}</b> 次作业 · 课堂记录 <b>${n}</b> 条${pend}`;
  }

  function detectRepo() {
    const host = location.hostname;
    if (!/\.github\.io$/i.test(host)) return null;
    const owner = host.split('.')[0];
    const seg = location.pathname.split('/').filter(Boolean)[0];
    return { owner, repo: seg || `${owner}.github.io`, branch: 'main' };
  }

  function connectPanel() {
    const det = detectRepo();
    const repoVal = cfg ? `${cfg.owner}/${cfg.repo}` : (det ? `${det.owner}/${det.repo}` : '');
    const branchVal = cfg ? cfg.branch : (det ? det.branch : 'main');
    const pathVal = cfg ? cfg.path : 'data.json';
    const hasToken = !!(cfg && cfg.token);
    const remember = cfg ? cfg.remember !== false : true;
    return `<div class="panel-head">
        <h2>${ICON.link} 连接 GitHub</h2>
        <span class="sub">${hasToken ? '已保存连接信息' : '只在本机保存'}</span>
      </div>
      <p class="panel-sub">网页是静态的。导入作业、课堂加分要写回仓库里的 data.json，所以需要一次 GitHub 连接。Token 只保存在这台设备，不会写进网页或 data.json。</p>
      <form class="connect-form" id="connectForm" autocomplete="off" novalidate>
        <div class="row2">
          <label class="field"><span>仓库（owner/repo）</span>
            <input class="input" name="repo" value="${esc(repoVal)}" placeholder="例如 zhangsan/class-points" spellcheck="false" required>
          </label>
          <label class="field"><span>分支</span>
            <input class="input" name="branch" value="${esc(branchVal)}" placeholder="main" spellcheck="false" required>
          </label>
        </div>
        <div class="row2">
          <label class="field"><span>数据文件路径</span>
            <input class="input" name="path" value="${esc(pathVal)}" placeholder="data.json" spellcheck="false" required>
          </label>
          <label class="field"><span>Token</span>
            <input class="input" name="token" type="password" placeholder="${hasToken ? '已保存，留空则保持不变' : 'github_pat_…'}" spellcheck="false" autocomplete="off">
          </label>
        </div>
        <label class="check"><input type="checkbox" name="remember" ${remember ? 'checked' : ''}> 在这台设备上记住 Token</label>
        <div class="form-msg" id="connectMsg"></div>
        <div class="form-actions">
          <button class="btn primary" type="submit">连接并测试</button>
          ${cfg ? '<button class="btn ghost" type="button" data-act="conn-cancel">取消</button>' : ''}
          <span class="grow"></span>
          <a class="hint" href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer">生成 Token →</a>
        </div>
      </form>`;
  }

  function onboarding() {
    return `<div class="panel-head"><h2>${ICON.info} 第一次使用</h2><span class="sub">约 3 分钟</span></div>
      <ol class="hint" style="margin:0;padding-left:20px;display:grid;gap:7px">
        <li>在 GitHub 新建一个 <b>Public</b> 仓库（免费账号的 Pages 需要公开仓库，家长也要能直接打开链接）。</li>
        <li>把 <code>index.html</code>、<code>app.js</code>、<code>data.json</code> 上传到仓库根目录。</li>
        <li>仓库 Settings → Pages → Source 选 <code>main</code> / <code>/ (root)</code>，保存。</li>
        <li>打开 <code>https://你的用户名.github.io/仓库名/</code>，回到这里填连接信息。</li>
      </ol>
      <div class="sep"></div>
      <p class="hint"><b>Token 权限</b>：用 Fine-grained token，只选这一个仓库，Repository permissions → Contents 设为 <b>Read and write</b>。不要用带 <code>repo</code> 全权限的经典 Token。</p>
      <details class="hint" style="margin-top:10px">
        <summary>页面如何更新？</summary>
        <p style="margin:8px 0 0">加分和导入会通过 GitHub API 提交一次 commit，data.json 随即更新。GitHub Pages 通常需要 30–60 秒重新部署；投屏页每 20 秒自动刷新一次。教师自己这台设备直接读 API，所以是即时的。</p>
      </details>`;
  }

  function connectedPanel() {
    const dot = apiIssue ? 'bad' : 'ok';
    return `<section class="panel wide" id="admin-connect">
      <div class="conn">
        <span class="dot ${dot}"></span>
        <div class="cinfo">
          <b>${esc(cfg.owner)}/${esc(cfg.repo)}</b>
          <span id="connMeta">${connMeta()}</span>
        </div>
        <div class="conn-actions">
          <button class="btn small" type="button" data-act="sync">立即同步</button>
          <button class="btn small ghost" type="button" data-act="conn-edit">修改连接</button>
          <button class="btn small danger" type="button" data-act="disconnect">断开</button>
        </div>
      </div>
    </section>`;
  }

  function connMeta() {
    const parts = [cfg.branch, cfg.path, `更新于 ${fmtStamp(state.meta.updatedAt)}`];
    if (pending.length) parts.push(`<span style="color:var(--warn)">待同步 ${pending.length} 条</span>`);
    if (apiIssue) parts.push(`<span style="color:var(--bad)">${esc(errText(apiIssue))}</span>`);
    return parts.join(' · ');
  }

  function scorePanel() {
    const todayPts = cmp.rows.reduce((a, s) => a + s.todayPts, 0);
    const todayCount = cmp.rows.reduce((a, s) => a + s.todayCount, 0);
    const amt = scoreAmt || 1;
    return `<section class="panel" id="admin-score">
      <div class="panel-head"><h2>${ICON.zap} 课堂加分</h2><span class="sub">点学号立即加分</span></div>
      <div class="score-tools">
        <div class="field"><span>每次加分</span>
          <div class="seg" id="amtSeg">
            ${[1, 2, 3].map((n) => `<button type="button" data-amt="${n}" class="${n === amt ? 'on' : ''}">+${n}</button>`).join('')}
          </div>
        </div>
        <label class="field grow"><span>备注（可选）</span>
          <input class="input" id="classNote" placeholder="如：回答问题 / 上台演示" maxlength="30" autocomplete="off">
        </label>
      </div>
      <div class="note-line">
        <span class="hint">点一下立即记下，写回 GitHub 会合并成一次提交。</span>
        <button class="btn small ghost" type="button" data-act="undo-class">${ICON.undo} 撤销上一条</button>
      </div>
      <div class="id-grid" id="idGrid"></div>
      <div class="stat-strip" id="classToday">今日已加 <b>${todayPts}</b> 分 · ${todayCount} 次</div>
    </section>`;
  }

  function importPanel() {
    return `<section class="panel" id="admin-import">
      <div class="panel-head"><h2>${ICON.clipboard} 导入作业</h2><span class="sub">批改完后导入一次</span></div>
      <form class="connect-form" id="hwForm" autocomplete="off" novalidate>
        <div class="row2">
          <label class="field"><span>日期</span><input class="input" type="date" name="date" id="hwDate" required></label>
          <label class="field"><span>每次得分</span><input class="input" type="number" name="points" id="hwPoints" min="0" max="100" step="1" required></label>
        </div>
        <label class="field"><span>作业名称 <span class="sub">（留空自动命名）</span></span>
          <input class="input" name="title" id="hwTitle" placeholder="" maxlength="40" autocomplete="off">
        </label>
        <label class="field"><span>登记方式</span>
          <select class="input" name="mode" id="hwMode">
            <option value="missing">默认全员已交，只登记未交</option>
            <option value="done">只登记已交</option>
          </select>
        </label>
        <label class="field"><span>学号 <span class="sub">（空格、逗号或换行分隔）</span></span>
          <textarea class="input" name="ids" id="hwIds" rows="3" placeholder="例如：05 12 33" spellcheck="false"></textarea>
        </label>
        <div class="preview" id="hwPreview"></div>
        <div class="form-actions">
          <button class="btn small ghost" type="button" data-act="hw-clear">清空</button>
          <span class="grow"></span>
          <button class="btn primary" type="submit" id="hwSubmit">确认导入</button>
        </div>
      </form>
    </section>`;
  }

  function starsPanel() {
    return `<section class="panel wide" id="admin-stars">
      <div class="panel-head"><h2>${ICON.star} 荣誉墙评选</h2><span class="sub">每两周 3 人</span></div>
      <form class="connect-form" id="starsForm" autocomplete="off" novalidate>
        <div class="row2">
          <label class="field"><span>类型</span>
            <select class="input" name="type" id="starsType">
              <option value="homework">作业之星</option>
              <option value="notes">笔记之星</option>
            </select>
          </label>
          <label class="field"><span>评选日期</span><input class="input" type="date" name="date" id="starsDate" required></label>
        </div>
        <label class="field"><span>3 个学号 <span class="sub">（空格、逗号或换行分隔）</span></span>
          <input class="input" name="ids" id="starsIds" placeholder="例如：01 43 14" spellcheck="false">
        </label>
        <div class="preview" id="starsPreview"></div>
        <div class="form-actions"><span class="grow"></span><button class="btn primary" type="submit">保存评选</button></div>
      </form>
      <div class="sep"></div>
      <div class="stars-admin-list">
        <div class="stars-admin-col"><h3>作业之星</h3><div id="starsHwList">${starAdminList('homework')}</div></div>
        <div class="stars-admin-col"><h3>笔记之星</h3><div id="starsNotesList">${starAdminList('notes')}</div></div>
      </div>
      <p class="hint" style="margin-top:10px">扫描件请按 <code>stars/{type}/日期/学号.jpg</code> 上传到仓库，例如 <code>stars/homework/20261108/01.jpg</code>（也支持 .png / .webp）。</p>
    </section>`;
  }

  function starAdminList(type) {
    const list = state.stars[type] || [];
    if (!list.length) return '<div class="empty-line">还没有评选</div>';
    return list.map((e) => `<div class="log-item">
      <span class="lid">${fmtStarDate(e.date)}</span>
      <div class="lmain"><div class="lt">${e.ids.map((id) => esc(id)).join(' · ')}</div><div class="ls">${STAR_LABEL[type]}</div></div>
      <button class="x" type="button" data-act="stars-del" data-type="${type}" data-date="${esc(e.date)}" title="删除这一期" aria-label="删除 ${fmtStarDate(e.date)}">${ICON.trash}</button>
    </div>`).join('');
  }

  function hwHistoryPanel() {
    return `<section class="panel" id="admin-log">
      <div class="panel-head"><h2>作业记录</h2><span class="sub" id="hwCount">${state.homework.length} 次</span></div>
      <div class="log-list" id="hwLogList"></div>
    </section>`;
  }

  function classHistoryPanel() {
    return `<section class="panel">
      <div class="panel-head"><h2>课堂加减分记录</h2><span class="sub" id="classCount">${state.classLog.length} 条</span></div>
      <div class="log-list" id="classLogList"></div>
    </section>`;
  }

  function settingsPanel() {
    return `<section class="panel wide" id="admin-settings">
      <div class="panel-head"><h2>班级与积分设置</h2><span class="sub">修改后立即生效</span></div>
      <form class="connect-form" id="settingsForm" autocomplete="off">
        <div class="row2">
          <label class="field"><span>班级名称</span><input class="input" name="className" value="${esc(state.meta.className)}" maxlength="24"></label>
          <label class="field"><span>学期说明（显示在榜单顶部）</span><input class="input" name="term" value="${esc(state.meta.term)}" maxlength="30" placeholder="如：2026 秋季学期"></label>
        </div>
        <div class="row2">
          <label class="field"><span>每次作业默认分</span><input class="input" type="number" name="homeworkPoints" min="0" max="100" value="${state.settings.homeworkPoints}"></label>
          <label class="field"><span>课堂加分默认值</span><input class="input" type="number" name="classPoints" min="0" max="100" value="${state.settings.classPoints}"></label>
        </div>
        <div class="form-actions"><span class="grow"></span><button class="btn primary" type="submit">保存设置</button></div>
      </form>
      <div class="sep"></div>
      <form class="connect-form" id="rosterForm" autocomplete="off">
        <label class="field"><span>学生名单（学号）</span>
          <textarea class="input" name="students" rows="6" spellcheck="false">${esc(state.students.join('\n'))}</textarea>
        </label>
        <p class="hint">共 <b id="rosterCount">${state.students.length}</b> 人。可以用空格、逗号或换行分隔。修改学号会被当作新学生，历史记录不会自动迁移。</p>
        <div class="form-actions"><span class="grow"></span><button class="btn" type="submit">保存名单</button></div>
      </form>
    </section>`;
  }

  function dataPanel() {
    return `<section class="panel wide" id="admin-data">
      <div class="panel-head"><h2>备份与重置</h2><span class="sub">数据都在 data.json 里</span></div>
      <div class="form-actions" style="margin-top:0">
        <button class="btn" type="button" data-act="export">${ICON.download} 导出 JSON 备份</button>
        <label class="btn" style="cursor:pointer">${ICON.upload} 从 JSON 恢复
          <input type="file" id="importFile" accept=".json,application/json" hidden>
        </label>
        <span class="grow"></span>
        <button class="btn danger" type="button" data-act="reset">清空本学期记录</button>
      </div>
      <p class="hint" style="margin-top:12px">恢复会覆盖当前所有数据；清空会删除全部作业和课堂记录，但保留学生名单。两者都会直接写入 GitHub，操作前会再确认一次。</p>
    </section>`;
  }

  function initAdmin() {
    if (!canWrite() || connEditing) return;
    const date = $('#hwDate');
    if (date && !date.value) date.value = todayISO();
    const points = $('#hwPoints');
    if (points && !points.value) points.value = state.settings.homeworkPoints;
    const title = $('#hwTitle');
    if (title) title.placeholder = `第 ${state.homework.length + 1} 次作业`;
    const sd = $('#starsDate');
    if (sd && !sd.value) sd.value = todayISO();
    renderIdGrid(true);
    refreshAdmin();
    updateHwPreview();
    updateStarsPreview();
  }

  function refreshAdmin() {
    if (!isAdmin() || !canWrite() || connEditing) return;
    const stats = $('#adminStats');
    if (stats) stats.innerHTML = adminStats();
    const meta = $('#connMeta');
    if (meta) meta.innerHTML = connMeta();
    const hwCount = $('#hwCount');
    if (hwCount) hwCount.textContent = `${state.homework.length} 次`;
    const classCount = $('#classCount');
    if (classCount) classCount.textContent = `${state.classLog.length} 条`;
    const title = $('#hwTitle');
    if (title && !title.value) title.placeholder = `第 ${state.homework.length + 1} 次作业`;
    renderHwLog();
    renderClassLog();
    renderClassToday();
    renderStarsAdmin();
    const dot = $('#admin-connect .dot');
    if (dot) dot.className = `dot ${apiIssue ? 'bad' : 'ok'}`;
  }

  function renderIdGrid(force) {
    const grid = $('#idGrid');
    if (!grid) return;
    const sig = state.students.join('\n');
    if (!force && grid.dataset.sig === sig) return;
    grid.dataset.sig = sig;
    grid.innerHTML = state.students.map((id) => {
      const s = cmp.byId.get(id);
      return `<button type="button" class="id-btn" data-act="class-add" data-id="${esc(id)}" aria-label="给 ${esc(id)} 号加 ${scoreAmt || 1} 分"><b>${esc(id)}</b><span>${s ? s.classPts : 0} 分</span></button>`;
    }).join('');
  }

  function updateIdButton(id) {
    const btns = $$('#idGrid .id-btn');
    const btn = btns.find((b) => b.dataset.id === id);
    if (!btn) return;
    const s = cmp.byId.get(id);
    const span = btn.querySelector('span');
    if (span) span.textContent = `${s ? s.classPts : 0} 分`;
    btn.classList.remove('pop');
    void btn.offsetWidth;
    btn.classList.add('pop');
    setTimeout(() => btn.classList.remove('pop'), 500);
  }

  function renderHwLog() {
    const list = $('#hwLogList');
    if (!list) return;
    const hw = state.homework.slice().sort(hwCompare).reverse();
    if (!hw.length) {
      list.innerHTML = '<div class="empty-line">还没有导入过作业</div>';
      return;
    }
    list.innerHTML = hw.map((h) => {
      const done = h.completed.filter((id) => cmp.byId.has(id)).length;
      return `<div class="log-item">
        <span class="lid">${fmtMD(h.date)}</span>
        <div class="lmain"><div class="lt">${esc(h.title)}</div><div class="ls">${done} / ${state.students.length} 人 · 每人 +${h.points} 分</div></div>
        <button class="x" type="button" data-act="hw-del" data-id="${esc(h.id)}" title="删除这次作业" aria-label="删除 ${esc(h.title)}">${ICON.trash}</button>
      </div>`;
    }).join('');
  }

  function renderClassLog() {
    const list = $('#classLogList');
    if (!list) return;
    const log = state.classLog.slice().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 60);
    if (!log.length) {
      list.innerHTML = '<div class="empty-line">还没有课堂加分记录</div>';
      return;
    }
    list.innerHTML = log.map((e) => `<div class="log-item">
      <span class="lid">${esc(e.student)}</span>
      <div class="lmain"><div class="lt">${esc(e.note || '课堂表现')}</div><div class="ls">${fmtMD(toLocalDate(e.at))} ${fmtTime(e.at)}</div></div>
      <span class="lp${e.points < 0 ? ' neg' : ''}">${e.points > 0 ? '+' : ''}${e.points}</span>
      <button class="x" type="button" data-act="class-del" data-id="${esc(e.id)}" title="撤销这条" aria-label="撤销这条记录">${ICON.undo}</button>
    </div>`).join('');
  }

  function renderClassToday() {
    const box = $('#classToday');
    if (!box) return;
    const pts = cmp.rows.reduce((a, s) => a + s.todayPts, 0);
    const cnt = cmp.rows.reduce((a, s) => a + s.todayCount, 0);
    box.innerHTML = `今日已加 <b>${pts}</b> 分 · ${cnt} 次`;
  }

  function updateHwPreview() {
    const box = $('#hwPreview');
    if (!box) return;
    const idsText = $('#hwIds') ? $('#hwIds').value : '';
    const mode = $('#hwMode') ? $('#hwMode').value : 'missing';
    const parsed = parseIds(idsText, state.students);
    if (parsed.unknown.length) {
      box.innerHTML = `<span class="miss">不在名单里：${parsed.unknown.map(esc).join('、')}</span>，请检查学号。`;
      return;
    }
    const done = mode === 'missing'
      ? state.students.length - parsed.ids.length
      : parsed.ids.length;
    const missing = state.students.length - done;
    let html = `本次已交 <b>${done}</b> / ${state.students.length} 人 · 未交 <b class="${missing ? 'miss' : 'ok'}">${missing}</b> 人`;
    if (mode === 'missing' && parsed.ids.length) {
      html += `<div class="chips">未交：${parsed.ids.map((id) => `<span class="chip">${esc(id)}</span>`).join('')}</div>`;
    }
    box.innerHTML = html;
  }

  /* ============================================================
   * 教师操作
   * ============================================================ */
  function noteValue() {
    const el = $('#classNote');
    const v = el ? el.value.trim() : '';
    return v || '课堂表现';
  }

  function addClassPoint(id) {
    if (!state.students.includes(id)) return;
    const amt = scoreAmt || 1;
    const entry = {
      id: makeId('cl'),
      at: nowISO(),
      student: id,
      points: amt,
      note: noteValue(),
    };
    if (!commit({ t: 'class.add', entry })) return;
    updateIdButton(id);
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch { /* ignore */ } }
  }

  function deleteClassEntry(id) {
    const entry = state.classLog.find((e) => e.id === id);
    if (!entry) return;
    if (!commit({ t: 'class.del', id }, { immediate: true })) return;
    updateIdButton(entry.student);
    toast(`已撤销 ${entry.student} 号 +${entry.points}`, '', {
      label: '恢复',
      fn: () => {
        if (commit({ t: 'class.add', entry }, { immediate: true })) updateIdButton(entry.student);
      },
    });
  }

  function undoLastClass() {
    if (!state.classLog.length) { toast('没有可撤销的记录', 'bad'); return; }
    const last = state.classLog.slice().sort((a, b) => String(b.at).localeCompare(String(a.at)))[0];
    const entry = last;
    if (!commit({ t: 'class.del', id: entry.id }, { immediate: true })) return;
    updateIdButton(entry.student);
    toast(`已撤销 ${entry.student} 号 +${entry.points}`, '', {
      label: '恢复',
      fn: () => {
        if (commit({ t: 'class.add', entry }, { immediate: true })) updateIdButton(entry.student);
      },
    });
  }

  function deleteHomework(id) {
    const hw = state.homework.find((h) => h.id === id);
    if (!hw) return;
    if (!confirm(`删除「${hw.date} ${hw.title}」？\n所有学生的作业积分和连击会重新计算，此操作会立即写入 GitHub。`)) return;
    if (!commit({ t: 'hw.del', id }, { immediate: true })) return;
    renderIdGrid(true);
    toast('已删除这次作业', 'ok');
  }

  function importHomework(form) {
    const date = form.date.value;
    const points = clamp(Math.round(num(form.points.value, state.settings.homeworkPoints)), 0, 1000);
    const mode = form.mode.value;
    const titleInput = fieldValue(form, 'title').trim();
    const autoTitle = `第 ${state.homework.length + 1} 次作业`;
    const title = titleInput || autoTitle;
    if (!date) { toast('请选择作业日期', 'bad'); return; }
    const parsed = parseIds(form.ids.value, state.students);
    if (parsed.unknown.length) {
      toast(`学号不在名单：${parsed.unknown.join('、')}`, 'bad');
      return;
    }
    let completed;
    if (mode === 'missing') {
      completed = state.students.filter((id) => !parsed.ids.includes(id));
    } else {
      completed = parsed.ids.slice();
      if (!completed.length && !confirm('这次作业 0 人完成？') ) return;
    }
    if (mode === 'missing' && parsed.ids.length === state.students.length) {
      if (!confirm('全体都没交？确认要这样记录吗？')) return;
    }
    const sameDate = state.homework.filter((h) => h.date === date);
    const exact = sameDate.find((h) => h.title === title);
    if (exact) {
      if (!confirm(`「${title}」（${date}）已经存在，覆盖这一次的完成情况？`)) return;
    } else if (sameDate.length) {
      if (!confirm(`${date} 已经有 ${sameDate.length} 次作业，仍要再新增一次「${title}」吗？`)) return;
    }
    const hw = {
      id: exact ? exact.id : makeId('hw'),
      date,
      title,
      points,
      completed,
      createdAt: exact ? exact.createdAt : nowISO(),
    };
    if (!commit({ t: 'hw.upsert', hw }, { immediate: true })) return;
    form.ids.value = '';
    const titleEl = form.elements.namedItem('title');
    if (titleEl) {
      titleEl.value = '';
      titleEl.placeholder = `第 ${state.homework.length + 1} 次作业`;
    }
    updateHwPreview();
    toast(`已导入「${title}」：${completed.length} 人完成，每人 +${points} 分`, 'ok');
  }

  async function connect(form) {
    const msg = $('#connectMsg');
    const show = (text, kind) => {
      if (!msg) return;
      msg.textContent = text;
      msg.className = `form-msg show ${kind || ''}`;
    };
    const repoRaw = form.repo.value.trim();
    const m = repoRaw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
    if (!m) { show('仓库格式应为 owner/repo，例如 zhangsan/class-points', 'err'); return; }
    const branch = form.branch.value.trim() || 'main';
    const path = form.path.value.trim() || 'data.json';
    const typedToken = form.token.value.trim();
    const token = typedToken || (cfg && cfg.token) || '';
    if (!token) { show('请填写 GitHub Token', 'err'); return; }
    const next = { owner: m[1], repo: m[2], branch, path, token, remember: !!form.remember.checked };
    const oldKey = cfg ? cfgKey(cfg) : '';
    const nextKey = cfgKey(next);
    if (pending.length && oldKey && oldKey !== nextKey) {
      if (!confirm(`还有 ${pending.length} 条记录没有同步到旧仓库，切换后会丢弃。继续？`)) return;
      pending = [];
      saveOutbox();
    }
    show('正在测试连接…', 'ok');
    try {
      const res = await apiGet(next);
      cfg = next;
      saveCfg(next);
      remote = res.data;
      remoteSha = res.sha;
      apiIssue = null;
      pending = loadOutbox();
      state = applyOps(remote, pending);
      cmp = compute(state);
      cacheSet(state);
      connEditing = false;
      render();
      toast('已连接 GitHub', 'ok');
      if (pending.length) flush();
    } catch (e) {
      show(errText(e), 'err');
    }
  }

  async function disconnect() {
    if (pending.length && !confirm(`还有 ${pending.length} 条记录没有同步，断开后会丢失。确定断开？`)) return;
    cfg = null;
    pending = [];
    remoteSha = null;
    saveOutbox();
    clearCfg();
    connEditing = false;
    try {
      remote = await fetchPublic();
      state = remote;
      cmp = compute(state);
      cacheSet(state);
      render();
      toast('已断开连接', 'ok');
    } catch (e) {
      toast(errText(e), 'bad');
    }
  }

  function saveSettings(form) {
    const meta = {
      className: fieldValue(form, 'className').trim() || '班级积分榜',
      term: fieldValue(form, 'term').trim(),
    };
    const settings = {
      homeworkPoints: clamp(Math.round(num(form.homeworkPoints.value, state.settings.homeworkPoints)), 0, 1000),
      classPoints: clamp(Math.round(num(form.classPoints.value, state.settings.classPoints)), 0, 1000),
    };
    if (!commit({ t: 'config.set', meta, settings }, { immediate: true })) return;
    toast('设置已保存', 'ok');
  }

  function saveRoster(form) {
    const ids = parseRoster(form.students.value);
    if (!ids.length) { toast('学生名单不能为空', 'bad'); return; }
    if (!confirm(`将学生名单改为 ${ids.length} 人？\n移除的学号不会删除历史记录，但不再出现在榜单上。`)) return;
    if (!commit({ t: 'roster.set', students: ids }, { immediate: true })) return;
    scoreAmt = clamp(Math.round(state.settings.classPoints) || 1, 1, 3);
    renderIdGrid(true);
    const count = $('#rosterCount');
    if (count) count.textContent = String(state.students.length);
    toast(`名单已更新为 ${ids.length} 人`, 'ok');
  }

  function resetAll() {
    if (!confirm('清空所有作业和课堂记录？\n学生名单会保留。此操作会立即写入 GitHub，无法撤销。')) return;
    if (!commit({ t: 'clear' }, { immediate: true })) return;
    formResetSafe();
    renderIdGrid(true);
    toast('已清空本学期记录', 'ok');
  }

  function formResetSafe() {
    const ids = $('#hwIds'); if (ids) ids.value = '';
    updateHwPreview();
  }

  function saveStars(form) {
    const type = form.type.value === 'notes' ? 'notes' : 'homework';
    const date = normalizeStarDate(fieldValue(form, 'date'));
    if (!date) { toast('请选择评选日期', 'bad'); return; }
    const parsed = parseIds(fieldValue(form, 'ids'), state.students);
    if (parsed.unknown.length) { toast(`学号不在名单：${parsed.unknown.join('、')}`, 'bad'); return; }
    if (parsed.ids.length !== 3) { toast('请填写 3 个学号', 'bad'); return; }
    const entry = { date, ids: parsed.ids, createdAt: nowISO() };
    if (!commit({ t: 'stars.add', type, entry }, { immediate: true })) return;
    form.ids.value = '';
    renderStarsAdmin();
    updateStarsPreview();
    toast(`已保存${STAR_LABEL[type]} ${fmtStarDate(date)}`, 'ok');
  }

  function deleteStar(type, date) {
    if (!confirm(`删除${STAR_LABEL[type]} ${fmtStarDate(date)} 这一期？`)) return;
    if (!commit({ t: 'stars.del', type, date }, { immediate: true })) return;
    renderStarsAdmin();
    toast('已删除', 'ok');
  }

  function renderStarsAdmin() {
    const hw = $('#starsHwList');
    const nt = $('#starsNotesList');
    if (hw) hw.innerHTML = starAdminList('homework');
    if (nt) nt.innerHTML = starAdminList('notes');
  }

  function updateStarsPreview() {
    const box = $('#starsPreview');
    if (!box) return;
    const parsed = parseIds($('#starsIds') ? $('#starsIds').value : '', state.students);
    if (parsed.unknown.length) {
      box.innerHTML = `<span class="miss">不在名单里：${parsed.unknown.map(esc).join('、')}</span>`;
      return;
    }
    box.innerHTML = parsed.ids.length
      ? `入选 <b>${parsed.ids.length}</b> 人：${parsed.ids.map((id) => `<span class="chip">${esc(id)}</span>`).join('')}${parsed.ids.length !== 3 ? ' <span class="miss">（需要 3 人）</span>' : ''}`
      : '请输入 3 个学号';
  }

  async function importJsonFile(file) {
    if (!file) return;
    let data;
    try {
      data = normalizeData(JSON.parse(await file.text()));
    } catch (e) {
      toast(`文件无法读取：${e.message}`, 'bad');
      return;
    }
    if (!confirm(`从备份恢复？\n将覆盖当前 ${state.students.length} 人、${state.homework.length} 次作业的全部数据。`)) return;
    if (!commit({ t: 'replace', data }, { immediate: true })) return;
    render();
    toast('已从备份恢复', 'ok');
  }

  function exportJson() {
    const blob = new Blob([`${JSON.stringify(state, null, 2)}\n`], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `class-points-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ============================================================
   * 提示条
   * ============================================================ */
  function toast(text, kind = '', action = null) {
    const box = $('#toasts');
    if (!box) return;
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    const span = document.createElement('span');
    span.textContent = text;
    el.appendChild(span);
    if (action && action.label) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        el.remove();
        action.fn();
      });
      el.appendChild(btn);
    }
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 220);
    }, action ? 5500 : 3400);
  }

  function showLookupError(text) {
    const box = $('#lookupErr');
    if (!box) return;
    box.textContent = text;
    box.classList.add('show');
    const input = $('#lookupInput');
    if (input) input.focus();
  }

  /* ============================================================
   * 轮询 / 刷新
   * ============================================================ */
  async function poll() {
    if (!booted || document.hidden || flushing || pending.length) return;
    if (isAdmin() || isEditingField()) return;
    try {
      const res = await readSource();
      const changed = !remote || res.data.meta.updatedAt !== remote.meta.updatedAt;
      remote = res.data;
      if (res.sha) remoteSha = res.sha;
      if (changed) {
        state = applyOps(remote, pending);
        cmp = compute(state);
        cacheSet(state);
        render();
      }
      setSync(apiIssue ? 'error' : 'ok');
    } catch {
      setSync(navigator.onLine ? 'error' : 'offline');
    }
  }

  async function manualRefresh() {
    if (isEditingField()) return;
    setSync('syncing');
    try {
      const res = await readSource();
      remote = res.data;
      if (res.sha) remoteSha = res.sha;
      state = applyOps(remote, pending);
      cmp = compute(state);
      cacheSet(state);
      if (isAdmin()) {
        renderIdGrid(true);
        refreshAdmin();
      } else {
        render();
      }
      setSync(apiIssue ? 'error' : 'ok');
      toast('已刷新', 'ok');
    } catch (e) {
      setSync('error');
      toast(errText(e), 'bad');
    }
  }

  /* ============================================================
   * 事件
   * ============================================================ */
  function onSubmit(e) {
    const form = e.target;
    if (!form || !form.id) return;
    if (form.id === 'lookupForm') {
      e.preventDefault();
      const raw = form.id ? form.querySelector('input').value : '';
      if (!raw.trim()) { showLookupError('请输入学号。'); return; }
      const id = resolveId(raw, state.students);
      if (!id) { showLookupError(`没有找到学号「${raw.trim()}」，请检查后重试。`); return; }
      saveLastId(id);
      const target = `#/me/${encodeURIComponent(id)}`;
      if (location.hash === target) render();
      else location.hash = target;
      return;
    }
    if (form.id === 'connectForm') {
      e.preventDefault();
      connect(form);
      return;
    }
    if (form.id === 'hwForm') {
      e.preventDefault();
      importHomework(form);
      return;
    }
    if (form.id === 'settingsForm') {
      e.preventDefault();
      saveSettings(form);
      return;
    }
    if (form.id === 'rosterForm') {
      e.preventDefault();
      saveRoster(form);
    }
    if (form.id === 'starsForm') {
      e.preventDefault();
      saveStars(form);
    }
  }

  function onClick(e) {
    const jump = e.target.closest('[data-scroll]');
    if (jump) {
      const el = document.getElementById(jump.dataset.scroll);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const target = e.target.closest('[data-act]');
    if (!target) return;
    const act = target.dataset.act;
    if (act === 'hw-clear') {
      const ids = $('#hwIds');
      if (ids) ids.value = '';
      updateHwPreview();
      return;
    }
    if (act === 'class-add') {
      addClassPoint(target.dataset.id);
      return;
    }
    if (act === 'class-del') {
      deleteClassEntry(target.dataset.id);
      return;
    }
    if (act === 'undo-class') {
      undoLastClass();
      return;
    }
    if (act === 'hw-del') {
      deleteHomework(target.dataset.id);
      return;
    }
    if (act === 'sync') {
      flush(true);
      return;
    }
    if (act === 'conn-edit') {
      connEditing = true;
      render();
      return;
    }
    if (act === 'conn-cancel') {
      connEditing = false;
      render();
      return;
    }
    if (act === 'disconnect') {
      disconnect();
      return;
    }
    if (act === 'export') {
      exportJson();
      return;
    }
    if (act === 'reset') {
      resetAll();
      return;
    }
    if (act === 'roll-start') {
      rollStart();
      return;
    }
    if (act === 'roll-confirm') {
      rollConfirm();
      return;
    }
    if (act === 'roll-correct') {
      rollCorrect();
      return;
    }
    if (act === 'roll-wrong') {
      rollWrong();
      return;
    }
    if (act === 'roll-reset') {
      rollReset();
      return;
    }
    if (act === 'stars-del') {
      deleteStar(target.dataset.type, target.dataset.date);
    }
  }

  function onChange(e) {
    const t = e.target;
    if (!t) return;
    if (t.id === 'hwMode' || t.id === 'hwDate' || t.id === 'hwPoints' || t.id === 'hwTitle') {
      updateHwPreview();
      return;
    }
    if (t.id === 'starsType' || t.id === 'starsDate') {
      updateStarsPreview();
      return;
    }
    if (t.id === 'importFile') {
      const file = t.files && t.files[0];
      t.value = '';
      importJsonFile(file);
      return;
    }
    if (t.matches('[data-amt]')) {
      scoreAmt = Number(t.dataset.amt) || 1;
      $$('#amtSeg button').forEach((b) => b.classList.toggle('on', b === t));
    }
  }

  function onInput(e) {
    const t = e.target;
    if (t && (t.id === 'hwIds' || t.id === 'hwMode' || t.id === 'hwTitle' || t.id === 'hwDate')) {
      updateHwPreview();
    }
    if (t && t.id === 'starsIds') {
      updateStarsPreview();
    }
    if (t && t.id === 'lookupInput') {
      const box = $('#lookupErr');
      if (box) box.classList.remove('show');
    }
  }

  function wireGlobal() {
    app.addEventListener('submit', onSubmit);
    app.addEventListener('click', onClick);
    app.addEventListener('change', onChange);
    app.addEventListener('input', onInput);
    app.addEventListener('click', (e) => {
      const seg = e.target.closest('#amtSeg [data-amt]');
      if (seg) {
        scoreAmt = Number(seg.dataset.amt) || 1;
        $$('#amtSeg button').forEach((b) => b.classList.toggle('on', b === seg));
      }
    });

    const refresh = $('#btnRefresh');
    if (refresh) refresh.addEventListener('click', manualRefresh);
    const full = $('#btnFull');
    if (full) full.addEventListener('click', toggleFullscreen);

    window.addEventListener('hashchange', () => {
      if (state) render();
    });
    window.addEventListener('online', () => {
      toast('网络已恢复', 'ok');
      if (pending.length) flush();
      else poll();
    });
    window.addEventListener('offline', () => setSync('offline'));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (pending.length) flush();
      } else if (state) {
        poll();
      }
    });
    setInterval(() => {
      if (document.hidden) return;
      if (pending.length && navigator.onLine) flush();
      else poll();
    }, POLL_MS);
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      const p = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
      if (p && p.catch) p.catch(() => toast('当前浏览器不支持全屏，可按 F11', 'bad'));
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  /* ============================================================
   * 启动
   * ============================================================ */
  function renderFatal(err) {
    app.innerHTML = `<div class="fatal">
      <h2>数据没有加载成功</h2>
      <p>${esc(err && err.message ? err.message : '未知错误')}</p>
      <p>请确认 <code>data.json</code> 和网页在同一个目录，并且通过网址访问（GitHub Pages 或本地服务器）。直接双击打开 HTML 文件时，浏览器会拦截读取数据的请求。</p>
      <button class="btn primary" type="button" id="retryBoot">重新加载</button>
    </div>`;
    const btn = $('#retryBoot');
    if (btn) btn.addEventListener('click', () => location.reload());
  }

  async function init() {
    cfg = loadCfg();
    pending = cfg ? loadOutbox() : [];
    wireGlobal();
    setSync('syncing');
    try {
      const res = await readSource();
      remote = res.data;
      remoteSha = res.sha || null;
      state = applyOps(remote, pending);
      cmp = compute(state);
      cacheSet(state);
      booted = true;
      setSync('ok');
    } catch (e) {
      const cached = cacheGet();
      if (cached) {
        state = applyOps(cached, pending);
        cmp = compute(state);
        booted = true;
        setSync('cache');
        toast('网络不可用，正在显示上次缓存的数据', 'bad');
      } else {
        renderFatal(e);
        return;
      }
    }
    render();
    if (pending.length) flush();
  }

  init();
})();
