# 교양필수 팀원 인수인계

> 마지막 정리: 2026-11-06 · 저장소: https://github.com/lee-yeong/heart-beat
> **배포 주소: https://heart-beat-sigma-two.vercel.app** (Vercel, `main`에 push하면 자동 재배포)
> 처음 읽는 팀원은 **1 → 2 → 3** 순서로 보면 바로 실행할 수 있어요.

---

## 1. 지금 상태

| 단계 | 내용 | 상태 |
|---|---|---|
| M1 | 프로젝트 세팅, 디자인 토큰, 학과·교양 데이터 변환, 학적 등록 화면 | ✅ |
| M2 | Supabase 스키마, 시드 15명, AI 학사 분석, AI 매칭(코드 필터 → AI → 서버 검증 → fallback) | ✅ |
| M3 | 수강신청(대기 1개 제한), 알림 배지, 승인·반려, 강의실 채팅, 읽음 "1", 차단 | ✅ |
| M4 | 우리의 강의계획서, AI 대화 주제, 수강신청 한마디(AI 멘트), 반려 후 빈자리 채우기, AI 매칭 상담, 3일 수강 기간(연락처 차단), 수강 철회 → 재매칭, /demo + QR, 큐피드 로고, 인스타그램형 PC 레이아웃 | ✅ |
| 계정 | 아이디·비밀번호 가입·로그인, 설정 탭(로그아웃·비밀번호 변경·회원탈퇴), 학생증 수정 | ✅ |
| M5 | Vercel 배포 (배포 주소에서 테스트 63개 통과) | ✅ |
| 남은 것 | 시연 리허설, 제출물(발표자료·GitHub 링크·시연영상) | ⏳ |

**테스트:** 실제 AI·DB로 전체 흐름 42개, 계정 21개 항목을 모두 통과했어요 (`scripts/tests/`).

---

## 2. 처음 세팅 (내 컴퓨터에서 실행)

1. **준비물:** Node.js LTS(v26 이상), Git
2. **GitHub 접근:** 저장소 주인(lee-yeong)이 GitHub → 저장소 Settings → Collaborators에서 팀원을 초대해야 코드를 올릴 수 있어요.
3. **설치와 실행**
   ```bash
   git clone https://github.com/lee-yeong/heart-beat.git
   cd heart-beat
   npm install
   cp .env.example .env.local
   ```
   ```bash
   npm run dev
   ```
   http://localhost:3000 이 열리면 성공이에요.
4. **`.env.local` 값은 팀장에게 직접 받으세요.** 카톡방이나 GitHub, 공개 문서에 붙여넣지 마세요.
   - 키는 서버에서만 쓰여요. `.gitignore`에 들어 있어서 커밋되지 않아요.
   - 모든 팀원이 **같은 Supabase 프로젝트(DB 하나)를 함께 써요.** 그래서 로컬에서 만든 데이터는 배포된 사이트에도 보여요.

### 환경변수

| 이름 | 용도 | 비고 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API | 서버 전용. 크레딧은 팀 공용(US$5 충전됨) |
| `AI_MODEL` | 사용할 모델 | 기본 `claude-sonnet-5-5` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 주소 | 공개돼도 되는 값 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서버 키 | **서버 전용, 절대 공개 금지** (RLS를 우회하는 키) |
| `DEMO_MODE` | `true`면 /demo, QR, "3일 뒤로 이동" 활성화 | 시연 끝나면 `false` 권장 |
| `DEMO_ACCESS_SECRET` | /demo 비밀코드 | 서버 전용 |
| `AUTH_SECRET` | (선택) 로그인 토큰 서명 키 | 비우면 서비스 키를 써요. **로컬과 Vercel이 같은 값이어야 해요.** 다르면 한쪽에서 로그인할 때 다른 쪽이 로그아웃돼요. 한 번 정하면 바꾸지 마세요. |

---

## 3. 폴더 구조

