-- ============================================
-- 지티알 전자결의 시스템 DB 스키마
-- (기존 gtr-golf-manager Supabase 프로젝트에 새 테이블만 추가)
-- ============================================

-- 1. 부서/팀 테이블
create table if not exists approval_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,              -- 예: '영업팀', '회계팀', '설치팀'
  created_at timestamptz default now()
);

-- 2. 직원 테이블 (기존 로그인 계정과 연결)
create table if not exists approval_employees (
  id uuid primary key default gen_random_uuid(),
  login_id text not null unique,   -- 직원이 직접 정하는 로그인 아이디
  password_hash text not null,     -- bcrypt 해시 (평문 저장 안 함)
  name text not null,              -- 실명 (예: 홍길동)
  department_id uuid references approval_departments(id),
  is_team_leader boolean default false,   -- 팀장 여부 (결재라인 자동 지정용)
  signup_status text not null default 'pending',  -- pending | approved | rejected
  is_active boolean default true,
  created_at timestamptz default now(),
  approved_at timestamptz
);

-- 3. 문서 종류 (휴가신청서, 지출결의서 ...)
create table if not exists approval_doc_types (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,       -- 'vacation', 'expense'
  name text not null,              -- '휴가신청서', '지출결의서'
  form_schema jsonb not null,      -- 입력폼 필드 정의 (아래 예시 참고)
  created_at timestamptz default now()
);

-- 4. 결재라인 템플릿 (문서종류별 승인 순서)
create table if not exists approval_line_templates (
  id uuid primary key default gen_random_uuid(),
  doc_type_id uuid references approval_doc_types(id),
  step_order int not null,         -- 1, 2, 3 ...
  approver_type text not null,     -- 'team_leader' | 'department' | 'specific_person'
  approver_department_id uuid references approval_departments(id), -- department 방식일 때
  approver_employee_id uuid references approval_employees(id),     -- specific_person 방식일 때
  step_name text not null          -- '팀장 승인', '회계팀 승인'
);

-- 5. 결재 문서 (실제 상신된 건)
create table if not exists approval_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type_id uuid references approval_doc_types(id),
  drafter_id uuid references approval_employees(id),   -- 기안자
  title text not null,
  content jsonb not null,          -- 실제 입력값 (휴가 기간, 금액 등)
  status text not null default 'pending',  -- pending | approved | rejected | canceled
  current_step int not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. 결재 이력/단계별 상태
create table if not exists approval_steps (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references approval_documents(id) on delete cascade,
  step_order int not null,
  step_name text not null,
  approver_id uuid references approval_employees(id),  -- 실제 이 문서를 승인할 사람
  status text not null default 'waiting',  -- waiting | approved | rejected
  comment text,                            -- 반려 사유 등
  acted_at timestamptz
);

-- 7. 첨부파일 (영수증 등, 문서 1건당 여러 장 가능)
create table if not exists approval_attachments (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references approval_documents(id) on delete cascade,
  file_name text not null,
  file_path text not null,         -- Supabase Storage 경로 (예: 'expense/2026/08/xxxx.pdf')
  file_type text not null,         -- 'image' | 'pdf'
  file_size int,                   -- bytes
  uploaded_at timestamptz default now()
);

-- 8. 알림 (웹푸시용, 캘린더 앱과 동일 패턴)
create table if not exists approval_notifications (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references approval_employees(id),
  document_id uuid references approval_documents(id),
  message text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ============================================
-- 초기 데이터 예시
-- ============================================

-- 문서 종류 2개 등록 (폼 필드 정의 포함)
insert into approval_doc_types (code, name, form_schema) values
('vacation', '휴가신청서', '{
  "fields": [
    {"key": "start_date", "label": "시작일", "type": "date", "required": true},
    {"key": "end_date", "label": "종료일", "type": "date", "required": true},
    {"key": "vacation_type", "label": "휴가종류", "type": "select", "options": ["연차", "반차", "경조사"], "required": true},
    {"key": "reason", "label": "사유", "type": "textarea", "required": false}
  ]
}'),
('expense', '지출결의서', '{
  "fields": [
    {"key": "expense_date", "label": "지출일", "type": "date", "required": true},
    {"key": "amount", "label": "금액", "type": "number", "required": true},
    {"key": "category", "label": "항목", "type": "select", "options": ["출장비", "소모품비", "접대비", "기타"], "required": true},
    {"key": "description", "label": "내용", "type": "textarea", "required": true}
  ],
  "attachments": {
    "label": "영수증 첨부",
    "multiple": true,
    "accept": ["image/jpeg", "image/png", "application/pdf"],
    "required": true
  }
}')
on conflict (code) do nothing;

-- RLS 활성화 (기존 시스템과 동일하게 서버사이드에서만 쓰기 가능하도록)
alter table approval_departments enable row level security;
alter table approval_employees enable row level security;
alter table approval_doc_types enable row level security;
alter table approval_line_templates enable row level security;
alter table approval_documents enable row level security;
alter table approval_steps enable row level security;
alter table approval_attachments enable row level security;
alter table approval_notifications enable row level security;

-- 서비스 롤(백엔드 API)만 접근 가능, 클라이언트 직접 접근 차단
-- (정책은 기존 gtr-golf-manager와 동일하게 service_role만 all 허용하는 방식 권장)
