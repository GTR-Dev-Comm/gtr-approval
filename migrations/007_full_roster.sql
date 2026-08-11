-- 전체 팀장/팀원 명단 사전등록
-- Supabase SQL Editor에서 실행하세요. (004, 006번을 먼저 실행하셨어야 합니다)
-- 이미 등록된 전화번호는 건드리지 않습니다 (중복 방지).

-- ===== 기획팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '양정운', '010-3099-6287', (select id from approval_departments where name = '기획팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-3099-6287');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '양정준', '010-6655-8755', (select id from approval_departments where name = '기획팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-6655-8755');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '도승찬', '010-5557-3215', (select id from approval_departments where name = '기획팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-5557-3215');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '오규혜', '010-3583-3858', (select id from approval_departments where name = '기획팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-3583-3858');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '정준원', '010-9153-7339', (select id from approval_departments where name = '기획팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9153-7339');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김서리', '010-6460-5788', (select id from approval_departments where name = '기획팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-6460-5788');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김영화', '010-8544-8623', (select id from approval_departments where name = '기획팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8544-8623');

-- ===== 클라이언트팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '한성진', '010-8569-9102', (select id from approval_departments where name = '클라이언트팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8569-9102');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '이보우', '010-9134-2351', (select id from approval_departments where name = '클라이언트팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9134-2351');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김효람', '010-2926-2019', (select id from approval_departments where name = '클라이언트팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-2926-2019');

-- ===== 서버팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '남기종', '010-8866-1877', (select id from approval_departments where name = '서버팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8866-1877');

-- ===== 웹앱팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '유부열', '010-9092-4158', (select id from approval_departments where name = '웹앱팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9092-4158');

-- ===== 그래픽팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '윤재영', '010-4654-8637', (select id from approval_departments where name = '그래픽팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4654-8637');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '오일강', '010-4505-9705', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4505-9705');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '이선아', '010-2961-0178', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-2961-0178');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '정요한', '010-5713-2348', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-5713-2348');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김종학', '010-5659-2448', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-5659-2448');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '정요셉', '010-5712-2348', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-5712-2348');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '최현욱', '010-6624-6181', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-6624-6181');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '이승아', '010-2609-7902', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-2609-7902');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '나윤성', '010-2931-0579', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-2931-0579');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '이금희', '010-9409-2695', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9409-2695');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김상효', '010-7174-0842', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-7174-0842');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김진아', '010-8586-7770', (select id from approval_departments where name = '그래픽팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8586-7770');

-- ===== 영상팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김명현', '010-9373-7159', (select id from approval_departments where name = '영상팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9373-7159');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '이수호', '010-7761-2459', (select id from approval_departments where name = '영상팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-7761-2459');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '이상헌', '010-9901-4849', (select id from approval_departments where name = '영상팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9901-4849');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '윤현영', '010-3922-0934', (select id from approval_departments where name = '영상팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-3922-0934');

-- ===== 대회운영팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '배성우', '010-4502-3434', (select id from approval_departments where name = '대회운영팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4502-3434');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '윤재민', '010-8054-5622', (select id from approval_departments where name = '대회운영팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8054-5622');

-- ===== 센서솔루션팀 (팀장 미지정) =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김지훈', '010-6411-0345', (select id from approval_departments where name = '센서솔루션팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-6411-0345');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '이창수', '010-4853-4535', (select id from approval_departments where name = '센서솔루션팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4853-4535');

-- ===== 고객기술지원팀 (팀장 미지정) =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김강후', '010-7760-6725', (select id from approval_departments where name = '고객기술지원팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-7760-6725');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '정지원', '010-2734-3093', (select id from approval_departments where name = '고객기술지원팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-2734-3093');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '박상언', '010-9802-3628', (select id from approval_departments where name = '고객기술지원팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9802-3628');

-- ===== 자재관리팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '박지현', '010-8944-8491', (select id from approval_departments where name = '자재관리팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8944-8491');

-- ===== 재무회계팀 =====
-- 채유림은 006번 마이그레이션에서 이미 회계담당으로 등록되어 있어 자동으로 건너뜁니다.
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '채유림', '010-4083-7251', (select id from approval_departments where name = '재무회계팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4083-7251');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '김유진', '010-4780-4659', (select id from approval_departments where name = '재무회계팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-4780-4659');

-- ===== 국내영업팀 =====
insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '진대현', '010-9460-9786', (select id from approval_departments where name = '국내영업팀'), true, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-9460-9786');

insert into approval_employees (name, phone, department_id, is_team_leader, signup_status, is_active)
select '전철한', '010-8512-2833', (select id from approval_departments where name = '국내영업팀'), false, 'approved', true
where not exists (select 1 from approval_employees where phone = '010-8512-2833');