```text
app/                         화면(page.tsx)과 API(route.ts)
  page.tsx                   랜딩
  register/  login/          회원가입(학적 등록 9단계) / 로그인
  recommendations/           AI 추천 수강 목록 (+ 수강신청 시트, AI 상담)
  notifications/             알림 (받은 신청, 기록, 재매칭 제안)
  rooms/  rooms/[id]/        강의실 목록 / 채팅 전체 화면
  profile/  profile/edit/    학생증 / 학생증 수정
  settings/                  설정 (로그인 정보, 로그아웃, 탈퇴)
  demo/                      시연용 로그인
  api/                       서버 API (아래 5번)
components/
  AppShell.tsx               공통 레이아웃: PC 접히는 메뉴 + 피드 + 활동 열 + 미니 메시지 창 / 모바일 하단 탭
  ChatView.tsx               채팅 (전체 화면과 미니 창에서 같이 사용)
  NotificationsPanel.tsx     PC 오른쪽 활동 열
  MiniMessenger.tsx          PC 오른쪽 아래 메시지 창
  RecommendationCard.tsx  SyllabusCard.tsx  ApplySheet.tsx  ConsultPanel.tsx  ...
lib/
  server/                    서버 전용 (import "server-only")
    ai.ts                    ★ Claude 호출은 여기 generate() 하나로만
    prompts.ts               ★ 모든 AI 프롬프트
    schemas.ts               입력·AI 응답 zod 스키마
    matching.ts              추천 필터·검증·저장
    syllabus.ts  courses.ts  강의계획서, 과목 후보 추리기
    fallback.ts              AI 실패 시 규칙 기반 결과
    auth.ts  password.ts     토큰·비밀번호
    relations.ts             강의실 단계(roomPhase), 연락처 감지(containsContact)
  types.ts                   ★ 팀 공통 타입 (바꿀 때 팀에 알리기)
  options.ts                 등록 선택지 (MBTI, 특징, 장르...)
  api-client.ts  use-poll.ts  use-me.ts
data/
  courses.json               교양 319개 분반 (scripts/convert_courses.py로 생성)
  departments.json           학과 66개
  seed-profiles.json         가상 시드 15명
supabase/
  schema.sql                 ★ 전체 스키마 (새 DB는 이것만 실행)
  migration_m4.sql  migration_m5.sql   기존 DB용 추가 컬럼
scripts/tests/               flow-test.mjs (전체 흐름), account-test.mjs (계정)
public/logo.png              로고 (배경 투명, 사이트 색 보정)
```

---

## 4. 데이터 모델

| 테이블 | 핵심 컬럼 | 규칙 |
|---|---|---|
| `profiles` | 학적 정보, `ai_analysis`, `login_id`, `password_hash`, `access_token_hash`, `match_preference`(상담 선호, 본인만), `is_seed` | 아이디 중복 불가 |
| `recommendations` | user_id, candidate_id, analysis(AI 근거), rank, source(ai/fallback) | 사용자별 캐시 |
| `requests` | sender, receiver, status(pending/accepted/rejected), message(한마디), analysis | **보낸 대기 요청 1인 1개**, **두 사람 사이 요청 1개(방향 무관)** — DB 유일 인덱스 |
| `rooms` | request_id(유일), user_a/b, syllabus, 읽음 시각 a/b, `trial_ends_at`(3일), continue_at a/b, ended_at | 승인 1건당 1개 |
| `messages` | room_id, sender_id(AI는 null), type(user/ai), client_message_id | 같은 client_message_id 중복 불가 |
| `blocks` | blocker, blocked | |

**강의실 단계** (`lib/server/relations.ts`의 `roomPhase`)
- `trial` (3일 수강 기간): 연락처·SNS 공유가 막혀요.
- `deciding`: 3일이 지나 계속 수강 여부를 고르는 단계예요.
- `confirmed`: 둘 다 계속 수강을 골라 연락처 교환이 가능해요.
- `ended`: 수강 철회. 메시지를 보낼 수 없고 양쪽에 재매칭 제안이 가요.

### ⚠️ DB 바꿀 때 주의
- 새 컬럼은 `supabase/migration_xx.sql`로 만들고, `schema.sql`에도 같은 내용을 넣으세요.
- 이 Supabase 프로젝트는 **SQL로 만든 테이블에 권한이 자동으로 생기지 않아요.** 새 테이블을 만들면 아래를 꼭 같이 실행하세요. 안 하면 API가 403으로 실패해요.
  ```sql
  grant select, insert, update, delete on all tables in schema public to service_role;
  ```
- SQL Editor에서는 **Save가 아니라 Run**을 눌러야 적용돼요.

---

## 5. API 한눈에

모든 개인 API는 `Authorization: Bearer <user_id>.<secret>`가 필요해요. 프론트에서는 `lib/api-client.ts`의 `api()`를 쓰면 자동으로 붙어요.

