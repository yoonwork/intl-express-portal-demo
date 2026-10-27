// 서버와 주고받는 곳은 이 파일 하나예요.
// 실제 서버에 붙일 때: CONFIG.mode 를 'live' 로 바꾸고, 주소가 다르면 아래 PATHS 만 고치면 돼요.
// 각 주소가 주고받는 값은 API_연결표.md 에 있어요.
import * as M from './mock.js';

export const CONFIG = {
  mode: 'mock',              // 'mock' = 데모(가짜 서버) / 'live' = 실제 서버
  base: '/api/portal',       // 실제 서버 주소 앞부분
  mockDelay: 450,            // 데모에서 '불러오는 중'이 잠깐 보이도록
};

export const PATHS = {
  login: '/auth/login',
  logout: '/auth/logout',
  invite: (token) => `/invites/${encodeURIComponent(token)}`,
  acceptInvite: (token) => `/invites/${encodeURIComponent(token)}/accept`,
  resetRequest: '/auth/password-reset',
  resetConfirm: (token) => `/auth/password-reset/${encodeURIComponent(token)}`,
  me: '/me',
  shipments: '/shipments',
  shipment: (id) => `/shipments/${encodeURIComponent(id)}`,
  document: (id, docId) => `/shipments/${encodeURIComponent(id)}/documents/${encodeURIComponent(docId)}`,
  uploadDocument: (id) => `/shipments/${encodeURIComponent(id)}/documents`,
  quotes: '/quotes',
  shipRequests: '/shipment-requests',
  requests: '/requests',
  request: (id) => `/requests/${encodeURIComponent(id)}`,
};

export class ApiError extends Error {
  constructor(status, message, fields = null) { super(message); this.status = status; this.fields = fields; }
}

// ---------- 실제 서버 ----------
async function http(method, path, body, { redirectOn401 = true } = {}) {
  const opt = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (body instanceof FormData) opt.body = body;
  else if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
  let res;
  try { res = await fetch(CONFIG.base + path, opt); }
  catch { throw new ApiError(0, '인터넷 연결을 확인하고 다시 시도해 주세요.'); }
  const data = await res.json().catch(() => null);
  if (res.status === 401 && redirectOn401) {
    location.hash = '#/login?expired=1';
    throw new ApiError(401, '로그인 시간이 지났어요. 다시 로그인해 주세요.');
  }
  if (!res.ok) throw new ApiError(res.status, (data && data.message) || '잠시 후 다시 시도해 주세요.', data && data.fields);
  return data;
}
const qs = (o) => { const p = new URLSearchParams(); Object.entries(o || {}).forEach(([k, v]) => { if (v !== '' && v != null) p.set(k, v); }); const s = p.toString(); return s ? '?' + s : ''; };

