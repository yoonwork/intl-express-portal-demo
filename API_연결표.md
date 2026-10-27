# API 연결표 (화면 ↔ 서버)

화면은 `js/api.js` 한 파일로만 서버와 이야기해요. 실제 서버에 붙일 때는 `CONFIG.mode`를 `'live'`로 바꾸고, 주소가 다르면 `PATHS`만 고치면 돼요. 아래 응답 모양은 `js/mock.js`의 예시 데이터와 같아요.

공통 약속
- 로그인은 쿠키(세션)로 유지 → 화면은 `credentials: 'same-origin'`으로 보냄.
- 401이 오면 화면이 로그인으로 보냄(로그인·초대·재설정 화면 제외).
- 실패할 때 `{ "message": "사람이 읽을 문장", "fields": { "email": "이메일 형식이 아니에요" } }` 모양이면 화면이 그대로 보여 줌.

| 화면 | 방법·주소 (앞에 /api/portal) | 보내는 값 | 받는 값(요약) |
|---|---|---|---|
| 로그인 | POST /auth/login | email, password | { ok } + 세션 쿠키 |
| 로그아웃 | POST /auth/logout | — | { ok } |
| 초대 수락 | GET /invites/:token | — | company, email, inviter, expiresAt (만료면 410) |
| 초대 수락 | POST /invites/:token/accept | name, password, agree | { ok } |
| 비밀번호 재설정 요청 | POST /auth/password-reset | email | { ok } (가입 여부와 관계없이 같은 응답) |
| 새 비밀번호 | POST /auth/password-reset/:token | password | { ok } (만료면 410) |
| 내 정보 | GET /me | — | me{company, name, email, …, manager}, addresses[] |
| 내 화물 목록 | GET /shipments?q=&status=&period= | 검색어, 상태, 기간(일) | items[{id, awb, ref, from, to, consignee, status, subText, eta, docCount, actionTitle}], total, counts{all, exception, booked, transit, customs, delivered} |
| 화물 상세 | GET /shipments/:id | — | 위 값 + step(0~4), action{title,text,doc}, events[{time, location, text, actionRequired}], docs[{id, type, name, size}] (남의 화물이면 404) |
| 서류 내려받기 | GET /shipments/:id/documents/:docId | — | 파일 |
| 보완 서류 올리기 (선택) | POST /shipments/:id/documents | FormData(type, file) | { ok } |
| 견적 요청 | POST /quotes | fromCountry, fromCity, toCountry, toCity, kind, items, pieces, weight, size{l,w,h}, shipDate, memo | { id, status } |
| 발송 신청 | POST /shipment-requests | FormData(data=JSON, files[], fileTypes[]) | { id, status } |
| 내 요청 목록 | GET /requests?kind=&status= | quote/ship, open/done | items[{id, kind, title, createdAt, status}], total |
| 요청 상세 | GET /requests/:id | — | 위 값 + reply{amount, validUntil, transit, note}, fix, awb, shipmentId, history[[시각, 내용]] |

공고 범위 밖이라 '선택'으로 둔 것: 보완 서류 올리기(화물 상세), 화물 목록 위 공지 한 줄, 주소록 편집(데모는 조회만). 빼도 나머지 화면은 그대로 동작해요.

상태 값: 화물 `booked·picked·transit·customs·delivered·exception`, 요청 `received·reviewing·answered·accepted·registered·needs_fix`. 이름이 다르면 `js/ui.js`의 `SHIP_STATUS`, `REQ_STATUS` 표만 고치면 돼요.

보안 메모: 화면은 서버 값을 모두 글자(textContent)로만 넣어요. 남의 회사 화물을 못 보게 막는 건 서버(권한)가 해야 하고, 화면은 404를 받으면 '찾을 수 없어요'를 보여 줘요.
