-- 구매요청서 문서종류 추가
-- Supabase SQL Editor에서 실행하세요.

insert into approval_doc_types (code, name, form_schema) values
('purchase', '구매요청서', '{"layout": "purchase_form"}')
on conflict (code) do nothing;

-- 참고: 휴가신청서/지출결의서/구매요청서는 이제 화면(dashboard.html)에서
-- 실제 종이 양식과 동일한 모양으로 직접 코딩되어 있어서, form_schema는
-- 문서 종류를 구분하는 용도로만 쓰입니다 (레이아웃은 코드에 내장됨).
update approval_doc_types set form_schema = '{"layout": "vacation_form"}' where code = 'vacation';
update approval_doc_types set form_schema = '{"layout": "expense_form"}' where code = 'expense';
