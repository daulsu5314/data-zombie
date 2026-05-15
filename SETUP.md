# 셋업 단계별 가이드 🚀

## A. Supabase 설정 (5분)

### 1. 프로젝트 만들기
- https://supabase.com → "New Project"
- Name: `data-zombie`
- Database Password: 자동 생성 → 메모
- Region: **Northeast Asia (Seoul)** 추천
- Create new project → 1~2분 대기

### 2. 스키마 적용
- 좌측 **SQL Editor** → "+ New query"
- `supabase/schema.sql` 전체 복사 → 붙여넣기
- 우측 하단 **Run**
- "Success. No rows returned" 뜨면 성공

### 3. API 키 복사
- 좌측 **Project Settings → API** (또는 **Data API**)
- **Project URL** 복사 (예: `https://abc.supabase.co`)
- **anon public 키** 복사 (`sb_publishable_...` 또는 `eyJ...`)

> ⚠️ `service_role` 키는 절대 사용하지 마세요. 관리자 키입니다.

---

## B. GitHub 업로드

1. https://github.com/new → 저장소 만들기 (`data-zombie`, 체크박스 모두 비움)
2. 이 zip 압축 해제
3. 새 저장소 → **"uploading an existing file"**
4. `data-zombie` 폴더 **안의 내용물** 전체 드래그&드롭 (폴더 자체가 아님)
5. 숨김 파일도 같이 (`.gitignore`, `.env.local.example`)
6. **Commit changes**

---

## C. Vercel 배포

1. https://vercel.com/new
2. GitHub 저장소 import
3. **Environment Variables** 펼치기 → 2개 추가:
   - `NEXT_PUBLIC_SUPABASE_URL` = (Supabase URL)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (anon 키)
4. **Deploy** → 2~3분 대기

---

## D. 수업 진행

1. **선생님**: 배포된 URL 끝에 `/teacher` 붙여서 접속 (예: `https://data-zombie.vercel.app/teacher`)
2. **"새 게임방 만들기"** 클릭 → QR + 6자리 코드 표시
3. **학생들**: QR 스캔 (또는 코드 직접 입력) → 닉네임 → 카드 1장 작성
4. 모두 모이면 선생님이 **[게임 시작 ▶]** 클릭
5. **3분 게임 자동 진행**:
   - 처음 5초: 보호 시간 (삭제 불가)
   - 1분 30초: ⚠ 데이터 유출 사고 발생 (카드 2배 + 위치 흩어짐)
   - 3분: 자동 종료 → 통계 화면 + 토론 질문

---

## E. 흔한 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| 방 생성 실패 | schema.sql 미실행 | A.2 다시 실행 |
| 학생 화면 동기화 안 됨 | Realtime 미활성화 | schema.sql 마지막에 자동 실행되지만 안 되면 Database → Publications에서 4개 테이블 토글 ON |
| Vercel 빌드 실패 | 환경변수 오타 | Vercel → Settings → Environment Variables 확인 |
| BREACH가 안 일어남 | trigger_data_breach 함수 미생성 | schema.sql 재실행 |
| 28명 동시 접속 가능? | 무료 플랜 한계 | Supabase 무료 동시 연결 200개라 충분 |

---

## F. 룰 조정

`src/lib/constants.ts`에서 한 줄 수정 → GitHub push → 자동 재배포:

```ts
GAME_DURATION_SECONDS = 180   // 게임 시간 (초)
DELETER_COUNT = 13            // 삭제팀 인원
DELETE_PROTECTION_MS = 5000   // 보호 시간 (밀리초)
COPY_BURST_COUNT = 2          // 한 번 클릭에 복제되는 개수
```

BREACH 발동 시점: `src/app/play/[room]/page.tsx`에서
```ts
const BREACH_TRIGGER_SECONDS = 90;  // 기본 1분 30초
```

감염 단계 임계치: `src/lib/constants.ts`의 `getInfectionStage()`
```ts
if (copyCount >= 20) return "critical";  // 빨강 임계치
if (copyCount >= 10) return "warning";   // 노랑 임계치
```
