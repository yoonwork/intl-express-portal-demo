// 요청: 견적 요청 · 발송 신청(서류 첨부) · 내 요청 목록(처리 상태)
import { api } from '../api.js';
import { h, icon, mount, load, badge, REQ_STATUS, field, fieldError, formError, busy, won, kg, cname, emptyState, errorState, skeletonRows, toast , append, openModal } from '../ui.js';
import { COUNTRY } from '../mock.js';

const countrySelect = (name, value, label) => {
  const s = h('select', { class: 'inp select', id: 'f-' + name, name }, Object.entries(COUNTRY).map(([c, n]) => h('option', { value: c }, `${n} (${c})`)));
  s.value = value;
  return h('label', { class: 'fld', for: 'f-' + name }, h('span', { class: 'lb' }, label, h('em', { 'aria-hidden': 'true' }, '*')), s);
};
const num = (v) => Number(String(v).replace(/,/g, ''));
function requireFields(form, rules) {
  let first = null;
  for (const [name, test, msg] of rules) {
    const el = form.elements[name];
    const ok = test(el.value.trim(), el);
    fieldError(el, ok ? null : msg);
    if (!ok && !first) first = el;
  }
  if (first) first.focus();
  return !first;
}
const doneBox = (title, lines, btns) => h('section', { class: 'card done-box', role: 'status' },
  h('div', { class: 'ic' }, icon('check')), h('h2', null, title), lines.map((l) => h('p', null, l)), h('div', { class: 'btns' }, btns));

