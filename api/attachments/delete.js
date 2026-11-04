const { getSupabase, requireAuth } = require('../_lib');

const BUCKET = 'approval-attachments';

// 작성자가 수정 중(임시저장 상태)인 본인 문서의 첨부파일을 삭제합니다.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { attachment_id } = req.body || {};
  if (!attachment_id) return res.status(400).json({ error: 'attachment_id가 필요합니다.' });

  const supabase = getSupabase();

  const { data: att } = await supabase
    .from('approval_attachments')
    .select('id, document_id, file_path')
    .eq('id', attachment_id)
    .maybeSingle();
  if (!att) return res.status(404).json({ error: '첨부파일을 찾을 수 없습니다.' });

  const { data: doc } = await supabase
    .from('approval_documents')
    .select('id, drafter_id, status')
    .eq('id', att.document_id)
    .maybeSingle();
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.drafter_id !== payload.sub && !payload.is_master) {
    return res.status(403).json({ error: '본인이 작성한 문서의 첨부파일만 삭제할 수 있습니다.' });
  }
  if (doc.status !== 'draft' && !payload.is_master) {
    return res.status(409).json({ error: '수정 중인 문서(임시저장)의 첨부파일만 삭제할 수 있습니다.' });
  }

  await supabase.storage.from(BUCKET).remove([att.file_path]); // 저장소 파일 삭제 (실패해도 목록에서는 제거)
  const { error } = await supabase.from('approval_attachments').delete().eq('id', attachment_id);
  if (error) return res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });

  return res.status(200).json({ message: '삭제되었습니다.' });
};
