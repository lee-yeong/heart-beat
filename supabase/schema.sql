-- 교양필수 DB 스키마
-- Supabase 대시보드 → SQL Editor → New query에 전체를 붙여넣고 Run.
-- 여러 번 실행해도 안전하도록 if not exists를 사용한다.

create extension if not exists pgcrypto;

-- 프로필 (학적)
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  access_token_hash text not null,
  nickname text not null check (char_length(nickname) between 1 and 12),
  year smallint not null check (year between 2 and 4),
  department_id text not null,
  department_name text not null,
  college text not null,
  mbti text not null,
  blood_type text not null,
  traits jsonb not null default '[]'::jsonb,
  music_genres jsonb not null default '[]'::jsonb,
  favorite_music text check (favorite_music is null or char_length(favorite_music) <= 40),
  ai_analysis jsonb,
  ai_analysis_source text check (ai_analysis_source in ('ai', 'fallback')),
  notifications_seen_at timestamptz not null default now(),
  is_seed boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists profiles_department on profiles(department_id);

-- AI 추천 결과 (사용자별 캐시)
create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  candidate_id uuid not null references profiles(id) on delete cascade,
  analysis jsonb not null,
  rank smallint not null,
  source text not null check (source in ('ai', 'fallback')),
  created_at timestamptz not null default now(),
  unique (user_id, candidate_id)
);
create index if not exists recommendations_user on recommendations(user_id, rank);

-- 수강신청 (친구 요청)
create table if not exists requests (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  analysis jsonb,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint no_self_request check (sender_id <> receiver_id)
);
-- 보낸 요청 중 승인 대기는 1개만
create unique index if not exists one_pending_per_sender on requests(sender_id) where status = 'pending';
-- 같은 두 사람 사이의 요청은 방향과 상관없이 1개만 (교차 신청 방지)
create unique index if not exists one_request_per_pair
  on requests (least(sender_id, receiver_id), greatest(sender_id, receiver_id));
create index if not exists requests_receiver_status on requests(receiver_id, status);

-- 강의실 (채팅방)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references requests(id) on delete cascade,
  user_a_id uuid not null references profiles(id) on delete cascade,
  user_b_id uuid not null references profiles(id) on delete cascade,
  course_id text,
  syllabus jsonb,
  syllabus_status text not null default 'pending' check (syllabus_status in ('pending', 'ready', 'failed')),
  syllabus_claimed_at timestamptz,
  user_a_last_read_at timestamptz not null default 'epoch',
  user_b_last_read_at timestamptz not null default 'epoch',
  created_at timestamptz not null default now()
);

-- 메시지
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade, -- AI 조교는 null
  type text not null check (type in ('user', 'ai')),
  content text not null check (char_length(content) between 1 and 1000),
  client_message_id text,
  created_at timestamptz not null default now(),
  constraint one_client_message unique (room_id, client_message_id)
);
create index if not exists messages_room_time on messages(room_id, created_at, id);

-- 차단
create table if not exists blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint one_block_per_pair unique (blocker_id, blocked_id)
);

-- M4 추가 컬럼 (supabase/migration_m4.sql과 같음)
alter table requests add column if not exists message text check (message is null or char_length(message) <= 100);
alter table rooms add column if not exists ended_at timestamptz;
alter table rooms add column if not exists ended_by uuid references profiles(id) on delete set null;
alter table rooms add column if not exists trial_ends_at timestamptz not null default (now() + interval '3 days');
alter table rooms add column if not exists user_a_continue_at timestamptz;
alter table rooms add column if not exists user_b_continue_at timestamptz;
alter table profiles add column if not exists match_preference text check (match_preference is null or char_length(match_preference) <= 300);
alter table profiles add column if not exists rematch_decided_at timestamptz not null default now();

-- M5 추가 컬럼 (supabase/migration_m5.sql과 같음)
alter table profiles add column if not exists login_id text;
create unique index if not exists profiles_login_id on profiles(login_id) where login_id is not null;
alter table profiles add column if not exists password_hash text;

-- RLS: 익명·일반 클라이언트의 직접 접근을 모두 막는다.
-- 서버(service_role)는 RLS를 우회하므로 모든 권한 검사는 Next.js API에서 한다.
alter table profiles enable row level security;
alter table recommendations enable row level security;
alter table requests enable row level security;
alter table rooms enable row level security;
alter table messages enable row level security;
alter table blocks enable row level security;

-- 권한: 서버(service_role)만 읽고 쓸 수 있게 한다. anon/authenticated에는 주지 않는다.
-- (새 Supabase 프로젝트는 SQL로 만든 테이블에 권한을 자동으로 주지 않는다)
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
revoke all on all tables in schema public from anon, authenticated;
