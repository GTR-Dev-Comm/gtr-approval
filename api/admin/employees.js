const { getSupabase, requireMaster } = require('../_lib');

module.exports = async (req, res) => {
  const payload = requireMaster(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('approval_employees')
    .select('id, name, login_id, phone, is_active, signup_status, is_team_leader, is_dev_director, is_accounting_reviewer, approval_departments(name)')
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  return res.status(200).json({ employees: data || [] });
};
