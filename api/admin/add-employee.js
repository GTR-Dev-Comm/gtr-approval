const { getSupabase, requireMaster } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireMaster(req, res);
  if (!payload) return;

  const { name, phone, department_id, is_team_leader, is_dev_director, is_accounting_reviewer } = req.body || {};

  if (!name || !phone) {
    return res.status(400).json({ error: '이름과 전화번호는 필수입니다.' });
  }
  if (!/^01[0-9]-\d{3,4}-\d{4}$/.test(phone)) {
    return res.status(400).json({ error: '전화번호 형식이 올바르지 않습니다 (예: 010-1234-5678).' });
  }

  const supabase = getSupabase();

  const { data: existing, error: checkErr } = await supabase
    .from('approval_employees')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();
  if (checkErr) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  if (existing) return res.status(409).json({ error: '이미 등록된 전화번호입니다.' });

  const { error: insertErr } = await supabase.from('approval_employees').insert({
    name,
    phone,
    department_id: department_id || null,
    is_team_leader: !!is_team_leader,
    is_dev_director: !!is_dev_director,
    is_accounting_reviewer: !!is_accounting_reviewer,
    signup_status: 'approved',
    is_active: true,
  });

  if (insertErr) return res.status(500).json({ error: '등록 중 오류가 발생했습니다.' });

  return res.status(200).json({
    message: `${name}님이 등록되었습니다. 본인이 "최초 설정"에서 전화번호(${phone})로 아이디/비밀번호를 만들면 바로 사용할 수 있습니다.`,
  });
};
