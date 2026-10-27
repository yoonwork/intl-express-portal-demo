// 가짜 서버 (데모 전용). 실제 운영에서는 이 파일을 쓰지 않아요.
// 모양은 API_연결표.md 의 응답 예시와 같아요 — 서버가 이 모양으로 주면 화면은 그대로 붙어요.

const ev = (t, loc, text, act = false) => ({ time: t, location: loc, text, actionRequired: act });

export const ME = {
  customerNo: 'C-20418',
  company: '한결코스메틱(가상)',
  bizNo: '123-45-*****',
  name: '김서연',
  title: '수출 담당',
  email: 'seoyeon.kim@example.com',
  phone: '010-****-4821',
  role: '담당자',
  joinedAt: '2026-09-02',
  manager: { name: '박도윤', team: '고객지원팀', email: 'cs@example.com', phone: '02-0000-0000' },
};

export const ADDRESSES = [
  { id: 'a1', label: '본사 출고지', name: '한결코스메틱 물류팀', country: 'KR', city: '경기 김포시', line: '고촌읍 아라육로 000, 2동', phone: '031-000-0000', isDefault: true, kind: 'from' },
  { id: 'a2', label: '미국 거래처', name: 'Brightline Trading LLC', country: 'US', city: 'Los Angeles, CA', line: '1200 S Alameda St, Unit 4', phone: '+1 213-000-0000', kind: 'to' },
  { id: 'a3', label: '일본 거래처', name: '株式会社ミナト商事', country: 'JP', city: 'Tokyo', line: 'Koto-ku Shinkiba 2-0-0', phone: '+81 3-0000-0000', kind: 'to' },
  { id: 'a4', label: '베트남 대리점', name: 'Sao Mai Beauty Co.', country: 'VN', city: 'Ho Chi Minh', line: '12 Nguyen Hue, District 1', phone: '+84 28-0000-0000', kind: 'to' },
];

const C = { KR: '대한민국', US: '미국', JP: '일본', VN: '베트남', DE: '독일', AU: '호주', SG: '싱가포르', CN: '중국', CA: '캐나다', GB: '영국' };
export const COUNTRY = C;

const docsBase = (awb, extra = []) => [
  { id: awb + '-awb', type: '운송장(AWB)', name: `AWB_${awb.replace(/\s/g, '')}.pdf`, size: '84KB', date: '' },
  { id: awb + '-ci', type: '상업송장', name: 'Commercial_Invoice.pdf', size: '212KB', date: '' },
  ...extra,
];

