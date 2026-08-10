# 지티알 전자결의 — 2단계 (로그인/가입승인)

## 지금까지 만들어진 것
- `schema.sql` : Supabase에 실행할 DB 테이블 (기존 gtr-golf-manager 프로젝트에 추가)
- `public/index.html` : 로그인 / 가입 신청 화면
- `public/admin.html` : 관리자(mcjjang) 가입 승인 화면
- `api/auth/signup.js` : 가입 신청 처리
- `api/auth/login.js` : 로그인 처리 (mcjjang은 최초 로그인 시 자동으로 관리자 계정 생성됨)
- `api/admin/pending-employees.js` : 가입 대기자 조회/승인/반려
- `api/departments.js` : 부서 목록 조회

## 설정 방법 (순서대로)

### 1. Supabase에 테이블 만들기
1. 기존 `gtr-golf-manager` Supabase 프로젝트에 접속
2. SQL Editor 열기
3. `schema.sql` 내용 전체 복사해서 실행

### 2. 부서 등록
아직 부서 데이터가 없습니다. SQL Editor에서 아래처럼 필요한 부서를 등록해주세요. (팀 이름은 실제 사용하시는 이름으로 바꿔주세요)

```sql
insert into approval_departments (name) values
('영업팀'), ('설치팀'), ('AS팀'), ('회계팀'), ('경영지원팀');
```

### 3. Vercel에 새 프로젝트 생성
1. 이 폴더를 새 GitHub 리포지토리로 올리기 (예: `GTR-Dev-Comm/gtr-approval`)
2. Vercel에서 새 프로젝트로 연결
3. 아래 환경변수를 **기존 gtr-golf-manager 프로젝트와 동일한 값**으로 등록:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `APP_JWT_SECRET`
   - `MASTER_LOGIN_ID`
   - `MASTER_LOGIN_PW`

### 4. 배포 후 확인
1. 배포된 주소로 접속 → 기존 마스터 아이디/비밀번호로 로그인 → 자동으로 관리자 계정이 생성됩니다
2. 직원에게 가입 신청 링크 공유 → 가입 신청
3. `/admin.html`에서 mcjjang이 승인

## 3단계 (완료) — 문서 작성 / 결재 화면
새로 추가된 파일:
- `public/dashboard.html` : 로그인 후 메인 화면 (새 문서 작성 / 내 문서 / 결재할 문서 탭)
- `api/doc-types.js` : 문서 종류 조회
- `api/documents/create.js` : 문서 상신 (결재라인 자동 지정: 담당팀장 → 회계팀장)
- `api/documents/my.js` : 내가 상신한 문서 목록
- `api/documents/pending.js` : 내가 결재해야 할 문서 목록
- `api/documents/act.js` : 승인/반려 처리
- `api/attachments/upload.js` : 영수증 등 첨부파일 업로드 (Supabase Storage)
- `api/attachments/list.js` : 첨부파일 다운로드 링크 조회

### 결재라인이 자동으로 정해지는 방식
- 1차: 기안자의 소속 부서에서 `is_team_leader = true`인 직원
- 2차: `회계팀` 부서에서 `is_team_leader = true`인 직원
- **아직 팀장을 지정 안 하셨다면** 둘 다 자동으로 mcjjang(관리자) 계정이 승인자가 됩니다. 즉 팀장 지정 전에도 시스템은 바로 쓸 수 있고, 나중에 Supabase Table Editor에서 `approval_employees` 테이블의 `is_team_leader`를 체크해주시면 그 사람이 자동으로 승인자가 됩니다.

### 적용 방법
1. 새로 추가된 파일들을 기존 GitHub 저장소(`gtr-approval`)에 업로드 (같은 경로에 있는 파일은 자동으로 덮어써집니다)
2. Vercel이 자동으로 다시 배포합니다 (GitHub 연결되어 있으면 별도로 Redeploy 안 눌러도 됩니다)
3. 배포 끝나면 로그인 후 자동으로 `/dashboard.html`로 이동 → 새 문서 작성 탭에서 휴가신청서/지출결의서 작성 테스트

## 4단계 (완료) — 실제 종이 양식 그대로 재현한 입력 화면
- 휴가신청서 / 지출결의서 / 구매요청서 3종을 실제 양식(업로드해주신 PDF) 모양 그대로 화면에 구현했습니다.
- 입력창이 아니라 **양식 표 위에 바로 타이핑**하는 방식입니다.
- 지출결의서·구매요청서는 표 안에 "+ 행 추가"로 여러 줄(영수증 여러 건 등)을 넣을 수 있고, 금액 합계가 자동 계산됩니다.
- 결재할 문서 탭에서도 승인자가 같은 양식 모양으로 문서를 확인할 수 있습니다.
- 적용 전 `migrations/003_add_purchase_doctype.sql`을 Supabase SQL Editor에서 먼저 실행해주세요 (구매요청서 문서종류 추가 + 기존 문서 정보 업데이트).
- `public/dashboard.html` 전체가 새로 바뀌었으니, GitHub에 다시 올려서 덮어써주세요.

### 참고
- 화면 상단 "작성자/개발이사/담당" 같은 결재란은 실제 종이 양식과 똑같은 모양을 보여주기 위한 표시용이고, 실제 결재는 여전히 시스템이 자동으로 "담당팀장 → 회계팀장" 순서로 처리합니다.
- 관리자용 직원/부서/팀장 관리 화면 (지금은 Supabase Table Editor에서 직접 수정)
- 웹푸시 알림 (지금은 알림이 DB에는 쌓이지만 화면에 푸시로 뜨지는 않음)
- 문서 상세/인쇄(PDF) 화면
