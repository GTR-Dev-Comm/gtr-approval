const { getSupabase, requireMaster } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireMaster(req, res);
  if (!payload) return;

  const { employee_id, name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer } = req.body || {};

  if (!employee_id || !name) {
    return res.status(400).json({ error: 'employee_id와 이름은 필수입니다.' });
  }
  if (phone && !/^01[0-9]-\d{3,4}-\d{4}$/.test(phone)) {
    return res.status(400).json({ error: '전화번호 형식이 올바르지 않습니다 (예: 010-1234-5678).' });
  }

  const supabase = getSupabase();

  const { data: existing, error: findErr } = await supabase
    .from('approval_employees')
    .select('id')
    .eq('id', employee_id)
    .maybeSingle();
  if (findErr || !existing) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });

  if (phone) {
    const { data: phoneTaken } = await supabase
      .from('approval_employees')
      .select('id')
      .eq('phone', phone)
      .neq('id', employee_id)
      .maybeSingle();
    if (phoneTaken) return res.status(409).json({ error: '이미 다른 직원이 사용 중인 전화번호입니다.' });
  }

  const { error: updateErr } = await supabase
    .from('approval_employees')
    .update({
      name,
      phone: phone || null,
      department_id: department_id || null,
      is_team_leader: !!is_team_leader,
      is_dev_director: !!is_dev_director,
      is_accounting_reviewer: !!is_accounting_reviewer,
    })
    .eq('id', employee_id);

  if (updateErr) return res.status(500).json({ error: '수정 중 오류가 발생했습니다.' });

  return res.status(200).json({ message: `${name}님 정보가 수정되었습니다.` });
};
