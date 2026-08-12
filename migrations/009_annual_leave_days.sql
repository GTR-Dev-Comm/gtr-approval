-- 직원별 연간 부여 연차일수 컬럼 추가 (기본 15일)
-- Supabase SQL Editor에서 실행하세요.

alter table approval_employees add column if not exists annual_leave_days numeric default 15;