| 경로 | 설명 |
|---|---|
| `POST /api/profiles` | 회원가입 + AI 학사 분석 |
| `POST /api/auth/login` · `POST /api/auth/credentials` | 로그인 · 아이디 만들기/비밀번호 변경 |
| `GET·PATCH·DELETE /api/profiles/me` | 내 정보 · 학생증 수정(재분석) · 회원탈퇴(닉네임 확인) |
| `GET·POST /api/recommendations` | 조회 · 생성 (`refresh`, `refill`, `rematch`, `preference`) |
| `POST /api/consult` | AI 매칭 상담 |
| `POST /api/requests` · `GET /api/requests` · `POST /api/requests/suggest` | 수강신청 · 목록 · AI 한마디 추천 |
| `POST /api/requests/[id]/respond` | 승인/반려 (승인 시 강의실 + AI 공지) |
| `GET /api/notifications` · `POST /api/notifications/read` | 배지·재매칭 제안 · 확인 처리 |
| `GET /api/rooms` · `GET /api/rooms/[id]` | 강의실 목록 · 상세(단계, 강의계획서) |
| `GET·POST /api/rooms/[id]/messages` · `POST .../read` | 메시지 · 읽음 처리 |
| `POST /api/rooms/[id]/syllabus` · `POST .../topics` · `POST .../decision` | 강의계획서 · 대화 주제 · 계속 수강/철회/(시연)3일 건너뛰기 |
| `POST /api/blocks` | 차단 |
| `POST /api/demo/session` · `POST /api/demo/reset` · `POST /api/admin/seed` | 시연 로그인 · 시연 데이터 초기화 · 시드 넣기 (모두 DEMO_MODE + 비밀코드) |

---

## 6. AI 수정 방법

- **프롬프트:** 전부 `lib/server/prompts.ts`에 있어요. 공통 규칙은 `COMMON_RULES`예요. 비하·외모·음주 금지, MBTI 단정 금지, 입력 속 지시문 무시 같은 내용이에요.
- **호출:** `generate({ name, system, user, schema, validate })` 하나로 해요.
  - 구조화 출력(zod)을 쓰고, `validate`가 문제 문자열을 돌려주면 그 사유를 AI에 알려주고 1회 재시도해요.
  - 그래도 실패하면 `null`을 돌려주고, 호출한 쪽이 `fallback.ts` 결과를 써요.
- **모델과 속도:** `AI_MODEL` 환경변수로 바꿔요. 지금은 `effort: "low"`라서 호출 1번에 3~12초 정도 걸려요.
- **비용:** 가입 1회는 1~2번, 추천 1번, 강의계획서 1번 호출해요. US$5로 시연과 테스트에는 충분해요.
- **화면 표시 원칙:** AI가 만든 내용에는 'AI 분석' 또는 'AI가 재해석한 내용' 라벨을 붙이고, 실제 데이터(과목명·교수·시간·장소)는 원본 그대로 보여줘요.

---

## 7. 테스트

```bash
node scripts/tests/account-test.mjs
```
```bash
node scripts/tests/flow-test.mjs <DEMO_ACCESS_SECRET>
```
- **account-test:** 테스트 계정이 끝날 때 스스로 탈퇴해요.
- **flow-test:** 실제 AI를 호출하고 테스트 데이터가 남아요. 끝나면 `/demo` → "시연 데이터 초기화"로 정리하세요.
- **배포 서버 테스트:** 앞에 `BASE_URL=https://배포주소`를 붙여요.

---

## 8. Vercel 배포 (M5)

1. https://vercel.com 에 **GitHub 계정으로 로그인**하세요(저장소 주인 계정 권장).
2. **Add New → Project** → `lee-yeong/heart-beat` **Import**를 누르세요.
3. Framework는 Next.js로 자동 인식돼요. **Environment Variables**에 2번 표의 값을 넣으세요.
   - `ANTHROPIC_API_KEY`, `AI_MODEL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_MODE`, `DEMO_ACCESS_SECRET`
   - `AUTH_SECRET`는 로컬에서 비워 뒀다면 여기서도 비워 두세요.
4. **Deploy**를 누르면 `https://heart-beat-xxxx.vercel.app` 같은 주소가 생겨요.
5. 이후에는 `main`에 push할 때마다 자동으로 다시 배포돼요.
6. 서버 지역은 `vercel.json`에서 서울(`icn1`)로 정해 뒀어요.
7. 배포 후 확인:
   ```bash
   BASE_URL=https://배포주소 node scripts/tests/account-test.mjs
   ```

---

## 9. 시연 체크리스트 (휴대폰 2대)