// status: booked 접수 / picked 출고 / transit 운송 중 / customs 통관 / delivered 배달 완료 / exception 조치 필요
export const SHIPMENTS = [
  {
    id: 's01', awb: '7342 1186 05', ref: 'PO-24117', from: { city: '김포', country: 'KR' }, to: { city: 'Los Angeles', country: 'US' },
    consignee: 'Brightline Trading LLC', pieces: 3, weight: 18.4, service: '익스프레스', createdAt: '2026-10-23', eta: '2026-10-28',
    status: 'exception', step: 3, subText: '통관 보류 — 상업송장 보완 필요',
    action: { title: '상업송장을 다시 올려 주세요', text: '미국 세관에서 품목 3번(토너 200ml)의 단가와 HS 코드가 비어 있다고 알려 왔어요. 고친 송장을 올려 주시면 담당 직원이 바로 다시 신고해요.', doc: '상업송장(수정본)' },
    events: [
      ev('2026-10-26 22:40', 'Los Angeles, US', '통관 보류 — 상업송장 정보 보완 요청', true),
      ev('2026-10-26 19:05', 'Los Angeles, US', '도착 공항 하기 완료'),
      ev('2026-10-25 14:10', '인천공항, KR', '항공기 출발'),
      ev('2026-10-24 21:30', '인천공항, KR', '수출 신고 수리'),
      ev('2026-10-24 10:12', '김포, KR', '화물 픽업 완료'),
      ev('2026-10-23 16:48', '온라인', '발송 신청 접수'),
    ],
    docs: docsBase('7342 1186 05', [{ id: 's01-pl', type: '포장명세서', name: 'Packing_List.xlsx', size: '38KB', date: '' }, { id: 's01-ex', type: '수출신고필증', name: '수출신고필증_24117.pdf', size: '156KB', date: '' }]),
  },
  {
    id: 's02', awb: '7342 1190 22', ref: 'PO-24121', from: { city: '김포', country: 'KR' }, to: { city: 'Tokyo', country: 'JP' },
    consignee: '株式会社ミナト商事', pieces: 2, weight: 9.6, service: '익스프레스', createdAt: '2026-10-25', eta: '2026-10-28',
    status: 'customs', step: 3, subText: '도착국 통관 진행 중',
    events: [ev('2026-10-27 09:20', 'Tokyo, JP', '수입 통관 진행 중'), ev('2026-10-26 23:55', 'Narita, JP', '도착 공항 하기 완료'), ev('2026-10-26 18:10', '인천공항, KR', '항공기 출발'), ev('2026-10-25 15:02', '김포, KR', '화물 픽업 완료'), ev('2026-10-25 09:40', '온라인', '발송 신청 접수')],
    docs: docsBase('7342 1190 22'),
  },
  {
    id: 's03', awb: '7342 1192 87', ref: 'SMP-1026', from: { city: '김포', country: 'KR' }, to: { city: 'Ho Chi Minh', country: 'VN' },
    consignee: 'Sao Mai Beauty Co.', pieces: 1, weight: 2.1, service: '이코노미', createdAt: '2026-10-26', eta: '2026-10-31',
    status: 'transit', step: 2, subText: '인천공항 출발 대기',
    events: [ev('2026-10-27 08:15', '인천공항, KR', '수출 신고 수리, 출발 대기'), ev('2026-10-26 17:30', '김포, KR', '화물 픽업 완료'), ev('2026-10-26 11:05', '온라인', '발송 신청 접수')],
    docs: docsBase('7342 1192 87'),
  },
  {
    id: 's04', awb: '7342 1193 41', ref: 'PO-24125', from: { city: '김포', country: 'KR' }, to: { city: 'Frankfurt', country: 'DE' },
    consignee: 'Nordlicht Kosmetik GmbH', pieces: 4, weight: 26.0, service: '익스프레스', createdAt: '2026-10-27', eta: '2026-11-01',
    status: 'booked', step: 0, subText: '픽업 예정 10/28(수) 오후',
    events: [ev('2026-10-27 10:22', '온라인', '발송 신청 접수 — 픽업 예정 10/28 오후')],
    docs: [{ id: 's04-ci', type: '상업송장', name: 'CI_24125.pdf', size: '198KB', date: '' }],
  },
  {
    id: 's05', awb: '7342 1171 09', ref: 'PO-24102', from: { city: '김포', country: 'KR' }, to: { city: 'Sydney', country: 'AU' },
    consignee: 'Harbour Skin Pty Ltd', pieces: 2, weight: 11.2, service: '익스프레스', createdAt: '2026-10-20', eta: '2026-10-24',
    status: 'exception', step: 4, subText: '배달 시도 — 수취인 부재',
    action: { title: '받는 분 연락처를 확인해 주세요', text: '10/24 배달 때 받는 분이 안 계셨어요. 연락 가능한 번호나 다른 배달 시간을 알려 주시면 재배달을 잡아 드려요.', doc: null },
    events: [ev('2026-10-24 15:40', 'Sydney, AU', '배달 시도 — 수취인 부재, 보관 중', true), ev('2026-10-24 08:10', 'Sydney, AU', '배달 출발'), ev('2026-10-23 13:30', 'Sydney, AU', '수입 통관 완료'), ev('2026-10-22 06:50', 'Sydney, AU', '도착'), ev('2026-10-21 11:20', '인천공항, KR', '항공기 출발'), ev('2026-10-20 16:00', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1171 09'),
  },
  {
    id: 's06', awb: '7342 1180 66', ref: 'PO-24110', from: { city: '김포', country: 'KR' }, to: { city: 'Singapore', country: 'SG' },
    consignee: 'Lumen Retail Pte Ltd', pieces: 5, weight: 31.5, service: '익스프레스', createdAt: '2026-10-22', eta: '2026-10-25',
    status: 'delivered', step: 4, subText: '10/25 11:02 배달 완료 · 서명 L. TAN',
    events: [ev('2026-10-25 11:02', 'Singapore, SG', '배달 완료 — 서명 L. TAN'), ev('2026-10-25 08:30', 'Singapore, SG', '배달 출발'), ev('2026-10-24 19:40', 'Singapore, SG', '수입 통관 완료'), ev('2026-10-23 14:05', '인천공항, KR', '항공기 출발'), ev('2026-10-22 15:30', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1180 66', [{ id: 's06-pod', type: '배달 증명(POD)', name: 'POD_73421180.pdf', size: '64KB', date: '' }, { id: 's06-inv', type: '운임 청구서', name: '운임청구서_2026-10_C20418.pdf', size: '71KB', date: '' }]),
  },
  {
    id: 's07', awb: '7342 1177 30', ref: 'PO-24108', from: { city: '김포', country: 'KR' }, to: { city: 'Vancouver', country: 'CA' },
    consignee: 'Maple & Moss Beauty', pieces: 1, weight: 4.4, service: '익스프레스', createdAt: '2026-10-21', eta: '2026-10-24',
    status: 'delivered', step: 4, subText: '10/24 14:20 배달 완료',
    events: [ev('2026-10-24 14:20', 'Vancouver, CA', '배달 완료'), ev('2026-10-23 10:00', 'Vancouver, CA', '수입 통관 완료'), ev('2026-10-22 13:15', '인천공항, KR', '항공기 출발'), ev('2026-10-21 15:45', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1177 30', [{ id: 's07-pod', type: '배달 증명(POD)', name: 'POD_73421177.pdf', size: '61KB', date: '' }]),
  },
  {
    id: 's08', awb: '7342 1194 03', ref: 'PO-24127', from: { city: '김포', country: 'KR' }, to: { city: 'Los Angeles', country: 'US' },
    consignee: 'Brightline Trading LLC', pieces: 6, weight: 42.8, service: '익스프레스', createdAt: '2026-10-26', eta: '2026-10-30',
    status: 'transit', step: 2, subText: '항공기 출발 — 경유지 이동 중',
    events: [ev('2026-10-27 13:40', '인천공항, KR', '항공기 출발'), ev('2026-10-27 02:10', '인천공항, KR', '수출 신고 수리'), ev('2026-10-26 16:20', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1194 03'),
  },
  {
    id: 's09', awb: '7342 1166 58', ref: 'SMP-1019', from: { city: '김포', country: 'KR' }, to: { city: 'London', country: 'GB' },
    consignee: 'Kew Botanica Ltd', pieces: 1, weight: 1.2, service: '이코노미', createdAt: '2026-10-17', eta: '2026-10-23',
    status: 'delivered', step: 4, subText: '10/22 배달 완료',
    events: [ev('2026-10-22 12:30', 'London, GB', '배달 완료'), ev('2026-10-21 09:15', 'London, GB', '수입 통관 완료'), ev('2026-10-18 21:00', '인천공항, KR', '항공기 출발'), ev('2026-10-17 15:10', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1166 58'),
  },
  {
    id: 's10', awb: '7342 1188 14', ref: 'PO-24119', from: { city: '김포', country: 'KR' }, to: { city: 'Shanghai', country: 'CN' },
    consignee: '上海青禾贸易有限公司', pieces: 3, weight: 15.0, service: '익스프레스', createdAt: '2026-10-24', eta: '2026-10-28',
    status: 'customs', step: 3, subText: '수입 관세 납부 확인 중',
    events: [ev('2026-10-27 10:05', 'Shanghai, CN', '수입 관세 납부 확인 중'), ev('2026-10-26 08:40', 'Shanghai, CN', '도착'), ev('2026-10-25 17:30', '인천공항, KR', '항공기 출발'), ev('2026-10-24 14:55', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1188 14'),
  },
  {
    id: 's11', awb: '7342 1159 72', ref: 'PO-24096', from: { city: '김포', country: 'KR' }, to: { city: 'Tokyo', country: 'JP' },
    consignee: '株式会社ミナト商事', pieces: 2, weight: 8.8, service: '익스프레스', createdAt: '2026-10-14', eta: '2026-10-16',
    status: 'delivered', step: 4, subText: '10/16 배달 완료',
    events: [ev('2026-10-16 10:40', 'Tokyo, JP', '배달 완료'), ev('2026-10-15 18:20', 'Narita, JP', '수입 통관 완료'), ev('2026-10-15 09:00', '인천공항, KR', '항공기 출발'), ev('2026-10-14 16:30', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1159 72', [{ id: 's11-pod', type: '배달 증명(POD)', name: 'POD_73421159.pdf', size: '58KB', date: '' }]),
  },
  {
    id: 's12', awb: '7342 1150 31', ref: 'PO-24088', from: { city: '김포', country: 'KR' }, to: { city: 'Ho Chi Minh', country: 'VN' },
    consignee: 'Sao Mai Beauty Co.', pieces: 8, weight: 64.0, service: '이코노미', createdAt: '2026-10-08', eta: '2026-10-14',
    status: 'delivered', step: 4, subText: '10/13 배달 완료',
    events: [ev('2026-10-13 15:00', 'Ho Chi Minh, VN', '배달 완료'), ev('2026-10-12 11:30', 'Ho Chi Minh, VN', '수입 통관 완료'), ev('2026-10-09 22:15', '인천공항, KR', '항공기 출발'), ev('2026-10-08 15:20', '김포, KR', '화물 픽업 완료')],
    docs: docsBase('7342 1150 31', [{ id: 's12-inv', type: '운임 청구서', name: '운임청구서_2026-10_C20418.pdf', size: '71KB', date: '' }]),
  },
];

export const REQUESTS = [
  { id: 'Q-261027-014', kind: 'quote', title: '김포 → 시드니 · 2박스 14kg', createdAt: '2026-10-27 09:12', status: 'reviewing', route: { from: 'KR', to: 'AU' }, pieces: 2, weight: 14, history: [['2026-10-27 09:12', '견적 요청 접수'], ['2026-10-27 09:40', '담당 직원 확인 중']] },
  { id: 'Q-261025-006', kind: 'quote', title: '김포 → 프랑크푸르트 · 4박스 26kg', createdAt: '2026-10-25 14:30', status: 'answered', route: { from: 'KR', to: 'DE' }, pieces: 4, weight: 26, reply: { amount: 412000, validUntil: '2026-11-08', transit: '영업일 기준 3~4일', note: '부피 무게 28.8kg 기준, 유류할증료 포함 · 관부가세 별도(수입자 부담)' }, history: [['2026-10-25 14:30', '견적 요청 접수'], ['2026-10-25 16:05', '견적 회신']] },
  { id: 'R-261027-003', kind: 'ship', title: '김포 → 프랑크푸르트 · PO-24125', createdAt: '2026-10-27 10:22', status: 'registered', awb: '7342 1193 41', shipmentId: 's04', history: [['2026-10-27 10:22', '발송 신청 접수'], ['2026-10-27 10:51', '운송장 발급 · 픽업 예정 10/28 오후']] },
  { id: 'R-261026-011', kind: 'ship', title: '김포 → 호찌민 · 샘플 1박스', createdAt: '2026-10-26 11:05', status: 'registered', awb: '7342 1192 87', shipmentId: 's03', history: [['2026-10-26 11:05', '발송 신청 접수'], ['2026-10-26 11:30', '운송장 발급']] },
  { id: 'R-261026-009', kind: 'ship', title: '김포 → 멜버른 · PO-24126', createdAt: '2026-10-26 09:48', status: 'needs_fix', fix: '포장명세서의 박스 수(3)와 신청서의 박스 수(2)가 달라요. 맞는 쪽으로 고쳐서 다시 올려 주세요.', history: [['2026-10-26 09:48', '발송 신청 접수'], ['2026-10-26 10:30', '보완 요청 — 박스 수 불일치']] },
  { id: 'Q-261021-002', kind: 'quote', title: '김포 → 로스앤젤레스 · 6박스 43kg', createdAt: '2026-10-21 10:00', status: 'accepted', reply: { amount: 538000, validUntil: '2026-11-04', transit: '영업일 기준 2~3일', note: '실무게 기준' }, history: [['2026-10-21 10:00', '견적 요청 접수'], ['2026-10-21 13:20', '견적 회신'], ['2026-10-26 09:00', '이 견적으로 발송 신청']] },
];
