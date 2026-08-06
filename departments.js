const { getSupabase } = require('./_lib');

module.exports = async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('approval_departments')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  return res.status(200).json({ departments: data });
};