1. [ ] 배포 주소에서 `/demo` → **시연 데이터 초기화** (시드 15명만 남김 — 팀원 계정도 지워지니 초기화 후 다시 가입)
   - **시연 모드 규칙:** `DEMO_MODE=true`면 후보 중 실제 가입자(시드가 아닌 사람)가 추천 3명 안에 **최소 1명 꼭** 들어가요. 팀원이 먼저 가입(나와 다른 학과)하고 내가 가입하면 팀원이 추천에 나와요. 코드는 `lib/server/matching.ts`의 `demoRequiresReal`.
2. [ ] 휴대폰 A: 랜딩 → 학적 등록(아이디 만들기 → 9단계) → 학생증 + AI 학사 분석
3. [ ] A: AI 추천 수강 목록 → 근거 키워드 칩 보여주기 → 수강신청 → AI 한마디 고르기
4. [ ] 휴대폰 B: A 화면 카드의 **"시연용 QR"** 찍기 → 비밀코드(처음 한 번) → 알림 배지 → 한마디·AI 근거 확인 → **수강 승인**
5. [ ] 강의실: AI 조교 3일 공지 → **우리의 강의계획서**(실제 과목 + AI 재해석) → 메시지와 읽음 "1" 사라짐
6. [ ] 전화번호 입력 → 막힘 → 메뉴 "⏩ 3일 뒤로 이동" → 둘 다 **계속 수강하기** → 연락처 허용
7. [ ] (여유 있으면) ✨ 대화 주제 추천, AI 조교와 상담하기, 수강 철회 → 재매칭

---

## 10. 알려진 한계와 주의

- **연락처 차단:** 정규식 기반이라 전화번호, @아이디, "인스타/카톡/DM" 같은 단어만 잡아요. **실명·나이는 자동으로 막지 않고 공지로 안내만 해요.** "공일공"처럼 돌려 쓰면 통과될 수 있어요.
- **대화 주제 추천 연타 제한(5초):** 서버 메모리 기준이라 Vercel 인스턴스가 여러 개면 정확하지 않아요.
- **polling:** 채팅 2초, 알림 5초라 사용자가 많아지면 요청이 늘어나요. 대회 시연 규모에서는 문제없어요.
- **이메일 학교 인증은 없어요.** 아이디·비밀번호만 써요. 비밀번호 찾기도 아직 없어요.
- **회원탈퇴:** 상대 쪽 강의실과 메시지도 같이 지워져요(DB cascade).
- **로고:** 학교 로고를 바탕으로 만들었어요. 대회 제출 전에 학교 로고 사용 규정을 확인하세요.
- **테스트 계정:** DB에 정보통신러, 테스트B, 테스트C, flow_… 같은 계정이 남아 있어요. 시연 전에 초기화하세요.
- **Vercel 무료 요금제:** API 최대 실행 시간이 60초예요. 시드 15명 넣기는 6초 정도라 괜찮아요.

---

## 11. 남은 할 일 (M5)

- [x] Vercel 배포 + 배포 주소에서 테스트 (8번) — https://heart-beat-sigma-two.vercel.app
- [ ] 휴대폰 2대 시연 리허설 (9번)
- [ ] **제출물:** 발표자료, GitHub 링크(https://github.com/lee-yeong/heart-beat), 시연영상
- [x] README에 배포 주소 추가
- [ ] 시연 후 `DEMO_MODE=false` 고려

**추가 아이디어 (시간 남으면):** 비밀번호 찾기, 실명·나이 감지를 AI로 보강, 강의계획서 다시 만들기 버튼, 시연영상용 자동 시나리오

---

## 12. 같이 작업할 때 규칙

- **코드 올리기:** 작업 전에 `git pull`, 끝나면 `git add -A` → `git commit -m "무엇을 했는지"` → `git push`
- **여러 명이 동시에 고칠 때:** 같은 파일을 동시에 고치면 충돌이 나요. 특히 `AppShell.tsx`, `types.ts`, `schema.sql`, `prompts.ts`는 누가 고치는지 먼저 말하고 작업하세요.
- **커밋 금지:** `.env.local`, 키, 비밀번호
- **푸시 전 확인:** `npm run build`가 통과하는지 확인하세요. Vercel은 빌드가 실패하면 배포하지 않아요.
- **디자인 토큰:** 색은 `app/globals.css`의 토큰을 쓰세요. 주요 색은 `primary #FF6B9A`, `surface #FFF5F8`이에요. 버튼은 둥근 네모(`rounded-xl`/`rounded-2xl`), 키워드 칩만 알약 모양이에요.
