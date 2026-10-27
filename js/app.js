// 시작점: 주소(#/...)에 맞는 화면을 그려요. 화면별 코드는 pages/ 폴더에 하나씩 있어요.
import { api, setDemoState, getDemoState } from './api.js';
import { h, icon, mount } from './ui.js';
import * as auth from './pages/auth.js';
import * as ship from './pages/shipments.js';
import * as req from './pages/requests.js';
import * as me from './pages/me.js';

const ROUTES = [
  { re: /^\/login$/, view: auth.login, pub: true, title: '로그인' },
  { re: /^\/invite$/, view: auth.invite, pub: true, title: '초대 수락' },
  { re: /^\/reset$/, view: auth.resetRequest, pub: true, title: '비밀번호 재설정' },
  { re: /^\/reset\/new$/, view: auth.resetNew, pub: true, title: '새 비밀번호' },
  { re: /^\/shipments$/, view: ship.list, nav: 'shipments', title: '내 화물' },
  { re: /^\/shipments\/([\w-]+)$/, view: ship.detail, nav: 'shipments', title: '화물 상세' },
  { re: /^\/requests$/, view: req.list, nav: 'requests', title: '내 요청' },
  { re: /^\/requests\/quote$/, view: req.quote, nav: 'quote', title: '견적 요청' },
  { re: /^\/requests\/ship$/, view: req.ship, nav: 'ship', title: '발송 신청' },
  { re: /^\/me$/, view: me.page, nav: 'me', title: '내 정보' },
];

const app = document.getElementById('app');

function notFound(root) {
  mount(root, h('div', { class: 'card' }, h('div', { class: 'state is-err', role: 'alert' },
    h('div', { class: 'ic' }, icon('alert')), h('h3', null, '없는 화면이에요'),
    h('p', null, `주소(${location.hash})가 잘못됐거나 바뀌었어요. 받은 링크를 다시 확인해 주세요.`),
    h('a', { class: 'btn', href: '#/shipments' }, '내 화물로 가기'))));
}
let shell = null;   // 로그인 뒤 틀(왼쪽 메뉴·아래 탭)

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, q = ''] = raw.split('?');
  return { path, query: new URLSearchParams(q) };
}

const NAV = [
  { key: 'shipments', href: '#/shipments', label: '내 화물', ic: 'box', group: '화물' },
  { key: 'requests', href: '#/requests', label: '내 요청 목록', ic: 'list', group: '요청' },
  { key: 'quote', href: '#/requests/quote', label: '견적 요청', ic: 'quote', group: '요청' },
  { key: 'ship', href: '#/requests/ship', label: '발송 신청', ic: 'send', group: '요청' },
  { key: 'me', href: '#/me', label: '내 정보', ic: 'user', group: '계정' },
];
const TABS = [
  { key: 'shipments', href: '#/shipments', label: '화물', ic: 'box' },
  { key: 'quote', href: '#/requests/quote', label: '견적', ic: 'quote' },
  { key: 'ship', href: '#/requests/ship', label: '발송', ic: 'send' },
  { key: 'requests', href: '#/requests', label: '요청 내역', ic: 'list' },
  { key: 'me', href: '#/me', label: '내 정보', ic: 'user' },
];

const logo = (small) => h('a', { class: 'logo', href: '#/shipments' },
  h('span', { class: 'mk' }, markSvg()),
  h('span', null, '오름익스프레스', small ? h('small', null, '고객 포털') : null));
function markSvg() {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
  const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.setAttribute('d', 'M5 16.5l7-9 7 9'); s.append(p); return s;
}