// ================= 견적 요청 =================
export function quote(root) {
  const form = h('form', { class: 'card card-p form', novalidate: true });
  const volOut = h('div', { class: 'calc', 'aria-live': 'polite' });
  const kinds = [['doc', '서류', '계약서·샘플 서류'], ['goods', '일반 물품', '화장품·의류·부품'], ['special', '배터리·액체 포함', '포장 기준 확인이 필요해요']];
  append(form, 
    h('fieldset', { class: 'fs' }, h('legend', null, '어디로 보내나요'),
      h('div', { class: 'row-2' }, countrySelect('fromCountry', 'KR', '출발 국가'), field({ label: '출발 도시', name: 'fromCity', req: true, value: '김포' })),
      h('div', { class: 'row-2' }, countrySelect('toCountry', 'US', '도착 국가'), field({ label: '도착 도시', name: 'toCity', req: true, attrs: { placeholder: '예: Los Angeles' } }))),
    h('fieldset', { class: 'fs' }, h('legend', null, '무엇을 보내나요'),
      h('div', { class: 'radio-cards', role: 'radiogroup', 'aria-label': '화물 종류' }, kinds.map(([v, t, d], i) => h('label', { class: 'rc' }, h('input', { type: 'radio', name: 'kind', value: v, checked: i === 1 }), h('b', null, t), h('span', null, d)))),
      h('div', { class: 'sp16' }),
      field({ label: '품목 설명', name: 'items', req: true, attrs: { placeholder: '예: 기초 화장품(토너·크림) 120개' } }),
      h('div', { class: 'row-3 wrap-m' },
        field({ label: '박스 수', name: 'pieces', type: 'number', req: true, value: 1, attrs: { min: 1, max: 99, inputmode: 'numeric' } }),
        field({ label: '총 무게', name: 'weight', type: 'number', req: true, small: 'kg', attrs: { min: 0.1, step: 0.1, inputmode: 'decimal' } }),
        field({ label: '희망 발송일', name: 'date', type: 'date', attrs: { min: '2026-10-27' } })),
      h('div', { class: 'row-3' },
        field({ label: '가로', name: 'l', type: 'number', small: 'cm', attrs: { min: 1, inputmode: 'numeric' } }),
        field({ label: '세로', name: 'w', type: 'number', small: 'cm', attrs: { min: 1, inputmode: 'numeric' } }),
        field({ label: '높이', name: 'hgt', type: 'number', small: 'cm', attrs: { min: 1, inputmode: 'numeric' } })),
      volOut,
      field({ label: '요청 사항', name: 'memo', type: 'textarea', small: '선택', attrs: { placeholder: '예: 수입자 관세 부담(DAP) 조건으로 견적 부탁드려요' } })),
    h('div', { class: 'actions' }, h('a', { class: 'btn ghost', href: '#/requests' }, '취소'), h('button', { class: 'btn pri lg', type: 'submit' }, '견적 요청 보내기')));

  const calc = () => {
    const e = form.elements; const L = num(e.l.value), W = num(e.w.value), H = num(e.hgt.value), n = num(e.pieces.value) || 1, real = num(e.weight.value) || 0;
    if (!(L && W && H)) { mount(volOut, h('span', { class: 'mut' }, '박스 크기를 넣으면 부피 무게를 함께 계산해 드려요. 운임은 실무게와 부피 무게 중 큰 쪽 기준이에요.')); return; }
    const vol = Math.round((L * W * H) / 5000 * n * 10) / 10;
    mount(volOut, h('span', null, '부피 무게 ', h('b', null, kg(vol))), h('span', null, '실무게 ', h('b', null, kg(real))), h('span', null, '적용 예상 ', h('b', null, kg(Math.max(vol, real)))), h('span', { class: 'mut' }, '참고용 예상값이에요. 모든 박스가 같은 크기라고 보고 가로×세로×높이÷5000으로 계산했어요(실제 기준은 회신 견적에 따라요).'));
  };
  form.addEventListener('input', (e) => { if (['l', 'w', 'hgt', 'pieces', 'weight'].includes(e.target.name)) calc(); });
  calc();

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); formError(form);
    const ok = requireFields(form, [
      ['toCity', (v) => v.length > 0, '도착 도시를 입력해 주세요.'],
      ['fromCity', (v) => v.length > 0, '출발 도시를 입력해 주세요.'],
      ['items', (v) => v.length >= 2, '무엇을 보내는지 짧게 적어 주세요. 통관 가능 여부를 함께 봐 드려요.'],
      ['pieces', (v) => Number.isInteger(num(v)) && num(v) >= 1 && num(v) <= 99, '박스 수는 1~99 사이 숫자로 넣어 주세요.'],
      ['weight', (v) => num(v) > 0 && num(v) <= 1000, '총 무게를 kg 단위로 넣어 주세요(최대 1,000kg).'],
    ]);
    if (!ok) return;
    const el = form.elements;
    const body = { fromCountry: el.fromCountry.value, fromCity: el.fromCity.value.trim(), toCountry: el.toCountry.value, toCity: el.toCity.value.trim(), kind: el.kind.value, items: el.items.value.trim(), pieces: num(el.pieces.value), weight: num(el.weight.value), size: { l: num(el.l.value) || null, w: num(el.w.value) || null, h: num(el.hgt.value) || null }, shipDate: el.date.value || null, memo: el.memo.value.trim() };
    try {
      const r = await busy(form.querySelector('[type="submit"]'), '보내는 중', () => api.createQuote(body));
      mount(root, pageHead('견적 요청'), doneBox('견적 요청을 보냈어요', [`요청 번호 ${r.id}`, '담당 직원이 확인하고 회신하면 내 요청 목록에서 금액과 소요일을 볼 수 있어요.'],
        [h('a', { class: 'btn', href: '#/requests/quote' }, '하나 더 요청'), h('a', { class: 'btn pri', href: '#/requests' }, '내 요청 목록 보기')]));
    } catch (err) { formError(form, err.message); }
  });

  mount(root, pageHead('견적 요청', '구간과 박스 정보만 넣으면 담당 직원이 운임과 소요일을 회신해요.'), form);
}

function pageHead(title, sub) {
  return h('div', { class: 'page-h' }, h('div', null, h('h1', null, title), sub ? h('p', null, sub) : null));
}

// ================= 발송 신청 (4단계) =================
const STEPS = ['보내는 곳·받는 곳', '화물 정보', '서류 첨부', '확인 후 제출'];
const DOC_TYPES = ['상업송장', '포장명세서', '기타 서류'];
const OK_EXT = /\.(pdf|jpe?g|png|xlsx?)$/i;

