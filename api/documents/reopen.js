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
    return res.status(403).json({ error: '본인이 작성한 문서만 수정할 수 있습니다.' });
  }
  if (doc.status !== 'rejected') {
    return res.status(409).json({ error: '반려된 문서만 이 방법으로 수정할 수 있습니다.' });
  }

  // 기존 결재 이력을 지우고 임시저장 상태로 되돌립니다 (다시 상신하면 결재라인이 새로 생성됩니다)
  await supabase.from('approval_steps').delete().eq('document_id', document_id);

  const { error: updateErr } = await supabase
    .from('approval_documents')
    .update({ status: 'draft', current_step: 0, fulfillment_status: null, fulfilled_at: null, updated_at: new Date().toISOString() })
    .eq('id', document_id);

  if (updateErr) return res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });

  return res.status(200).json({ message: '수정 가능한 상태로 되돌렸습니다.' });
};
