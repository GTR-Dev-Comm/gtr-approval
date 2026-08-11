const { getSupabase, requireMaster } = require('../_lib');

module.exports = async (req, res) => {
  const payload = requireMaster(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('approval_documents')
    .select('id, title, status, created_at, approval_doc_types(name), approval_employees(name)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });

  return res.status(200).json({ documents: data || [] });
};
