const bcrypt = require('bcryptjs');
const { getSupabase, signSession } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { phone, login_id, password } = req.body || {};
  if (!phone || !login_id || !password) {
    return res.status(400).json({ error: '전화번호, 아이디, 비밀번호를 모두 입력해주세요.' });
  }
  if (login_id.length < 4 || password.length < 6) {
    return res.status(400).json({ error: '아이디는 4자 이상, 비밀번호는 6자 이상이어야 합니다.' });
  }

  const supabase = getSupabase();

  const { data: employee, error } = await supabase
    .from('approval_employees')
    .select('*')
    .eq('phone', phone)
    .is('login_id', null)
    .maybeSingle();

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  if (!employee) {
    return res.status(404).json({
      error: '등록된 전화번호를 찾을 수 없습니다. 이미 설정을 완료하셨거나, 명단에 없는 번호일 수 있습니다. 관리자에게 문의해주세요.',
    });
  }

  const { data: idTaken } = await supabase
    .from('approval_employees')
    .select('id')
    .eq('login_id', login_id)
    .maybeSingle();
  if (idTaken) {
    return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
  }

  const password_hash = await bcrypt.hash(password, 10);

  const { data: updated, error: updateErr } = await supabase
    .from('approval_employees')
    .update({ login_id, password_hash, is_active: true })
    .eq('id', employee.id)
    .select()
    .single();

  if (updateErr || !updated) {
    return res.status(500).json({ error: '계정 설정 중 오류가 발생했습니다.' });
  }

  let departmentName = null;
  if (updated.department_id) {
    const { data: dept } = await supabase
      .from('approval_departments')
      .select('name')
      .eq('id', updated.department_id)
      .maybeSingle();
    departmentName = dept ? dept.name : null;
  }

  const token = signSession(updated);
  res.setHeader(
    'Set-Cookie',
    `gtr_approval_session=${encodeURIComponent(token)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax; Secure`
  );

  return res.status(200).json({
    token,
    employee: {
      id: updated.id,
      name: updated.name,
      login_id: updated.login_id,
      is_team_leader: updated.is_team_leader,
      is_dev_director: updated.is_dev_director,
      is_accounting_reviewer: updated.is_accounting_reviewer,
      department_name: departmentName,
    },
  });
};
