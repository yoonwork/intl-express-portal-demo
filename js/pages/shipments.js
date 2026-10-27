// 화물 조회: 내 화물 목록(검색·필터) · 화물 상세(배송 상태 + 서류함)
import { api, CONFIG } from '../api.js';
import { h, icon, mount, load, skeletonBlock, badge, SHIP_STATUS, route, md, kg, toast, emptyState, errorState, skeletonRows , append } from '../ui.js';

const FILTERS = [
  ['', '전체', 'all'], ['exception', '조치 필요', 'exception'], ['booked', '접수', 'booked'],
  ['transit', '운송 중', 'transit'], ['customs', '통관 중', 'customs'], ['delivered', '배달 완료', 'delivered'],
];
const PAGE = 10;

export function list(root, { query }) {
  const st = { q: query.get('q') || '', status: query.get('status') || '', period: query.get('period') || '90', shown: PAGE };
  const syncUrl = () => {
    const p = new URLSearchParams(); if (st.q) p.set('q', st.q); if (st.status) p.set('status', st.status); if (st.period !== '90') p.set('period', st.period);
    history.replaceState(null, '', '#/shipments' + (p.toString() ? '?' + p : ''));
  };

  const chips = h('div', { class: 'seg', role: 'group', 'aria-label': '상태로 거르기' });
  const search = h('input', { type: 'search', placeholder: '운송장·주문번호·받는 분', 'aria-label': '화물 검색', autocomplete: 'off' });
  search.value = st.q;
  const period = h('select', { class: 'select', 'aria-label': '기간' }, [['30', '최근 30일'], ['90', '최근 90일'], ['365', '최근 1년']].map(([v, t]) => h('option', { value: v }, t)));
  period.value = st.period;
  const body = h('div');

  mount(root,
    h('div', { class: 'page-h' },
      h('div', null, h('h1', null, '내 화물'), h('p', null, '우리 회사 계정으로 보낸 화물만 보여요.')),
      h('a', { class: 'btn pri', href: '#/requests/ship' }, icon('plus', 'i sm'), '발송 신청')),
    h('div', { class: 'notice' }, h('span', { class: 'tag' }, '공지'), h('span', { class: 't' }, '11/3(화)부터 미국행 당일 출고 마감이 오후 3시로 앞당겨져요.'), h('time', { datetime: '2026-10-27' }, '10/27')),
    h('section', { class: 'card', 'aria-label': '화물 목록' },
      h('div', { class: 'filters' }, chips, period, h('div', { class: 'search' }, icon('search', 'i sm'), search)),
      body));

  let timer; let seq = 0;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { st.q = search.value.trim(); st.shown = PAGE; refresh(); }, 250); });
  period.addEventListener('change', () => { st.period = period.value; st.shown = PAGE; refresh(); });

  function drawChips(counts) {
    mount(chips, FILTERS.map(([v, t, k]) => {
      const b = h('button', { type: 'button', class: 'chip' + (v === 'exception' ? ' act' : ''), 'aria-pressed': String(st.status === v) }, t, counts ? h('span', { class: 'n' }, counts[k]) : null);
      b.addEventListener('click', () => { st.status = v; st.shown = PAGE; refresh(); });
      return b;
    }));
  }

  async function refresh() {
    syncUrl(); drawChips(null);
    const my = ++seq;
    mount(body, skeletonRows(6));
    let data;
    try { data = await api.listShipments({ q: st.q, status: st.status, period: st.period }); }
    catch (e) { if (my === seq) mount(body, errorState(e, refresh)); return; }
    if (my !== seq || !body.isConnected) return;
    drawChips(data.counts);
    if (!data.items.length) { mount(body, emptyState(emptyCopy())); return; }
    mount(body, table(data.items.slice(0, st.shown)), mobileList(data.items.slice(0, st.shown)),
      data.items.length > st.shown ? h('div', { class: 'more' }, h('button', { class: 'btn', type: 'button', onclick: () => { st.shown += PAGE; refresh(); } }, `더 보기 (${data.items.length - st.shown}건 남음)`)) : null);
  }

  function emptyCopy() {
    if (st.q) return { title: `‘${st.q}’로 찾은 화물이 없어요`, text: '운송장 번호는 띄어쓰기 없이 넣어도 돼요. 기간을 넓혀 보거나 검색어를 지워 보세요.', action: h('button', { class: 'btn', type: 'button', onclick: () => { search.value = ''; st.q = ''; refresh(); } }, '검색어 지우기') };
    if (st.status) return { title: '이 상태의 화물이 없어요', text: '다른 상태를 고르거나 전체를 눌러 보세요.', action: h('button', { class: 'btn', type: 'button', onclick: () => { st.status = ''; refresh(); } }, '전체 보기') };
    return { title: '아직 보낸 화물이 없어요', text: '발송 신청을 하면 운송장이 발급되고, 여기에서 위치와 서류를 확인할 수 있어요.', action: h('a', { class: 'btn pri', href: '#/requests/ship' }, '첫 발송 신청하기') };
  }

  refresh();
}