function buildShell() {
  const page = h('main', { class: 'page', id: 'page', tabindex: '-1' });
  const actCount = h('span', { class: 'cnt', hidden: true });
  let group = '';
  const navItems = [];
  NAV.forEach((n) => {
    if (n.group !== group) { group = n.group; navItems.push(h('div', { class: 'nav-l' }, n.group)); }
    navItems.push(h('a', { href: n.href, dataset: { nav: n.key } }, icon(n.ic), n.label, n.key === 'shipments' ? actCount : null));
  });
  const who = h('div', { class: 'side-foot' }, h('b', null, '불러오는 중'), h('span', null, ''));
  const out = h('button', { class: 'btn ghost', type: 'button', onclick: async () => { await api.logout(); shell = null; location.hash = '#/login'; } }, icon('out', 'i sm'), '로그아웃');
  who.append(out);
  const el = h('div', { class: 'shell' },
    h('aside', { class: 'side', 'aria-label': '메뉴' }, logo(true), h('nav', { class: 'nav' }, navItems), who),
    h('div', { class: 'main' },
      h('header', { class: 'topbar' }, logo(false), h('a', { class: 'icon-btn', href: '#/me', 'aria-label': '내 정보' }, icon('user'))),
      page),
    h('nav', { class: 'tabbar', 'aria-label': '아래 메뉴' }, TABS.map((t) => h('a', { href: t.href, dataset: { nav: t.key } }, icon(t.ic), t.label))));
  // 이름·조치 필요 수는 조용히 불러오고, 실패해도 화면은 그대로
  api.me().then(({ me: m }) => { who.firstChild.textContent = m.company; who.children[1].textContent = `${m.name} · ${m.title}`; }).catch(() => { who.firstChild.textContent = '고객 계정'; });
  api.listShipments({ period: '90' }).then((r) => { if (r.counts.exception) { actCount.textContent = r.counts.exception; actCount.hidden = false; actCount.setAttribute('aria-label', `조치 필요 ${r.counts.exception}건`); } }).catch(() => {});
  return { el, page };
}

function demoSwitch() {
  const sel = h('select', { class: 'select', id: 'demo-state', 'aria-label': '데모 상태 바꾸기' },
    [['ok', '정상'], ['loading', '불러오는 중'], ['empty', '자료 없음'], ['error', '조회 실패']].map(([v, t]) => h('option', { value: v }, t)));
  sel.value = getDemoState();
  sel.addEventListener('change', () => { setDemoState(sel.value); try { sessionStorage.setItem('orm.demoState', sel.value); } catch { /* 무시 */ } render(); });
  return h('div', { class: 'demo-sw' }, h('label', { for: 'demo-state' }, '데모 상태'), sel);
}

function render() {
  const { path, query } = parseHash();
  const loggedIn = api.isLoggedInHint();
  if (path === '/' || path === '') { location.replace(loggedIn ? '#/shipments' : '#/login'); return; }
  const r = ROUTES.find((x) => x.re.test(path)) || { re: /.*/, view: notFound, nav: '', title: '없는 화면' };

  if (!r.pub && !loggedIn) { location.replace('#/login'); return; }
  document.title = `${r.title} · 오름익스프레스 고객 포털 (데모)`;
  const args = path.match(r.re).slice(1);
  document.body.classList.toggle('is-auth', !!r.pub);

  if (r.pub) {
    shell = null;
    const box = h('div');
    mount(app, box, demoSwitch());
    r.view(box, { query, args });
    window.scrollTo(0, 0);
  } else {
    if (!shell) { shell = buildShell(); mount(app, shell.el, demoSwitch()); }
    else { const sw = app.querySelector('.demo-sw'); if (sw) sw.replaceWith(demoSwitch()); }
    shell.el.querySelectorAll('[data-nav]').forEach((a) => {
      if (a.dataset.nav === r.nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    mount(shell.page);
    r.view(shell.page, { query, args });
    window.scrollTo(0, 0);
  }
}

// ?demo=1 : 로그인 없이 바로 화면 보기(데모 링크 공유용)
try { if (new URLSearchParams(location.search).get('demo') === '1') sessionStorage.setItem('orm.auth', 'true'); } catch { /* 무시 */ }
try { const s = new URLSearchParams(location.search).get('state') || sessionStorage.getItem('orm.demoState'); if (s) setDemoState(s); } catch { /* 무시 */ }
window.addEventListener('hashchange', render);
render();
