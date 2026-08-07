-- 지출결의서의 "항목" 필드를 선택(select)에서 직접입력(text)으로 변경
-- Supabase SQL Editor에서 이 파일 내용을 실행하세요.

update approval_doc_types
set form_schema = jsonb_set(
  form_schema,
  '{fields}',
  (
    select jsonb_agg(
      case
        when field->>'key' = 'category' then
          jsonb_build_object(
            'key', 'category',
            'label', field->>'label',
            'type', 'text',
            'required', (field->>'required')::boolean
          )
        else field
      end
    )
    from jsonb_array_elements(form_schema->'fields') as field
  )
)
where code = 'expense';

-- 확인용: 아래를 실행해서 category 필드가 "type": "text" 로 바뀌었는지 확인하세요
-- select form_schema from approval_doc_types where code = 'expense';
