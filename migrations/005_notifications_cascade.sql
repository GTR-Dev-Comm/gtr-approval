-- approval_notifications.document_id 외래키에 on delete cascade 추가
-- (문서를 삭제할 때 관련 알림도 자동으로 함께 삭제되도록)
-- Supabase SQL Editor에서 실행하세요.

alter table approval_notifications drop constraint if exists approval_notifications_document_id_fkey;
alter table approval_notifications
  add constraint approval_notifications_document_id_fkey
  foreign key (document_id) references approval_documents(id) on delete cascade;