export function ship(root, { query }) {
  const st = {
    step: 0,
    from: null, to: { name: '', country: 'US', city: '', line: '', zip: '', phone: '', email: '' },
    cargo: { ref: '', service: 'express', items: '', value: '', pickup: '', boxes: [{ w: '', l: '', wd: '', ht: '' }] },
    files: [], quoteId: query.get('quote') || '', addresses: [],
  };
  // 작성 중인 내용은 이 탭에 임시 저장(파일 제외) → 다른 메뉴 갔다 와도, 새로고침해도 이어서 써요
  const DRAFT = 'orm.shipDraft';
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT) || 'null'); if (d && (!st.quoteId || d.quoteId === st.quoteId)) { st.step = Math.min(d.step, 2); st.to = d.to; st.cargo = d.cargo; } } catch { /* 무시 */ }
  const saveDraft = () => { try { sessionStorage.setItem(DRAFT, JSON.stringify({ step: st.step, to: st.to, cargo: st.cargo, quoteId: st.quoteId })); } catch { /* 무시 */ } };
  const wiz = h('ol', { class: 'wiz', 'aria-label': '진행 단계' });
  const body = h('div');
  mount(root, pageHead('발송 신청', st.quoteId ? `견적 ${st.quoteId} 기준으로 신청해요.` : '운송장 발급과 픽업 예약을 요청해요. 제출 뒤 담당 직원이 확인해요.'), wiz, body);

  load(body, async () => {
    const d = await api.me();
    // 견적에서 넘어오면 견적의 도착 국가·박스 수를 미리 채움
    if (st.quoteId && !st.to.city) {
      try {
        const q = await api.getRequest(st.quoteId);
        if (q.route) st.to.country = q.route.to;
        if (q.pieces) st.cargo.boxes = Array.from({ length: q.pieces }, () => ({ w: '', l: '', wd: '', ht: '' }));
      } catch { /* 견적을 못 불러와도 빈 신청서로 진행 */ }
    }
    return d;
  }, (d) => {
    st.addresses = d.addresses; st.from = d.addresses.find((a) => a.kind === 'from') || null;
    queueMicrotask(draw);
    return h('div');
  });

  function draw() {
    saveDraft();
    mount(wiz, STEPS.map((s, i) => h('li', { class: i === st.step ? 'on' : i < st.step ? 'ok' : '', 'aria-current': i === st.step ? 'step' : null }, s)));
    const form = h('form', { class: 'card card-p form', novalidate: true });
    [step1, step2, step3, step4][st.step](form);
    mount(body, form);
  }
  const nav = (form, nextLabel = '다음') => h('div', { class: 'actions' },
    st.step > 0 ? h('button', { class: 'btn ghost', type: 'button', onclick: () => { st.step -= 1; draw(); } }, icon('left', 'i sm'), '이전') : h('a', { class: 'btn ghost', href: '#/shipments' }, '취소'),
    h('button', { class: 'btn pri lg', type: 'submit' }, nextLabel));

  // ---- 1단계
  function step1(form) {
    const t = st.to;
    const pickBtn = h('button', { class: 'btn', type: 'button' }, icon('book', 'i sm'), '주소록에서 불러오기');
    pickBtn.addEventListener('click', () => openPicker(st.addresses.filter((a) => a.kind === 'to'), (a) => { Object.assign(st.to, { name: a.name, country: a.country, city: a.city, line: a.line, phone: a.phone }); draw(); }));
    append(form, 
      h('fieldset', { class: 'fs' }, h('legend', null, '보내는 곳'),
        st.from ? h('div', { class: 'addr' }, h('span', { class: 'ic' }, icon('pin')), h('div', null, h('b', null, st.from.name, h('span', { class: 'def' }, '기본')), `${st.from.city} ${st.from.line} · ${st.from.phone}`))
          : h('p', { class: 'hint' }, '등록된 출고지가 없어요. 담당 직원에게 출고지 등록을 요청해 주세요.')),
      h('fieldset', { class: 'fs' }, h('legend', null, '받는 곳'),
        h('div', null, pickBtn), h('div', { class: 'sp16' }),
        field({ label: '받는 회사·이름', name: 'name', req: true, value: t.name }),
        h('div', { class: 'row-2' }, countrySelect('country', t.country, '국가'), field({ label: '도시', name: 'city', req: true, value: t.city })),
        field({ label: '주소', name: 'line', req: true, value: t.line, help: '영문으로 적어 주세요. 현지 세관과 배달 기사가 읽어요.' }),
        h('div', { class: 'row-2' }, field({ label: '우편번호', name: 'zip', value: t.zip, small: '선택' }), field({ label: '연락처', name: 'phone', type: 'tel', req: true, value: t.phone, help: '국가번호 포함 예: +1 213 000 0000' }))),
      nav(form));
    form.addEventListener('submit', (e) => {
      e.preventDefault(); formError(form);
      if (!st.from) { formError(form, '출고지가 등록돼 있지 않아 신청을 이어 갈 수 없어요. 내 정보의 담당 직원에게 출고지 등록을 요청해 주세요.'); return; }
      const ok = requireFields(form, [
        ['name', (v) => v.length >= 2, '받는 회사나 이름을 입력해 주세요.'],
        ['city', (v) => v.length > 0, '도시를 입력해 주세요.'],
        ['line', (v) => v.length >= 5 && !/[ㄱ-힣]/.test(v), '주소를 영문으로 입력해 주세요.'],
        ['phone', (v) => /^\+?[\d\s-]{7,}$/.test(v), '국가번호를 포함한 연락처를 입력해 주세요.'],
      ]);
      if (!ok) return;
      const el = form.elements; Object.assign(st.to, { name: el.name.value.trim(), country: el.country.value, city: el.city.value.trim(), line: el.line.value.trim(), zip: el.zip.value.trim(), phone: el.phone.value.trim() });
      st.step = 1; draw();
    });
  }

  // ---- 2단계
  function step2(form) {
    const c = st.cargo;
    const boxesWrap = h('div');
    const drawBoxes = () => mount(boxesWrap, c.boxes.map((b, i) => {
      const del = h('button', { class: 'icon-btn del', type: 'button', 'aria-label': `${i + 1}번 박스 지우기`, disabled: c.boxes.length === 1 }, icon('x'));
      del.addEventListener('click', () => { saveBoxes(); c.boxes.splice(i, 1); drawBoxes(); });
      return h('div', { class: 'pkg', dataset: { i } },
        field({ label: `${i + 1}번 무게(kg)`, name: `bw${i}`, type: 'number', value: b.w, attrs: { min: 0.1, step: 0.1, inputmode: 'decimal' } }),
        field({ label: '가로(cm)', name: `bl${i}`, type: 'number', value: b.l, attrs: { inputmode: 'numeric' } }),
        field({ label: '세로(cm)', name: `bd${i}`, type: 'number', value: b.wd, attrs: { inputmode: 'numeric' } }),
        field({ label: '높이(cm)', name: `bh${i}`, type: 'number', value: b.ht, attrs: { inputmode: 'numeric' } }),
        h('span', { class: 'help' }, ''), del);
    }));
    const saveBoxes = () => { c.boxes = c.boxes.map((b, i) => ({ w: form.elements[`bw${i}`].value, l: form.elements[`bl${i}`].value, wd: form.elements[`bd${i}`].value, ht: form.elements[`bh${i}`].value })); };
    const addBtn = h('button', { class: 'btn', type: 'button' }, icon('plus', 'i sm'), '박스 추가');
    addBtn.addEventListener('click', () => { saveBoxes(); if (c.boxes.length >= 20) { toast('한 번에 20박스까지 신청할 수 있어요.'); return; } c.boxes.push({ w: '', l: '', wd: '', ht: '' }); drawBoxes(); });
    drawBoxes();
    append(form, 
      h('fieldset', { class: 'fs' }, h('legend', null, '서비스'),
        h('div', { class: 'radio-cards', role: 'radiogroup', 'aria-label': '서비스' },
          [['express', '익스프레스', '보통 2~4일'], ['economy', '이코노미', '보통 5~8일']].map(([v, t, d]) => h('label', { class: 'rc' }, h('input', { type: 'radio', name: 'service', value: v, checked: c.service === v }), h('b', null, t), h('span', null, d))))),
      h('fieldset', { class: 'fs' }, h('legend', null, '박스'), h('p', { class: 'hint' }, '박스마다 무게는 꼭 넣어 주세요. 크기는 부피 무게 계산에 쓰여요. 크기를 모르면 비워 두시면 담당 직원이 확인 연락을 드려요.'), boxesWrap, h('div', { class: 'stack-16' }, addBtn)),
      h('fieldset', { class: 'fs' }, h('legend', null, '내용물과 신고 금액'),
        field({ label: '품목 설명 (영문)', name: 'items', req: true, value: c.items, attrs: { placeholder: 'e.g. Skin care products (toner, cream) 120 pcs' } }),
        h('div', { class: 'row-2' }, field({ label: '신고 금액', name: 'value', type: 'number', req: true, small: 'USD', value: c.value, attrs: { min: 1, inputmode: 'decimal' } }), field({ label: '주문번호(참조)', name: 'ref', small: '선택', value: c.ref, help: '목록에서 이 번호로 찾을 수 있어요.' })),
        field({ label: '픽업 희망일', name: 'pickup', type: 'date', value: c.pickup, attrs: { min: '2026-10-28' } })),
      nav(form));
    form.addEventListener('submit', (e) => {
      e.preventDefault(); saveBoxes(); formError(form);
      let ok = requireFields(form, [
        ['items', (v) => v.length >= 3 && !/[ㄱ-힣]/.test(v), '품목 설명을 영문으로 적어 주세요. 세관 신고에 그대로 쓰여요.'],
        ['value', (v) => num(v) > 0, '신고 금액을 USD로 넣어 주세요.'],
      ]);
      c.boxes.forEach((b, i) => {
        const el = form.elements[`bw${i}`];
        const bad = !(num(b.w) > 0 && num(b.w) <= 300);
        fieldError(el, bad ? (b.w === '' ? '무게를 넣어 주세요' : '0.1~300kg') : null); if (bad) ok = false;
      });
      if (!ok) return;
      const el = form.elements; Object.assign(c, { service: el.service.value, items: el.items.value.trim(), value: el.value.value, ref: el.ref.value.trim(), pickup: el.pickup.value });
      st.step = 2; draw();
    });
  }

  // ---- 3단계
  function step3(form) {
    const input = h('input', { type: 'file', multiple: true, accept: '.pdf,.jpg,.jpeg,.png,.xls,.xlsx', id: 'up' });
    const drop = h('label', { class: 'drop', for: 'up' }, icon('upload'), h('b', null, '파일을 끌어다 놓거나 눌러서 고르기'), h('span', null, 'PDF·JPG·PNG·엑셀 · 파일당 10MB까지'), input);
    const list = h('ul', { class: 'files' });
    const drawList = () => mount(list, st.files.map((f, i) => {
      const sel = h('select', { class: 'select', 'aria-label': `${f.file.name} 서류 종류` }, DOC_TYPES.map((t) => h('option', { value: t }, t)));
      sel.value = f.type; sel.addEventListener('change', () => { f.type = sel.value; });
      const rm = h('button', { class: 'icon-btn', type: 'button', 'aria-label': `${f.file.name} 빼기` }, icon('x'));
      rm.addEventListener('click', () => { st.files.splice(i, 1); drawList(); });
      return h('li', { class: f.error ? 'bad' : null }, icon('doc'), h('span', { class: 'nm' }, f.file.name, f.error ? h('span', { class: 'err' }, f.error) : null), f.error ? null : sel, rm);
    }));
    const addFiles = (fl) => {
      [...fl].forEach((file) => {
        let error = null;
        if (!OK_EXT.test(file.name)) error = '이 형식은 올릴 수 없어요';
        else if (file.size > 10 * 1024 * 1024) error = '10MB를 넘어요';
        const guess = /invoice|송장|ci/i.test(file.name) ? '상업송장' : /pack|명세|pl/i.test(file.name) ? '포장명세서' : '기타 서류';
        st.files.push({ file, type: guess, error });
      });
      drawList();
    };
    input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
    drop.addEventListener('drop', (e) => addFiles(e.dataTransfer.files));
    const demoBtn = h('button', { class: 'btn ghost', type: 'button' }, '데모: 예시 파일 2개 넣기');
    demoBtn.addEventListener('click', () => addFiles([new File(['%PDF-1.4 demo'], 'Commercial_Invoice_PO24130.pdf', { type: 'application/pdf' }), new File(['demo'], 'Packing_List_PO24130.xlsx', { type: 'application/vnd.ms-excel' })]));
    drawList();
    append(form, h('fieldset', { class: 'fs' }, h('legend', null, '서류 첨부'), h('p', { class: 'hint' }, '상업송장은 꼭 필요해요. 포장명세서가 있으면 통관이 빨라져요.'), drop, list, h('div', { class: 'stack-16' }, demoBtn)), nav(form));
    form.addEventListener('submit', (e) => {
      e.preventDefault(); formError(form);
      if (st.files.some((f) => f.error)) { formError(form, '올릴 수 없는 파일이 있어요. 빨간 줄의 파일을 빼 주세요.'); return; }
      if (!st.files.some((f) => f.type === '상업송장')) { formError(form, '상업송장을 첨부하고 종류를 ‘상업송장’으로 골라 주세요.'); return; }
      st.step = 3; draw();
    });
  }

  // ---- 4단계
  function step4(form) {
    const c = st.cargo; const t = st.to;
    const tw = c.boxes.reduce((s, b) => s + (num(b.w) || 0), 0);
    const sec = (title, step, rows) => h('div', { class: 'sec' }, h('h3', null, title, h('button', { class: 'btn ghost', type: 'button', onclick: () => { st.step = step; draw(); } }, '수정')), h('dl', { class: 'kv' }, rows.map(([k, v]) => [h('dt', null, k), h('dd', null, v || '—')])));
    const agree = h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'agree' }), h('span', null, '신고 내용과 첨부 서류가 실제 화물과 같아요. 다르면 통관이 늦어지거나 반송될 수 있어요.'));
    append(form, h('div', { class: 'review' },
      sec('받는 곳', 0, [['회사·이름', t.name], ['주소', `${t.line}, ${t.city} ${t.zip}`], ['국가', cname(t.country)], ['연락처', t.phone]]),
      sec('화물', 1, [['서비스', c.service === 'express' ? '익스프레스' : '이코노미'], ['박스', `${c.boxes.length}박스${tw ? ` · ${kg(tw)}` : ''}`], ['품목', c.items], ['신고 금액', `USD ${num(c.value).toLocaleString('en-US')}`], ['주문번호', c.ref], ['픽업 희망일', c.pickup]]),
      sec('서류', 2, [['첨부', st.files.map((f) => `${f.type}: ${f.file.name}`).join(' / ')]])),
      agree, nav(form, '발송 신청 제출'));
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); formError(form);
      if (!form.elements.agree.checked) { formError(form, '마지막 확인 항목에 체크해 주세요.'); return; }
      const fd = new FormData();
      fd.append('data', JSON.stringify({ from: st.from && st.from.id, to: st.to, cargo: st.cargo, quoteId: st.quoteId || null }));
      st.files.forEach((f) => { fd.append('files', f.file); fd.append('fileTypes', f.type); });
      const summary = `김포 → ${t.city} · ${c.ref || c.boxes.length + '박스'}`;
      try {
        const r = await busy(form.querySelector('[type="submit"]'), '제출 중', () => api.createShipRequest(fd, summary));
        try { sessionStorage.removeItem(DRAFT); } catch { /* 무시 */ }
        mount(wiz);
        mount(body, doneBox('발송 신청을 접수했어요', [`신청 번호 ${r.id}`, '담당 직원이 서류를 확인하고 운송장을 발급하면 내 화물 목록에 나타나요.'],
          [h('a', { class: 'btn', href: '#/shipments' }, '내 화물'), h('a', { class: 'btn pri', href: '#/requests' }, '내 요청 목록 보기')]));
      } catch (err) { formError(form, err.message); }
    });
  }
}

