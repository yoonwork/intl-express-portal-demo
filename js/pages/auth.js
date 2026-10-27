// 계정 화면: 로그인 · 초대 수락 · 비밀번호 재설정(요청/변경)
// 인증 처리 자체는 의뢰인 서버(API)가 해요. 이 화면은 값 검사·오류 표시·이동만 맡아요.
import { api } from '../api.js';
import { h, icon, mount, field, fieldError, formError, busy, load, skeletonBlock, route , append } from '../ui.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function frame(root, formNode) {
  const markSvg = () => {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', 'M5 16.5l7-9 7 9'); s.append(p); return s;
  };
  mount(root, h('div', { class: 'auth' },
    h('div', { class: 'auth-l' },
      h('a', { class: 'logo', href: '#/login' }, h('span', { class: 'mk' }, markSvg()), h('span', null, '오름익스프레스', h('small', null, '고객 포털'))),
      formNode,
      h('p', { class: 'auth-foot' }, '계정은 담당 직원의 초대로만 만들어져요. 초대 메일이 안 왔다면 담당 직원에게 알려 주세요.')),
    h('aside', { class: 'auth-r', 'aria-label': '포털 미리보기' }, preview())));
}

// 오른쪽: 로그인하면 보게 될 실제 화면 조각(장식 그림 대신)
function preview() {
  const steps = ['접수', '출고', '운송 중', '통관', '배달 완료'];
  return h('div', { class: 'preview' },
    h('p', { class: 'cap' }, '로그인하면 우리 회사 화물만 모아서 보여요'),
    h('div', { class: 'card' },
      h('div', { class: 'card-h' }, h('span', { class: 'mono' }, '7342 1186 05'), h('span', { class: 'badge b-act' }, '조치 필요')),
      h('div', { class: 'card-p' },
        route({ city: '김포', country: 'KR' }, { city: 'Los Angeles', country: 'US' }),
        h('ol', { class: 'steps', 'aria-label': '진행 단계' }, steps.map((s, i) => h('li', { class: i < 3 ? 'done' : i === 3 ? 'now act' : '' }, s))),
        h('div', { class: 'callout' }, icon('alert'), h('div', null, h('b', null, '상업송장을 다시 올려 주세요'), h('p', null, '품목 3번의 단가와 HS 코드가 비어 있어요.'))))),
    h('div', { class: 'card' },
      h('ul', { class: 'docs' },
        h('li', null, h('span', { class: 'fi' }, icon('doc')), h('span', { class: 'nm' }, h('b', null, '운임 청구서 · 2026년 10월'), h('span', null, 'PDF · 71KB')), icon('download')))));
}

export function login(root, { query }) {
  const form = h('form', { class: 'auth-form', novalidate: true });
  const email = field({ label: '이메일', name: 'email', type: 'email', req: true, attrs: { autocomplete: 'username', inputmode: 'email' } });
  const pw = field({ label: '비밀번호', name: 'password', type: 'password', req: true, attrs: { autocomplete: 'current-password' } });
  const submit = h('button', { class: 'btn pri lg block', type: 'submit' }, '로그인');
  const demo = h('button', { class: 'btn block', type: 'button' }, '데모 계정 값 채우기');
  append(form, 
    h('h1', null, '고객 포털 로그인'),
    h('p', { class: 'lead' }, '화물 위치, 서류, 견적·발송 요청을 한곳에서 확인하세요.'),
    query.get('expired') ? h('div', { class: 'invite-box', role: 'status' }, '로그인 시간이 지나 다시 로그인이 필요해요.') : null,
    email, pw, submit,
    h('div', { class: 'links' }, h('a', { href: '#/reset' }, '비밀번호를 잊었어요'), h('a', { href: '#/invite?token=demo' }, '초대 메일을 받았어요')),
    h('div', { class: 'stack-16' }, h('p', { class: 'help' }, '데모: 아무 이메일 + 8자 이상 비밀번호면 들어가요. 8자 미만이면 로그인 실패 화면이 나와요.'), demo));
  const $e = form.elements.email; const $p = form.elements.password;
  demo.addEventListener('click', () => { $e.value = 'seoyeon.kim@example.com'; $p.value = 'demo-portal-2026'; fieldError($e); fieldError($p); submit.focus(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); formError(form);
    let bad = false;
    if (!EMAIL.test($e.value.trim())) { fieldError($e, $e.value ? '이메일 형식을 확인해 주세요. 예: name@company.com' : '이메일을 입력해 주세요.'); bad = true; } else fieldError($e);
    if (!$p.value) { fieldError($p, '비밀번호를 입력해 주세요.'); bad = true; } else fieldError($p);
    if (bad) { form.querySelector('[aria-invalid="true"]').focus(); return; }
    try {
      await busy(submit, '확인 중', () => api.login($e.value.trim(), $p.value));
      location.hash = '#/shipments';
    } catch (err) { formError(form, err.message); $p.value = ''; }
  });
  frame(root, form);
}

