const { getSupabase, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data: me } = await supabase
    .from('approval_employees')
    .select('is_accounting_reviewer')
    .eq('id', payload.sub)
    .maybeSingle();

  if (!(me && me.is_accounting_reviewer) && !payload.is_master) {
    return res.status(403).json({ error: '회계담당만 처리할 수 있습니다.' });
  }

  const { document_id } = req.body || {};
  if (!document_id) return res.status(400).json({ error: 'document_id가 필요합니다.' });

  const { data: document, error } = await supabase
    .from('approval_documents')
    .select('id, title, drafter_id, status, fulfillment_status, doc_type_id, approval_doc_types(code)')
    .eq('id', document_id)
    .maybeSingle();

  if (error || !document) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (document.status !== 'approved') {
    return res.status(409).json({ error: '아직 결재가 완료되지 않은 문서입니다.' });
  }
  if (!['pending_payment', 'pending_purchase'].includes(document.fulfillment_status)) {
    return res.status(409).json({ error: '이미 처리되었거나 처리할 항목이 없는 문서입니다.' });
  }

  const nextStatus = document.fulfillment_status === 'pending_payment' ? 'paid' : 'purchased';
  const label = nextStatus === 'paid' ? '지급완료' : '구매완료';

  const { error: updateErr } = await supabase
    .from('approval_documents')
    .update({ fulfillment_status: nextStatus, fulfilled_at: new Date().toISOString() })
    .eq('id', document.id);

  if (updateErr) return res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });

  await supabase.from('approval_notifications').insert({
    employee_id: document.drafter_id,
    document_id: document.id,
    message: `"${document.title}" 문서가 ${label} 처리되었습니다.`,
  });

  return res.status(200).json({ message: `${label} 처리되었습니다.`, fulfillment_status: nextStatus });
};
