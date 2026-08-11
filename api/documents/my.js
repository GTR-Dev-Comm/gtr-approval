const { getSupabase, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  let query = supabase
    .from('approval_documents')
    .select('id, title, content, status, current_step, created_at, doc_type_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code)')
    .eq('drafter_id', payload.sub)
    .order('created_at', { ascending: false });

  const { doc_type_code } = req.query || {};
  if (doc_type_code) {
    const { data: dt } = await supabase.from('approval_doc_types').select('id').eq('code', doc_type_code).maybeSingle();
    if (dt) query = query.eq('doc_type_id', dt.id);
  }

  const { data: documents, error } = await query;

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });

  const docIds = (documents || []).map((d) => d.id);
  let stepsByDoc = {};
  if (docIds.length > 0) {
    const { data: steps } = await supabase
      .from('approval_steps')
      .select('document_id, step_order, step_name, status, comment, acted_at, approver_id, approval_employees(name)')
      .in('document_id', docIds)
      .order('step_order', { ascending: true });
    (steps || []).forEach((s) => {
      if (!stepsByDoc[s.document_id]) stepsByDoc[s.document_id] = [];
      stepsByDoc[s.document_id].push(s);
    });
  }

  const result = (documents || []).map((d) => ({ ...d, steps: stepsByDoc[d.id] || [] }));

  return res.status(200).json({ documents: result });
};
