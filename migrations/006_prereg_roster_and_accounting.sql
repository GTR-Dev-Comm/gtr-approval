-- 사전등록 명단 + 최초 전화번호 인증 방식 + 회계담당 역할 추가
-- Supabase SQL Editor에서 실행하세요. (004번 마이그레이션을 먼저 실행해서 부서가 등록되어 있어야 합니다)

-- 1) 로그인 계정을 아직 만들지 않은 사전등록자를 허용하기 위해 not null 제약 완화
alter table approval_employees alter column login_id drop not null;
alter table approval_employees alter column password_hash drop not null;

-- 2) 전화번호, 회계담당 역할 컬럼 추가
alter table approval_employees add column if not exists phone text;
alter table approval_employees add column if not exists is_accounting_reviewer boolean default false;

-- 전화번호 중복 방지
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'approval_employees_phone_key'
  ) then
    alter table approval_employees add constraint approval_employees_phone_key unique (phone);
  end if;
end $$;

-- 3) 사전등록 명단 (아직 login_id/password 없이 이름+전화번호+역할만 등록됨)
--    이미 같은 전화번호로 등록된 사람은 건드리지 않습니다.

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '도승희', '010-2281-3215', null, false, true, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-2281-3215');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '양정운', '010-3099-6287', (select id from approval_departments where name = '기획팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-3099-6287');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '한성진', '010-8569-9102', (select id from approval_departments where name = '클라이언트팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8569-9102');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '남기종', '010-8866-1877', (select id from approval_departments where name = '서버팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8866-1877');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '유부열', '010-9092-4158', (select id from approval_departments where name = '웹앱팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9092-4158');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '윤재영', '010-4654-8637', (select id from approval_departments where name = '그래픽팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4654-8637');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '김명현', '010-9373-7159', (select id from approval_departments where name = '영상팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9373-7159');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '배성우', '010-4502-3434', (select id from approval_departments where name = '대회운영팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4502-3434');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '이은혜', '010-8733-6732', (select id from approval_departments where name = '경영지원팀'), true, false, false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8733-6732');

insert into approval_employees (name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer, signup_status, is_active)
select '채유림', '010-4083-7251', (select id from approval_departments where name = '재무회계팀'), false, false, true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4083-7251');