function openPicker(addrs, onPick) {
  let close = () => {};
  const panel = h('div', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pk-h' },
    h('div', { class: 'drawer-h' }, h('h2', { id: 'pk-h' }, '주소록'), h('button', { class: 'icon-btn', type: 'button', 'aria-label': '닫기', onclick: () => close() }, icon('x'))),
    h('div', { class: 'drawer-b' }, addrs.length
      ? h('ul', { class: 'pick' }, addrs.map((a) => h('li', null, h('button', { type: 'button', onclick: () => { close(); onPick(a); } }, h('b', null, `${a.label} · ${a.name}`), `${a.line}, ${a.city} (${cname(a.country)})`))))
      : emptyState({ title: '저장된 주소가 없어요', text: '자주 보내는 곳은 담당 직원에게 말씀하시면 주소록에 넣어 드려요.' })));
  close = openModal(panel);
}

// ================= 내 요청 목록 =================
export function list(root, { query }) {
  const st = { kind: query.get('kind') || '', status: query.get('status') || '' };
  const chips = h('div', { class: 'seg', role: 'group', 'aria-label': '종류' });
  const sel = h('select', { class: 'select', 'aria-label': '처리 상태' }, [['', '모든 상태'], ['open', '처리 중'], ['done', '처리 완료']].map(([v, t]) => h('option', { value: v }, t)));
  sel.value = st.status;
  const body = h('div');
  mount(root,
    h('div', { class: 'page-h' }, h('div', null, h('h1', null, '내 요청 목록'), h('p', null, '견적 요청과 발송 신청이 어디까지 처리됐는지 보여요.')),
      h('div', { class: 'seg' }, h('a', { class: 'btn', href: '#/requests/quote' }, '견적 요청'), h('a', { class: 'btn pri', href: '#/requests/ship' }, '발송 신청'))),
    h('section', { class: 'card' }, h('div', { class: 'filters' }, chips, sel), body));
  sel.addEventListener('change', () => { st.status = sel.value; refresh(); });
  const drawChips = () => mount(chips, [['', '전체'], ['quote', '견적'], ['ship', '발송']].map(([v, t]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(st.kind === v), onclick: () => { st.kind = v; refresh(); } }, t)));

  let seq = 0;
  async function refresh() {
    const my = ++seq;
    drawChips();
    const p = new URLSearchParams(); if (st.kind) p.set('kind', st.kind); if (st.status) p.set('status', st.status);
    history.replaceState(null, '', '#/requests' + (p.toString() ? '?' + p : ''));
    mount(body, skeletonRows(4));
    try {
      const d = await api.listRequests(st);
      if (my !== seq || !body.isConnected) return;
      if (!d.items.length) {
        mount(body, emptyState(st.kind || st.status
          ? { title: '조건에 맞는 요청이 없어요', text: '종류나 상태를 바꿔 보세요.', action: h('button', { class: 'btn', type: 'button', onclick: () => { st.kind = ''; st.status = ''; sel.value = ''; refresh(); } }, '전체 보기') }
          : { title: '아직 보낸 요청이 없어요', text: '견적을 먼저 받아 보거나, 바로 발송 신청을 할 수 있어요.', action: h('a', { class: 'btn pri', href: '#/requests/quote' }, '견적 요청하기') }));
        return;
      }
      mount(body, reqTable(d.items), reqMobile(d.items));
    } catch (e) { if (my === seq) mount(body, errorState(e, refresh)); }
  }
  refresh();
}

