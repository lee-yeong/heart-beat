-- M5 추가 컬럼: 아이디·비밀번호 로그인. Supabase SQL Editor에서 한 번 실행 (여러 번 실행해도 안전).

-- 로그인 아이디 (영문 소문자·숫자·밑줄 4~20자, 중복 불가)
alter table profiles add column if not exists login_id text;
create unique index if not exists profiles_login_id on profiles(login_id) where login_id is not null;

-- 비밀번호 해시 (scrypt). 원문 비밀번호는 저장하지 않는다.
alter table profiles add column if not exists password_hash text;

grant select, insert, update, delete on all tables in schema public to service_role;