function pwRules(input) {
  const rules = [['len', '8자 이상', (v) => v.length >= 8], ['mix', '영문과 숫자를 함께', (v) => /[a-z]/i.test(v) && /\d/.test(v)], ['sp', '공백 없이', (v) => v.length > 0 && !/\s/.test(v)]];
  const list = h('ul', { class: 'pw-rules', 'aria-live': 'polite' }, rules.map(([k, t]) => h('li', { dataset: { k } }, icon('check', 'i sm'), t)));
  const check = () => rules.every(([k, , f]) => { const ok = f(input.value); list.querySelector(`[data-k="${k}"]`).classList.toggle('ok', ok); return ok; });
  input.addEventListener('input', check);
  return { list, check };
}

export function invite(root, { query }) {
  const token = query.get('token') || '';
  const box = h('div', { class: 'auth-form' });
  frame(root, box);
  load(box, () => api.getInvite(token), (inv) => {
    const form = h('form', { novalidate: true });
    const name = field({ label: '이름', name: 'name', req: true, attrs: { autocomplete: 'name' } });
    const mail = field({ label: '이메일 (로그인 아이디)', name: 'email', value: inv.email, attrs: { readonly: true } });
    const pw = field({ label: '비밀번호', name: 'password', type: 'password', req: true, attrs: { autocomplete: 'new-password' } });
    const pw2 = field({ label: '비밀번호 확인', name: 'password2', type: 'password', req: true, attrs: { autocomplete: 'new-password' } });
    const rules = pwRules(pw.querySelector('input'));
    pw.append(rules.list);
    const agree = h('label', { class: 'check' }, h('input', { type: 'checkbox', name: 'agree' }), h('span', null, '[필수] 서비스 이용약관과 개인정보 처리방침에 동의해요'));
    const submit = h('button', { class: 'btn pri lg block', type: 'submit' }, '초대 수락하고 시작하기');
    append(form, name, mail, pw, pw2, agree, h('div', { class: 'stack-16' }, submit));
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); formError(form);
      const el = form.elements; let bad = false;
      if (!el.name.value.trim()) { fieldError(el.name, '이름을 입력해 주세요.'); bad = true; } else fieldError(el.name);
      if (!rules.check()) { fieldError(el.password, '아래 조건을 모두 맞춰 주세요.'); bad = true; } else fieldError(el.password);
      if (el.password2.value !== el.password.value || !el.password2.value) { fieldError(el.password2, '위 비밀번호와 똑같이 입력해 주세요.'); bad = true; } else fieldError(el.password2);
      if (!el.agree.checked) { formError(form, '약관 동의가 필요해요.'); bad = true; }
      if (bad) return;
      try {
        await busy(submit, '처리 중', () => api.acceptInvite(token, { name: el.name.value.trim(), password: el.password.value, agree: true }));
        mount(box, h('div', { class: 'done-box' }, h('div', { class: 'ic' }, icon('check')), h('h2', null, '계정이 만들어졌어요'), h('p', null, '방금 정한 비밀번호로 로그인해 주세요.'), h('div', { class: 'btns' }, h('a', { class: 'btn pri lg', href: '#/login' }, '로그인하러 가기'))));
      } catch (err) { formError(form, err.message); }
    });
    return h('div', null,
      h('h1', null, '고객 포털 초대'),
      h('p', { class: 'lead' }, `${inv.company} 담당자로 초대받으셨어요.`),
      h('div', { class: 'invite-box' }, `초대한 사람: ${inv.inviter} · 링크 유효기간 ${inv.expiresAt}까지`),
      form,
      h('p', { class: 'help' }, '데모: 만료된 초대 화면은 ', h('a', { href: '#/invite?token=expired' }, '여기'), '서 볼 수 있어요.'));
  }, {
    skeleton: skeletonBlock,
  }).then(() => {
    // 만료·잘못된 링크는 일반 오류 대신 다음 행동을 알려 줘요
    const err = box.querySelector('.state.is-err');
    if (err && token === 'expired') {
      mount(box, h('div', { class: 'state is-err', role: 'alert' }, h('div', { class: 'ic' }, icon('alert')), h('h3', null, '초대 링크가 만료됐어요'), h('p', null, '초대 링크는 7일 동안만 쓸 수 있어요. 담당 직원에게 초대 메일을 다시 보내 달라고 해 주세요.'), h('a', { class: 'btn', href: '#/login' }, '로그인 화면으로')));
    }
  });
}

