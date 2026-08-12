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
    .select('id, name, phone, login_id')
    .eq('id', employee_id)
    .maybeSingle();

  if (error || !employee) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
  if (!employee.phone) {
    return res.status(409).json({ error: '전화번호가 등록되지 않은 직원은 초기화할 수 없습니다 (최초 설정을 다시 할 방법이 없습니다).' });
  }

  const { error: updateErr } = await supabase
    .from('approval_employees')
    .update({ login_id: null, password_hash: null })
    .eq('id', employee_id);

  if (updateErr) return res.status(500).json({ error: '초기화 중 오류가 발생했습니다.' });

  return res.status(200).json({ message: `${employee.name}님 계정이 초기화되었습니다. 이제 본인 전화번호로 "최초 설정"을 다시 진행할 수 있습니다.` });
};
