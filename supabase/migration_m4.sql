-- M4 추가 컬럼. Supabase SQL Editor에서 한 번 실행 (여러 번 실행해도 안전).

-- 수강신청 한마디 (최대 100자)
alter table requests add column if not exists message text check (message is null or char_length(message) <= 100);

-- 수강 철회(관계 종료)
alter table rooms add column if not exists ended_at timestamptz;
alter table rooms add column if not exists ended_by uuid references profiles(id) on delete set null;

-- 3일 수강 기간: 끝나기 전에는 연락처·SNS 공유 불가, 둘 다 '계속 수강'을 누르면 연락처 교환 가능
alter table rooms add column if not exists trial_ends_at timestamptz not null default (now() + interval '3 days');
alter table rooms add column if not exists user_a_continue_at timestamptz;
alter table rooms add column if not exists user_b_continue_at timestamptz;

-- AI 매칭 상담으로 정리한 선호, 재매칭 알림 확인 시각
alter table profiles add column if not exists match_preference text check (match_preference is null or char_length(match_preference) <= 300);
alter table profiles add column if not exists rematch_decided_at timestamptz not null default now();

-- 새 컬럼도 서버(service_role)만 쓰도록 권한 재확인
grant select, insert, update, delete on all tables in schema public to service_role;