export function resetRequest(root) {
  const form = h('form', { class: 'auth-form', novalidate: true });
  const email = field({ label: '가입한 이메일', name: 'email', type: 'email', req: true, attrs: { autocomplete: 'username', inputmode: 'email' } });
  const submit = h('button', { class: 'btn pri lg block', type: 'submit' }, '재설정 메일 받기');
  append(form, h('a', { class: 'crumb', href: '#/login' }, icon('left', 'i sm'), '로그인'), h('h1', null, '비밀번호 재설정'), h('p', { class: 'lead' }, '가입한 이메일로 비밀번호를 바꿀 수 있는 링크를 보내 드려요. 링크는 30분 동안 쓸 수 있어요.'), email, submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); formError(form);
    const $e = form.elements.email;
    if (!EMAIL.test($e.value.trim())) { fieldError($e, '이메일 형식을 확인해 주세요.'); $e.focus(); return; }
    fieldError($e);
    try {
      await busy(submit, '보내는 중', () => api.requestReset($e.value.trim()));
      // 가입 여부를 알려 주지 않도록 항상 같은 문장
      mount(form, h('div', { class: 'done-box' }, h('div', { class: 'ic' }, icon('send')), h('h2', null, '메일을 확인해 주세요'), h('p', null, `${$e.value.trim()} 로 가입된 계정이 있으면 재설정 링크가 도착해요.`), h('p', { class: 'mut' }, '몇 분 안에 안 오면 스팸함도 확인해 주세요.'),
        h('div', { class: 'btns' }, h('a', { class: 'btn', href: '#/login' }, '로그인으로'), h('a', { class: 'btn pri', href: '#/reset/new?token=demo' }, '데모: 메일 속 링크 열기'))));
    } catch (err) { formError(form, err.message); }
  });
  frame(root, form);
}

export function resetNew(root, { query }) {
  const token = query.get('token') || '';
  const form = h('form', { class: 'auth-form', novalidate: true });
  const pw = field({ label: '새 비밀번호', name: 'password', type: 'password', req: true, attrs: { autocomplete: 'new-password' } });
  const pw2 = field({ label: '새 비밀번호 확인', name: 'password2', type: 'password', req: true, attrs: { autocomplete: 'new-password' } });
  const rules = pwRules(pw.querySelector('input')); pw.append(rules.list);
  const submit = h('button', { class: 'btn pri lg block', type: 'submit' }, '비밀번호 바꾸기');
  append(form, h('h1', null, '새 비밀번호 정하기'), h('p', { class: 'lead' }, '바꾸면 다른 기기에서는 로그아웃돼요.'), pw, pw2, submit);
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); formError(form);
    const el = form.elements; let bad = false;
    if (!rules.check()) { fieldError(el.password, '아래 조건을 모두 맞춰 주세요.'); bad = true; } else fieldError(el.password);
    if (el.password2.value !== el.password.value || !el.password2.value) { fieldError(el.password2, '위 비밀번호와 똑같이 입력해 주세요.'); bad = true; } else fieldError(el.password2);
    if (bad) return;
    try {
      await busy(submit, '바꾸는 중', () => api.confirmReset(token, el.password.value));
      mount(form, h('div', { class: 'done-box' }, h('div', { class: 'ic' }, icon('check')), h('h2', null, '비밀번호를 바꿨어요'), h('p', null, '새 비밀번호로 로그인해 주세요.'), h('div', { class: 'btns' }, h('a', { class: 'btn pri lg', href: '#/login' }, '로그인하러 가기'))));
    } catch (err) { formError(form, err.message); }
  });
  frame(root, form);
}
