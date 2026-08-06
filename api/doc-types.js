const { getSupabase, requireAuth } = require('./_lib');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('approval_doc_types')
    .select('id, code, name, form_schema')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  return res.status(200).json({ doc_types: data });
};
