// 내 정보: 고객 정보 조회(읽기 전용) + 주소록 + 담당 직원
// 정보 수정은 공고 범위 밖이라 '담당 직원에게 요청'으로 안내해요.
import { api } from '../api.js';
import { h, icon, mount, load, skeletonBlock, cname , append } from '../ui.js';

export function page(root) {
  const box = h('div');
  mount(root, h('div', { class: 'page-h' }, h('div', null, h('h1', null, '내 정보'), h('p', null, '회사·담당자 정보는 오름익스프레스에 등록된 내용이에요.'))), box);
  load(box, () => api.me(), ({ me, addresses }) => h('div', { class: 'grid-side' },
    h('div', { class: 'stack-16' },
      h('section', { class: 'card', 'aria-labelledby': 'h-co' },
        h('div', { class: 'card-h' }, h('h2', { id: 'h-co' }, '회사 정보'), h('span', { class: 'mut mono' }, me.customerNo)),
        h('div', { class: 'card-p' }, h('dl', { class: 'kv' },
          h('dt', null, '회사명'), h('dd', null, me.company),
          h('dt', null, '사업자번호'), h('dd', { class: 'num' }, me.bizNo),
          h('dt', null, '이용 시작'), h('dd', { class: 'num' }, me.joinedAt)))),
      h('section', { class: 'card', 'aria-labelledby': 'h-me' },
        h('div', { class: 'card-h' }, h('h2', { id: 'h-me' }, '로그인한 담당자'), h('a', { class: 'btn', href: '#/reset' }, '비밀번호 바꾸기')),
        h('div', { class: 'card-p' }, h('dl', { class: 'kv' },
          h('dt', null, '이름'), h('dd', null, `${me.name} · ${me.title}`),
          h('dt', null, '이메일'), h('dd', null, me.email),
          h('dt', null, '휴대폰'), h('dd', { class: 'num' }, me.phone),
          h('dt', null, '권한'), h('dd', null, me.role)),
          h('p', { class: 'help' }, '정보가 바뀌었으면 담당 직원에게 알려 주세요. 바로 고쳐 드려요.'))),
      h('section', { class: 'card', 'aria-labelledby': 'h-ad' },
        h('div', { class: 'card-h' }, h('h2', { id: 'h-ad' }, '주소록'), h('span', { class: 'mut num' }, `${addresses.length}곳`)),
        addresses.length
          ? h('div', null, addresses.map((a) => h('div', { class: 'addr' }, h('span', { class: 'ic' }, icon('pin')),
            h('div', null, h('b', null, `${a.label} · ${a.name}`, a.isDefault ? h('span', { class: 'def' }, '기본 출고지') : null), `${a.line}, ${a.city} (${cname(a.country)}) · ${a.phone}`))))
          : h('div', { class: 'state' }, h('h3', null, '저장된 주소가 없어요'), h('p', null, '발송 신청 때 쓴 받는 곳을 담당 직원이 주소록에 넣어 드려요.')))),
    h('section', { class: 'card card-p', id: 'manager', 'aria-labelledby': 'h-mg' },
      h('h2', { class: 'h2', id: 'h-mg' }, '담당 직원'),
      h('div', { class: 'sp16' }), h('div', { class: 'party' }, h('b', null, me.manager.name), h('span', { class: 'mut' }, me.manager.team)), h('div', { class: 'sp16' }),
      h('dl', { class: 'kv' }, h('dt', null, '전화'), h('dd', { class: 'num' }, me.manager.phone), h('dt', null, '이메일'), h('dd', null, me.manager.email), h('dt', null, '응대 시간'), h('dd', null, '평일 9:00~18:00'))),
  ), { skeleton: skeletonBlock });
}