const KIND = { quote: '견적', ship: '발송' };
function reqTable(items) {
  return h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' },
    h('thead', null, h('tr', null, ['요청 번호', '종류', '내용', '요청 시각', '상태'].map((t) => h('th', { scope: 'col' }, t)))),
    h('tbody', null, items.map((r) => {
      const tr = h('tr', null,
        h('td', null, h('a', { class: 'rowlink mono', href: '#', onclick: (e) => { e.preventDefault(); openReq(r.id); } }, r.id)),
        h('td', null, KIND[r.kind]),
        h('td', null, r.title, r.status === 'needs_fix' ? h('span', { class: 'act-line' }, '보완 요청 — 눌러서 내용 확인') : null),
        h('td', { class: 'num' }, r.createdAt.slice(5).replace('-', '/')),
        h('td', null, badge(REQ_STATUS, r.status)));
      tr.addEventListener('click', (e) => { if (e.target.closest('a')) return; openReq(r.id); });
      return tr;
    }))));
}
function reqMobile(items) {
  return h('ul', { class: 'list-m' }, items.map((r) => h('li', null, h('a', { href: '#', onclick: (e) => { e.preventDefault(); openReq(r.id); } },
    h('div', { class: 'top' }, h('b', null, `${KIND[r.kind]} · ${r.title}`), badge(REQ_STATUS, r.status)),
    r.status === 'needs_fix' ? h('span', { class: 'act-line' }, '보완 요청 — 눌러서 내용 확인') : null,
    h('div', { class: 'meta' }, h('span', { class: 'mono' }, r.id), h('span', { class: 'num' }, r.createdAt.slice(5).replace('-', '/')))))));
}

