-- 부서 목록 등록 + 결재라인 그룹(A/B) 설정 + 개발이사 역할 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.

-- 1) 부서 그룹 컬럼 추가 (A: 담당자→팀장→개발이사→경영지원팀장, B: 담당자→팀장→경영지원팀장)
alter table approval_departments add column if not exists approval_group text;

-- 2) 개발이사 역할 컬럼 추가 (부서와 무관한 개별 승인자)
alter table approval_employees add column if not exists is_dev_director boolean default false;

-- 3) 부서명 중복 등록 방지를 위한 unique 제약 추가 (이미 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'approval_departments_name_key'
  ) then
    alter table approval_departments add constraint approval_departments_name_key unique (name);
  end if;
end $$;

-- 4) 부서 등록 (이미 등록된 이름은 건드리지 않고 그룹만 채워줌)
insert into approval_departments (name, approval_group) values
  ('기획팀', 'A'),
  ('클라이언트팀', 'A'),
  ('서버팀', 'A'),
  ('웹앱팀', 'A'),
  ('그래픽팀', 'A'),
  ('영상팀', 'A'),
  ('대회운영팀', 'A'),
  ('센서솔루션팀', 'B'),
  ('고객기술지원팀', 'B'),
  ('자재관리팀', 'B'),
  ('재무회계팀', 'B'),
  ('국내영업팀', 'B'),
  ('해외영업팀', 'B'),
  ('통합마케팅팀', 'B'),
  ('경영지원팀', 'B')
on conflict (name) do update set approval_group = excluded.approval_group;
