// 화면 부품 모음. 글자는 모두 textContent 로 넣어요(서버 값에 HTML이 섞여도 실행되지 않게).
// 인라인 style·onclick 을 쓰지 않아요(CSP). 이벤트는 addEventListener 로만 붙여요.
import { COUNTRY } from './mock.js';

const SVGNS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  add(el, kids);
  return el;
}
export function add(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
}

export function icon(name, cls = 'i') {
  const s = document.createElementNS(SVGNS, 'svg');
  s.setAttribute('class', cls); s.setAttribute('aria-hidden', 'true');
  const u = document.createElementNS(SVGNS, 'use');
  u.setAttribute('href', '#i-' + name);
  s.append(u);
  return s;
}

export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (el, ...kids) => { clear(el); add(el, kids); return el; };

// ---------- 글자 모양 ----------
export const won = (n) => n.toLocaleString('ko-KR') + '원';
export const kg = (n) => `${Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}kg`;
const WD = ['일', '월', '화', '수', '목', '금', '토'];
export function md(dateStr) {
  const d = new Date(dateStr.slice(0, 10) + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}(${WD[d.getDay()]})`;
}
export const cname = (cc) => COUNTRY[cc] || cc;

export const SHIP_STATUS = {
  booked: ['접수', 'b-neu'],
  picked: ['출고', 'b-neu'],
  transit: ['운송 중', 'b-info'],
  customs: ['통관 중', 'b-cus'],
  delivered: ['배달 완료', 'b-ok'],
  exception: ['조치 필요', 'b-act'],
};
export const REQ_STATUS = {
  received: ['접수', 'b-neu'],
  reviewing: ['검토 중', 'b-info'],
  answered: ['견적 회신', 'b-ok'],
  accepted: ['발송 신청함', 'b-neu'],
  registered: ['운송장 발급', 'b-ok'],
  needs_fix: ['보완 요청', 'b-act'],
};
export const badge = (map, key) => { const [t, c] = map[key] || [key, 'b-neu']; return h('span', { class: 'badge ' + c }, t); };

export function route(from, to) {
  return h('span', { class: 'route' },
    h('span', null, from.city, ' ', h('span', { class: 'cc' }, from.country)),
    icon('right', 'i sm'),
    h('span', null, to.city, ' ', h('span', { class: 'cc' }, to.country)));
}

// ---------- 상태 화면 (불러오는 중 / 자료 없음 / 조회 실패) ----------
export function skeletonRows(n = 5) {
  return h('div', { 'aria-busy': 'true', 'aria-label': '불러오는 중' },
    Array.from({ length: n }, () => h('div', { class: 'sk-row' },
      h('span', { class: 'sk w80' }), h('span', { class: 'sk w60' }), h('span', { class: 'sk w80' }), h('span', { class: 'sk w40' }), h('span', { class: 'sk w60' }))));
}
export function skeletonBlock() {
  return h('div', { class: 'card card-p stack-16', 'aria-busy': 'true', 'aria-label': '불러오는 중' },
    h('span', { class: 'sk h24 w40' }), h('span', { class: 'sk w60' }), h('span', { class: 'sk w80' }), h('span', { class: 'sk w30' }));
}
export function emptyState({ title, text, action }) {
  return h('div', { class: 'state' },
    h('div', { class: 'ic' }, icon('box')), h('h3', null, title), h('p', null, text), action || null);
}
export function errorState(err, retry) {
  const offline = err && err.status === 0;
  const notFound = err && err.status === 404;
  return h('div', { class: 'state is-err', role: 'alert' },
    h('div', { class: 'ic' }, icon('alert')),
    h('h3', null, notFound ? '찾을 수 없어요' : offline ? '인터넷 연결이 끊겼어요' : '정보를 불러오지 못했어요'),
    h('p', null, notFound ? (err.message + ' 다른 회사의 화물이거나 주소가 바뀌었을 수 있어요.') : '잠시 후 다시 시도해 주세요. 계속 안 되면 담당 직원에게 알려 주세요.'),
    notFound ? h('a', { class: 'btn', href: '#/shipments' }, '내 화물로 돌아가기')
      : retry ? h('button', { class: 'btn', type: 'button', onclick: retry }, icon('refresh', 'i sm'), '다시 불러오기') : null,
    err && err.status ? h('span', { class: 'code' }, `오류 코드 ${err.status}`) : null);
}

// 불러오기 → 상태별 화면을 한 번에 처리
export async function load(box, loader, render, { skeleton = skeletonRows, isEmpty, empty } = {}) {
  mount(box, skeleton());
  try {
    const data = await loader();
    if (!box.isConnected) return;
    if (isEmpty && isEmpty(data)) mount(box, emptyState(empty(data)));
    else mount(box, render(data));
  } catch (e) {
    if (!box.isConnected) return;
    mount(box, errorState(e, () => load(box, loader, render, { skeleton, isEmpty, empty })));
  }
}

// ---------- 버튼 처리 중 ----------
export async function busy(btn, label, fn) {
  const old = [...btn.childNodes];
  btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
  mount(btn, h('span', { class: 'spin', 'aria-hidden': 'true' }), label);
  try { return await fn(); }
  finally { btn.removeAttribute('aria-busy'); btn.disabled = false; mount(btn, old); }
}

// ---------- 폼 오류 ----------
export function fieldError(input, msg) {
  const wrap = input.closest('.fld') || input.parentElement;
  const prev = wrap.querySelector('.err'); if (prev) prev.remove();
  if (!msg) { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); return; }
  const id = (input.id || input.name) + '-err';
  input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', id);
  wrap.append(h('span', { class: 'err', id }, icon('alert', 'i sm'), msg));
}
export function formError(form, msg) {
  const prev = form.querySelector(':scope > .form-err'); if (prev) prev.remove();
  if (!msg) return;
  const box = h('div', { class: 'form-err', role: 'alert', tabindex: '-1' }, icon('alert'), h('div', null, msg));
  form.prepend(box); box.focus();
}
export function field({ label, name, type = 'text', req, help, value, attrs = {}, small }) {
  const id = 'f-' + name;
  const input = type === 'textarea'
    ? h('textarea', { class: 'inp', id, name, ...attrs })
    : h('input', { class: 'inp', id, name, type, ...attrs });
  if (value != null) input.value = value;
  return h('label', { class: 'fld', for: id },
    h('span', { class: 'lb' }, label, req ? h('em', { 'aria-hidden': 'true' }, '*') : null, small ? h('small', null, small) : null),
    input, help ? h('span', { class: 'help' }, help) : null);
}

let toastTimer;
export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3200);
}
export const append = (el, ...kids) => { add(el, kids); return el; };

// 드로어(모달) 공통: 배경 잠금(inert), Tab 순환, Esc 닫기, 닫으면 연 버튼으로 포커스 복귀
export function openModal(panel) {
  const opener = document.activeElement;
  const app = document.getElementById('app');
  const bg = h('div', { class: 'drawer-bg' });
  const focusables = () => [...panel.querySelectorAll('a[href],button:not([disabled]),input,select,textarea')].filter((e) => !e.hidden);
  const key = (e) => {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  function close() {
    bg.remove(); panel.remove(); document.removeEventListener('keydown', key);
    app.inert = false; window.removeEventListener('hashchange', close);
    if (opener && opener.isConnected && opener.focus) opener.focus();
  }
  bg.addEventListener('click', close);
  document.body.append(bg, panel); document.addEventListener('keydown', key);
  app.inert = true; window.addEventListener('hashchange', close);
  const f = focusables(); if (f.length) f[0].focus();
  return close;
}
