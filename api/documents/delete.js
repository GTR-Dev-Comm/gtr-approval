const { getSupabase, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { document_id } = req.body || {};
  if (!document_id) return res.status(400).json({ error: 'document_id가 필요합니다.' });

  const supabase = getSupabase();

  const { data: doc, error } = await supabase
    .from('approval_documents')
    .select('id, drafter_id, status')
    .eq('id', document_id)
    .maybeSingle();

  if (error || !doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.drafter_id !== payload.sub) {
    return res.status(403).json({ error: '본인이 작성한 문서만 삭제할 수 있습니다.' });
  }
  if (!['draft', 'rejected'].includes(doc.status)) {
    return res.status(409).json({ error: '임시저장 또는 반려된 문서만 삭제할 수 있습니다.' });
  }

  // approval_notifications 테이블은 cascade 삭제가 안 걸려있을 수 있어 먼저 정리
  await supabase.from('approval_notifications').delete().eq('document_id', document_id);

  const { error: delErr } = await supabase.from('approval_documents').delete().eq('id', document_id);
  if (delErr) return res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });

  return res.status(200).json({ message: '삭제되었습니다.' });
};
