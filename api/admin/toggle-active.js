const { getSupabase, requireMaster } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireMaster(req, res);
  if (!payload) return;

  const { employee_id } = req.body || {};
  if (!employee_id) return res.status(400).json({ error: 'employee_id가 필요합니다.' });

  const supabase = getSupabase();

  const { data: employee, error } = await supabase
    .from('approval_employees')
    .select('id, name, is_active')
    .eq('id', employee_id)
    .maybeSingle();

  if (error || !employee) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });

  const { error: updateErr } = await supabase
    .from('approval_employees')
    .update({ is_active: !employee.is_active })
    .eq('id', employee_id);

  if (updateErr) return res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });

  return res.status(200).json({
    message: `${employee.name}님 계정이 ${!employee.is_active ? '활성화' : '비활성화'}되었습니다.`,
    is_active: !employee.is_active,
  });
};