function openReq(id) {
  let close = () => {};
  const b = h('div', { class: 'drawer-b' });
  const foot = h('div', { class: 'drawer-f', hidden: true });
  const panel = h('div', { class: 'drawer', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'rq-h' },
    h('div', { class: 'drawer-h' }, h('h2', { id: 'rq-h' }, '요청 상세'), h('button', { class: 'icon-btn', type: 'button', 'aria-label': '닫기', onclick: () => close() }, icon('x'))), b, foot);
  close = openModal(panel);
  load(b, () => api.getRequest(id), (r) => {
    mount(foot);
    if (r.kind === 'quote' && r.status === 'answered') { append(foot, h('a', { class: 'btn pri lg', href: `#/requests/ship?quote=${r.id}` }, '이 견적으로 발송 신청')); foot.hidden = false; }
    else if (r.shipmentId) { append(foot, h('a', { class: 'btn pri lg', href: `#/shipments/${r.shipmentId}` }, '화물 보기')); foot.hidden = false; }
    else if (r.status === 'needs_fix') { append(foot, h('a', { class: 'btn pri lg', href: '#/requests/ship' }, '발송 신청 새로 쓰기')); foot.hidden = false; }
    return h('div', null,
      h('div', { class: 'between' }, h('span', { class: 'mono mut' }, r.id), badge(REQ_STATUS, r.status)),
      h('h3', { class: 'h2' }, `${KIND[r.kind]} · ${r.title}`),
      r.fix ? h('div', { class: 'callout' }, icon('alert'), h('div', null, h('b', null, '보완이 필요해요'), h('p', null, r.fix))) : null,
      r.reply ? h('div', { class: 'reply' }, h('span', { class: 'mut' }, '회신 운임'), h('div', { class: 'amt' }, won(r.reply.amount)), h('dl', { class: 'kv' }, h('dt', null, '소요일'), h('dd', null, r.reply.transit), h('dt', null, '유효기간'), h('dd', null, `${r.reply.validUntil}까지`), h('dt', null, '조건'), h('dd', null, r.reply.note))) : null,
      r.awb ? h('p', null, '운송장 ', h('span', { class: 'mono' }, r.awb)) : null,
      h('ul', { class: 'hist', 'aria-label': '처리 이력' }, r.history.slice().reverse().map(([t, s]) => h('li', null, h('time', null, t.slice(5)), h('span', null, s)))));
  });
}
