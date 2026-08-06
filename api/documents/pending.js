const { getSupabase, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data: steps, error } = await supabase
    .from('approval_steps')
    .select(
      'id, step_order, step_name, status, document_id, approval_documents(id, title, content, created_at, doc_type_id, drafter_id, approval_doc_types(name, code), approval_employees(name))'
    )
    .eq('approver_id', payload.sub)
    .eq('status', 'waiting')
    .order('id', { ascending: true });

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });

  return res.status(200).json({ pending: steps || [] });
};
