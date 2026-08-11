-- 승인완료 이후 추가 진행 단계 (지출결의서: 지급완료 / 구매요청서: 구매완료)
-- Supabase SQL Editor에서 실행하세요.

alter table approval_documents add column if not exists fulfillment_status text;
alter table approval_documents add column if not exists fulfilled_at timestamptz;

-- fulfillment_status 값:
--   지출결의서: 'pending_payment' (지급대기) -> 'paid' (지급완료)
--   구매요청서: 'pending_purchase' (구매대기) -> 'purchased' (구매완료)
--   휴가신청서: 사용 안 함 (null 유지, 승인완료가 최종 상태)