function table(items) {
  return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, ['운송장 번호', '구간', '받는 분', '상태', '예상 도착', '서류'].map((t, i) => h('th', { scope: 'col', class: i === 5 ? 'r' : null }, t)))),
    h('tbody', null, items.map((s) => {
      const tr = h('tr', null,
        h('td', null, h('a', { class: 'rowlink mono', href: `#/shipments/${s.id}` }, s.awb), h('span', { class: 'sub' }, s.ref)),
        h('td', null, route(s.from, s.to), h('span', { class: 'sub' }, `${s.service} · ${s.pieces}박스 · ${kg(s.weight)}`)),
        h('td', null, s.consignee),
        h('td', null, badge(SHIP_STATUS, s.status), s.actionTitle ? h('span', { class: 'act-line' }, s.actionTitle) : h('span', { class: 'sub' }, s.subText)),
        h('td', { class: 'num' }, s.status === 'delivered' ? '완료' : md(s.eta)),
        h('td', { class: 'r num' }, `${s.docCount}건`));
      tr.addEventListener('click', (e) => { if (e.target.closest('a')) return; location.hash = `#/shipments/${s.id}`; });
      return tr;
    }))));
}

function mobileList(items) {
  return h('ul', { class: 'list-m' }, items.map((s) => h('li', null, h('a', { href: `#/shipments/${s.id}` },
    h('div', { class: 'top' }, h('b', { class: 'mono' }, s.awb), badge(SHIP_STATUS, s.status)),
    h('div', { class: 'rt' }, route(s.from, s.to)),
    s.actionTitle ? h('span', { class: 'act-line' }, s.actionTitle) : null,
    h('div', { class: 'meta' }, h('span', null, `${s.ref} · ${s.consignee}`), h('span', { class: 'num' }, s.status === 'delivered' ? '배달 완료' : `도착 ${md(s.eta)}`))))));
}

const STEP_NAMES = ['접수', '출고', '운송 중', '통관', '배달 완료'];

export function detail(root, { args }) {
  const [id] = args;
  const box = h('div');
  mount(root, h('a', { class: 'crumb', href: '#/shipments' }, icon('left', 'i sm'), '내 화물'), box);
  load(box, () => api.getShipment(id), (s) => view(s), { skeleton: skeletonBlock });
}

