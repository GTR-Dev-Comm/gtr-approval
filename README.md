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

## 다음 단계 (아직 안 만든 것)
- 휴가신청서/지출결의서 작성 화면 (기안 화면)
- 결재라인에 따른 승인 화면 (팀장 → 회계팀)
- 지출결의서 영수증 첨부 (Supabase Storage 연동)
- 웹푸시 알림
