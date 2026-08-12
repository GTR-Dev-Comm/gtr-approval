const bcrypt = require('bcryptjs');
const { getSupabase, signSession } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { login_id, password, name, department_id } = req.body || {};

  if (!login_id || !password || !name) {
    return res.status(400).json({ error: '아이디, 비밀번호, 이름은 필수입니다.' });
  }
  if (login_id.length < 4 || password.length < 6) {
    return res.status(400).json({ error: '아이디는 4자 이상, 비밀번호는 6자 이상이어야 합니다.' });
  }

  const supabase = getSupabase();

  // 아이디 중복 확인
  const { data: existing, error: checkErr } = await supabase
    .from('approval_employees')
    .select('id')
    .eq('login_id', login_id)
    .maybeSingle();

  if (checkErr) {
    return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
  if (existing) {
    return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });
  }

  const password_hash = await bcrypt.hash(password, 10);

  // 관리자 승인 없이 바로 활성화됩니다 (계정 관리는 관리자 페이지에서 사후에 가능합니다).
  const { data: created, error: insertErr } = await supabase
    .from('approval_employees')
    .insert({
      login_id,
      password_hash,
      name,
      department_id: department_id || null,
      signup_status: 'approved',
      is_active: true,
    })
    .select()
    .single();

  if (insertErr || !created) {
    return res.status(500).json({ error: '가입 처리 중 오류가 발생했습니다.' });
  }

  let departmentName = null;
  if (created.department_id) {
    const { data: dept } = await supabase
      .from('approval_departments')
      .select('name')
      .eq('id', created.department_id)
      .maybeSingle();
    departmentName = dept ? dept.name : null;
  }

  const token = signSession(created);
  res.setHeader(
    'Set-Cookie',
    `gtr_approval_session=${encodeURIComponent(token)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax; Secure`
  );

  return res.status(200).json({
    message: '가입이 완료되었습니다. 바로 로그인하실 수 있습니다.',
    token,
    employee: {
      id: created.id,
      name: created.name,
      login_id: created.login_id,
      is_team_leader: created.is_team_leader,
      is_dev_director: created.is_dev_director,
      is_accounting_reviewer: created.is_accounting_reviewer,
      is_master: false,
      department_name: departmentName,
    },
  });
};