// ---------- 데모용 가짜 서버 ----------
// 화면 오른쪽 아래 '데모 상태'로 고른 값: ok / loading / empty / error
let demoState = 'ok';
export const setDemoState = (s) => { demoState = s; };
export const getDemoState = () => demoState;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k, d) { try { const v = sessionStorage.getItem('orm.' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { sessionStorage.setItem('orm.' + k, JSON.stringify(v)); } catch { /* 저장 안 돼도 데모는 계속 */ } },
};
async function mockRead(fn, emptyValue) {
  if (demoState === 'loading') return new Promise(() => {});
  await wait(CONFIG.mockDelay);
  if (demoState === 'error') throw new ApiError(503, '서버에서 응답이 없어요.');
  if (demoState === 'empty' && emptyValue !== undefined) return emptyValue;
  return fn();
}
async function mockWrite(fn) {
  await wait(CONFIG.mockDelay + 250);
  if (demoState === 'error') throw new ApiError(500, '보내는 중 문제가 생겼어요. 입력한 내용은 그대로 있으니 다시 눌러 주세요.');
  return fn();
}
const nowStr = () => { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
const newId = (pre) => `${pre}-261027-${String(Math.floor(Math.random() * 900) + 100)}`;
const myRequests = () => [...store.get('requests', []), ...M.REQUESTS];

function filterShipments({ q = '', status = '', period = '90' }) {
  const term = q.replace(/\s/g, '').toLowerCase();
  const since = new Date('2026-10-27'); since.setDate(since.getDate() - Number(period || 3650));
  const base = M.SHIPMENTS.filter((s) => new Date(s.createdAt) >= since);
  const hit = base.filter((s) => !term || [s.awb, s.ref, s.consignee, s.to.city].join('|').replace(/\s/g, '').toLowerCase().includes(term));
  const counts = { all: hit.length, exception: 0, booked: 0, transit: 0, customs: 0, delivered: 0 };
  hit.forEach((s) => { counts[s.status] += 1; });
  const items = status ? hit.filter((s) => s.status === status) : hit;
  return { items: items.map(({ events, docs, action, ...rest }) => ({ ...rest, docCount: docs.length, actionTitle: action ? action.title : null })), total: items.length, counts };
}

// ---------- 화면이 쓰는 함수 ----------
export const api = {
  async login(email, password) {
    if (CONFIG.mode === 'live') return http('POST', PATHS.login, { email, password }, { redirectOn401: false });
    return mockWrite(() => {
      if (password.length < 8) throw new ApiError(401, '이메일 또는 비밀번호가 맞지 않아요. 5번 틀리면 10분 동안 로그인이 잠겨요.');
      store.set('auth', true); return { ok: true };
    });
  },
  async logout() {
    if (CONFIG.mode === 'live') return http('POST', PATHS.logout);
    store.set('auth', false); return { ok: true };
  },
  isLoggedInHint() { return CONFIG.mode === 'live' ? true : store.get('auth', false); },

  async getInvite(token) {
    if (CONFIG.mode === 'live') return http('GET', PATHS.invite(token), undefined, { redirectOn401: false });
    return mockRead(() => {
      if (token === 'expired') throw new ApiError(410, '초대 링크의 유효기간(7일)이 지났어요.');
      return { company: M.ME.company, email: M.ME.email, inviter: `${M.ME.manager.name} (${M.ME.manager.team})`, expiresAt: '2026-11-03' };
    });
  },
  async acceptInvite(token, body) {
    if (CONFIG.mode === 'live') return http('POST', PATHS.acceptInvite(token), body, { redirectOn401: false });
    return mockWrite(() => ({ ok: true }));
  },
  async requestReset(email) {
    if (CONFIG.mode === 'live') return http('POST', PATHS.resetRequest, { email }, { redirectOn401: false });
    return mockWrite(() => ({ ok: true }));
  },
  async confirmReset(token, password) {
    if (CONFIG.mode === 'live') return http('POST', PATHS.resetConfirm(token), { password }, { redirectOn401: false });
    return mockWrite(() => { if (token === 'expired') throw new ApiError(410, '재설정 링크가 만료됐어요. 다시 요청해 주세요.'); return { ok: true }; });
  },

  async me() {
    if (CONFIG.mode === 'live') return http('GET', PATHS.me);
    return mockRead(() => ({ me: M.ME, addresses: M.ADDRESSES }), { me: M.ME, addresses: [] });
  },
  async listShipments(params) {
    if (CONFIG.mode === 'live') return http('GET', PATHS.shipments + qs(params));
    return mockRead(() => filterShipments(params), { items: [], total: 0, counts: { all: 0, exception: 0, booked: 0, transit: 0, customs: 0, delivered: 0 } });
  },
  async getShipment(id) {
    if (CONFIG.mode === 'live') return http('GET', PATHS.shipment(id));
    return mockRead(() => {
      const s = M.SHIPMENTS.find((x) => x.id === id);
      if (!s) throw new ApiError(404, '이 화물을 찾을 수 없어요.');
      return s;
    });
  },
  documentUrl(id, docId) { return CONFIG.base + PATHS.document(id, docId); },
  async uploadDocument(id, formData) {
    if (CONFIG.mode === 'live') return http('POST', PATHS.uploadDocument(id), formData);
    return mockWrite(() => ({ ok: true }));
  },
  async createQuote(body) {
    if (CONFIG.mode === 'live') return http('POST', PATHS.quotes, body);
    return mockWrite(() => {
      const r = { id: newId('Q'), kind: 'quote', title: `${body.fromCity} → ${body.toCity} · ${body.pieces}박스 ${body.weight}kg`, createdAt: nowStr(), status: 'received', history: [[nowStr(), '견적 요청 접수']] };
      store.set('requests', [r, ...store.get('requests', [])]); return r;
    });
  },
  async createShipRequest(formData, summary) {
    if (CONFIG.mode === 'live') return http('POST', PATHS.shipRequests, formData);
    return mockWrite(() => {
      const r = { id: newId('R'), kind: 'ship', title: summary, createdAt: nowStr(), status: 'received', history: [[nowStr(), '발송 신청 접수']] };
      store.set('requests', [r, ...store.get('requests', [])]); return r;
    });
  },
  async listRequests(params = {}) {
    if (CONFIG.mode === 'live') return http('GET', PATHS.requests + qs(params));
    return mockRead(() => {
      let items = myRequests();
      if (params.kind) items = items.filter((r) => r.kind === params.kind);
      if (params.status === 'open') items = items.filter((r) => ['received', 'reviewing', 'needs_fix'].includes(r.status));
      if (params.status === 'done') items = items.filter((r) => ['answered', 'accepted', 'registered'].includes(r.status));
      return { items, total: items.length };
    }, { items: [], total: 0 });
  },
  async getRequest(id) {
    if (CONFIG.mode === 'live') return http('GET', PATHS.request(id));
    return mockRead(() => { const r = myRequests().find((x) => x.id === id); if (!r) throw new ApiError(404, '요청을 찾을 수 없어요.'); return r; });
  },
};
