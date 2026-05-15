-- ============================================
-- 데이터 좀비 게임 스키마
-- Supabase SQL Editor에서 실행하세요
-- 재실행해도 안전합니다 (idempotent)
-- ============================================

-- 게임 방
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- 6자리 입장 코드
  status text not null default 'lobby',   -- lobby | playing | ended
  spreader_ratio float not null default 0.5,
  duration_seconds int not null default 180,
  started_at timestamptz,
  ended_at timestamptz,
  breach_at timestamptz,                  -- 데이터 유출 사고 발생 시각
  created_at timestamptz not null default now()
);

-- 기존 테이블에도 breach_at 컬럼 추가 (이미 있으면 무시)
alter table rooms add column if not exists breach_at timestamptz;

-- 플레이어 (학생 한 명)
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  nickname text not null,
  role text,                              -- 'spreader' | 'deleter' | null(미배정)
  joined_at timestamptz not null default now()
);

-- 카드 (필드에 떠 있거나 삭제된 정보 인스턴스)
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  owner_id uuid not null references players(id) on delete cascade,
  -- 원본 카드 식별자 (복제본은 모두 같은 origin_id를 공유)
  origin_id uuid not null,
  name text not null,
  hobby text not null,
  birthday text not null,
  x float not null,                       -- 0-100 % 좌표
  y float not null,
  hidden boolean not null default false,  -- 유포자가 숨겼는지
  deleted boolean not null default false, -- UI 상 삭제됨 (로그에는 남음)
  is_original boolean not null default false,
  copy_generation int not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- 영구 로그 — UI에서 지워도 여기는 절대 안 지움
create table if not exists log_entries (
  id bigserial primary key,
  room_id uuid not null references rooms(id) on delete cascade,
  action text not null,                   -- CREATE | COPY | DELETE | HIDE
  card_id uuid not null,
  origin_id uuid not null,
  actor_id uuid references players(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- 인덱스
create index if not exists idx_rooms_code on rooms(code);
create index if not exists idx_cards_room on cards(room_id) where deleted = false;
create index if not exists idx_cards_origin on cards(origin_id);
create index if not exists idx_log_room on log_entries(room_id, created_at desc);
create index if not exists idx_players_room on players(room_id);

-- ============================================
-- Row Level Security
-- 교실용이라 다소 느슨하게 — 누구나 방에 접근 가능
-- ============================================
alter table rooms        enable row level security;
alter table players      enable row level security;
alter table cards        enable row level security;
alter table log_entries  enable row level security;

-- 기존 정책이 있으면 삭제 후 재생성 (재실행 안전)
drop policy if exists "rooms_all"   on rooms;
drop policy if exists "players_all" on players;
drop policy if exists "cards_all"   on cards;
drop policy if exists "log_all"     on log_entries;

create policy "rooms_all"   on rooms        for all using (true) with check (true);
create policy "players_all" on players      for all using (true) with check (true);
create policy "cards_all"   on cards        for all using (true) with check (true);
create policy "log_all"     on log_entries  for all using (true) with check (true);

-- ============================================
-- Realtime 활성화
-- 4개 테이블을 supabase_realtime publication에 추가
-- 이미 추가되어 있으면 에러 없이 넘어감
-- ============================================
do $$
begin
  begin alter publication supabase_realtime add table rooms;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table players;      exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table cards;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table log_entries;  exception when duplicate_object then null; end;
end $$;

-- ============================================
-- 헬퍼 함수: 6자리 방 코드 생성
-- 변수명을 new_code로 변경하여 컬럼 이름과의 충돌 방지
-- ============================================
drop function if exists generate_room_code();

create or replace function generate_room_code() returns text as $$
declare
  new_code text;
  exists_check int;
begin
  loop
    new_code := upper(substring(md5(random()::text) from 1 for 6));
    select count(*) into exists_check from rooms where rooms.code = new_code and status != 'ended';
    exit when exists_check = 0;
  end loop;
  return new_code;
end;
$$ language plpgsql;

-- ============================================
-- 데이터 유출 사고 발동 함수
-- 1. 모든 살아있는 카드 위치를 무작위로 재배치
-- 2. 모든 살아있는 카드를 1번 복제 (= 전체 2배)
-- 3. 한 번만 발동 (breach_at 이미 있으면 무시)
-- ============================================
create or replace function trigger_data_breach(target_room_id uuid)
returns void as $$
begin
  -- 이미 발생했으면 다시 발동 안 함
  if exists (select 1 from rooms where id = target_room_id and breach_at is not null) then
    return;
  end if;

  -- 1단계: 기존 카드 위치 무작위 재배치
  update cards
  set
    x = 5 + random() * 90,
    y = 5 + random() * 90,
    hidden = (random() < 0.3)
  where room_id = target_room_id and deleted = false;

  -- 2단계: 살아있는 카드 전체를 1번씩 복제 (총 2배)
  insert into cards (
    room_id, owner_id, origin_id, name, hobby, birthday,
    x, y, hidden, is_original, copy_generation
  )
  select
    room_id, owner_id, origin_id, name, hobby, birthday,
    5 + random() * 90,
    5 + random() * 90,
    (random() < 0.3),
    false,                          -- 복제본
    copy_generation + 1
  from cards
  where room_id = target_room_id and deleted = false;

  -- 3단계: breach_at 기록 (학생 화면이 감지)
  update rooms set breach_at = now() where id = target_room_id;

  -- 4단계: 로그에 BREACH 이벤트 기록
  insert into log_entries (room_id, action, card_id, origin_id, payload)
  values (
    target_room_id,
    'BREACH',
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    '{"event": "data_breach", "effect": "doubled_and_shuffled"}'::jsonb
  );
end;
$$ language plpgsql;
