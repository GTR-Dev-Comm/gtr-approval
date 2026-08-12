const { getSupabase, requireMaster } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireMaster(req, res);
  if (!payload) return;

  const { employee_id, annual_leave_days } = req.body || {};
  const days = Number(annual_leave_days);
  if (!employee_id || isNaN(days) || days < 0) {
    return res.status(400).json({ error: 'employee_id와 0 이상의 숫자 annual_leave_days가 필요합니다.' });
  }

  const supabase = getSupabase();
  const { error } = await supabase
    .from('approval_employees')
    .update({ annual_leave_days: days })
    .eq('id', employee_id);

  if (error) return res.status(500).json({ error: '설정 중 오류가 발생했습니다.' });
  return res.status(200).json({ message: '연차 일수가 설정되었습니다.' });
};
