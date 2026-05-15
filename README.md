# 데이터 좀비: 3분의 사투 🧟‍♀️

학생들이 실시간으로 두 팀으로 나뉘어 개인정보 유포/삭제를 체험하는 디지털 시민교육 게임.

학생들은 각자 가상의 개인정보 카드(이름, 생일, 취미) 1장을 만들어 디지털 공간에 올립니다. 이 정보들은 한번 풀려나면 막을 수 없다는 메시지를 직접 체감하게 됩니다.

## 게임 룰

- **삭제팀(먼저 접속한 13명)**: 자기 정보가 화면에 보이면 클릭해서 삭제
- **유포자(나머지 전원)**: 다른 학생의 카드를 클릭해 2개씩 기하급수적으로 복제
- **5초 보호 시간**: 카드 생성 후 5초간 삭제 불가 (유포자 황금시간)
- **1분 30초 ⚠ 데이터 유출 사고**: 모든 카드가 무작위로 흩어지고 2배 폭증
- **3분 후**: 필드에 남은 정보 vs 영구 로그에 쌓인 흔적 비교

### 감염 단계 색상
- 🟢 **SAFE** (0~9회 복제) — 아직 안전
- 🟡 **WARNING** (10회+) — 경고
- 🔴 **CRITICAL** (20회+) — 위험, 깜빡임

## 스택

- **Next.js 14** — Vercel 정적 호스팅
- **Supabase Realtime + Postgres** — WebSocket 동기화 + 영구 로그
- **Tailwind CSS** — 좀비 톤 UI
- **TypeScript**

## 셋업

### 1. Supabase 프로젝트
1. https://supabase.com 새 프로젝트 생성 (Region: Northeast Asia Seoul 추천)
2. SQL Editor에서 `supabase/schema.sql` 전체 복사 → Run
3. Settings → API에서 `Project URL`과 `anon` `public` 키 복사

### 2. Vercel 배포
1. 이 저장소를 본인 GitHub에 import
2. Vercel에서 New Project → Import
3. Environment Variables 추가:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### 3. 수업 진행
- 선생님: `/teacher` 접속 → 새 게임방 만들기 → QR 띄움
- 학생들: QR 스캔 → 닉네임 입력 → 카드 1장 작성
- 충분히 모이면 선생님이 [게임 시작] 클릭

## 커스터마이징

`src/lib/constants.ts`에서:
- `GAME_DURATION_SECONDS` — 게임 시간 (기본 180초)
- `DELETER_COUNT` — 삭제팀 인원 (기본 13명)
- `DELETE_PROTECTION_MS` — 보호 시간 (기본 5초)
- `COPY_BURST_COUNT` — 복제 개수 (기본 2개)
- `getInfectionStage()` — 단계별 임계치 (기본 10, 20회)

BREACH 발동 시점 변경: `src/app/play/[room]/page.tsx`의 `BREACH_TRIGGER_SECONDS` (기본 90초)