function view(s) {
  const copy = h('button', { class: 'icon-btn', type: 'button', 'aria-label': '운송장 번호 복사' }, icon('copy'));
  copy.addEventListener('click', async () => { try { await navigator.clipboard.writeText(s.awb.replace(/\s/g, '')); toast('운송장 번호를 복사했어요.'); } catch { toast('복사하지 못했어요. 번호를 길게 눌러 복사해 주세요.'); } });
  const delivered = s.status === 'delivered';
  const stepNodes = STEP_NAMES.map((name, i) => {
    let cls = '';
    if (delivered || i < s.step) cls = 'done';
    else if (i === s.step) cls = 'now' + (s.status === 'exception' ? ' act' : '');
    return h('li', { class: cls, 'aria-current': cls.startsWith('now') ? 'step' : null }, name);
  });

  return h('div', { class: 'stack-24' },
    h('section', { class: 'card card-p' },
      h('div', { class: 'det-top' }, h('h1', { class: 'awb' }, h('span', { class: 'sr' }, '운송장 번호 '), h('span', { class: 'mono' }, s.awb)), copy, badge(SHIP_STATUS, s.status)),
      h('div', { class: 'det-meta' },
        h('span', null, route(s.from, s.to)), h('span', null, `주문번호 ${s.ref}`), h('span', null, `${s.service} · ${s.pieces}박스 · ${kg(s.weight)}`),
        h('span', { class: 'num' }, delivered ? s.subText : `예상 도착 ${md(s.eta)}`)),
      h('ol', { class: 'steps', 'aria-label': '배송 단계' }, stepNodes),
      !delivered ? h('p', { class: 'help' }, `지금: ${s.subText}`) : null),
    s.action ? actionBox(s) : null,
    h('div', { class: 'grid-side' },
      h('section', { class: 'card', 'aria-labelledby': 'h-tl' },
        h('div', { class: 'card-h' }, h('h2', { id: 'h-tl' }, '배송 이력'), h('span', { class: 'mut num' }, `${s.events.length}건 · 현지 시각`)),
        h('ol', { class: 'tl' }, s.events.map((e) => h('li', { class: e.actionRequired ? 'act' : null },
          h('span', { class: 'tm' }, e.time.slice(5).replace('-', '/')), h('span', { class: 'dot', 'aria-hidden': 'true' }),
          h('span', null, h('b', null, e.text), h('span', { class: 'loc' }, e.location)))))),
      h('div', { class: 'stack-16' },
        docBox(s),
        h('section', { class: 'card card-p', 'aria-label': '보내는 곳과 받는 곳' },
          h('div', { class: 'stack-16' },
            h('div', { class: 'party' }, h('span', { class: 'l' }, '보내는 곳'), h('b', null, '한결코스메틱(가상) 물류팀'), `${s.from.city}, ${s.from.country}`),
            h('div', { class: 'party' }, h('span', { class: 'l' }, '받는 곳'), h('b', null, s.consignee), `${s.to.city}, ${s.to.country}`))))));
}

function actionBox(s) {
  const a = s.action;
  const inner = h('div', null, h('b', null, a.title), h('p', null, a.text));
  if (a.doc) {
    const file = h('input', { type: 'file', accept: '.pdf,.jpg,.jpeg,.png,.xlsx', class: 'sr', id: 'fix-file' });
    const btn = h('label', { class: 'btn pri', for: 'fix-file' }, icon('upload', 'i sm'), `${a.doc} 올리기`);
    file.addEventListener('change', async () => {
      const f = file.files[0]; if (!f) return;
      if (f.size > 10 * 1024 * 1024) { toast('10MB 이하 파일만 올릴 수 있어요.'); return; }
      const fd = new FormData(); fd.append('type', a.doc); fd.append('file', f);
      mount(btn, h('span', { class: 'spin', 'aria-hidden': 'true' }), '올리는 중');
      try {
        await api.uploadDocument(s.id, fd);
        mount(inner, h('b', null, '서류를 받았어요'), h('p', null, `${f.name} — 담당 직원이 확인하고 다시 통관 신고해요. 진행 상황은 배송 이력에 표시돼요.`));
      } catch (err) { mount(btn, icon('upload', 'i sm'), '다시 올리기'); toast(err.message); }
    });
    append(inner, btn, file);
  } else {
    append(inner, h('a', { class: 'btn', href: '#/me' }, '담당 직원 연락처 보기'));
  }
  return h('section', { class: 'callout', role: 'alert' }, icon('alert'), inner);
}

function docBox(s) {
  const dl = (d) => {
    if (CONFIG.mode === 'live') return h('a', { class: 'icon-btn', href: api.documentUrl(s.id, d.id), download: d.name, 'aria-label': `${d.type} 내려받기` }, icon('download'));
    return h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${d.type} 내려받기`, onclick: () => toast('데모라 실제 파일은 없어요. 실제 화면에서는 바로 내려받아져요.') }, icon('download'));
  };
  const need = s.action && s.action.doc;
  return h('section', { class: 'card', 'aria-labelledby': 'h-docs' },
    h('div', { class: 'card-h' }, h('h2', { id: 'h-docs' }, '서류함'), h('span', { class: 'mut num' }, `${s.docs.length}건`)),
    h('ul', { class: 'docs' },
      need ? h('li', { class: 'need' }, h('span', { class: 'fi' }, icon('alert')), h('span', { class: 'nm' }, h('b', null, need), h('span', null, '보완 필요 — 위에서 올려 주세요'))) : null,
      s.docs.map((d) => h('li', null, h('span', { class: 'fi' }, icon('doc')), h('span', { class: 'nm' }, h('b', null, d.type), h('span', null, `${d.name} · ${d.size}`)), dl(d)))));
}
