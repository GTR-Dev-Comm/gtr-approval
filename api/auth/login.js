const bcrypt = require('bcryptjs');
const { getSupabase, signSession } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }

  const { login_id, password } = req.body || {};
  if (!login_id || !password) {
    return res.status(400).json({ error: '아이디와 비밀번호를 입력해주세요.' });
  }

  const supabase = getSupabase();

  let { data: employee, error } = await supabase
    .from('approval_employees')
    .select('*')
    .eq('login_id', login_id)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }

  const isMasterLogin =
    login_id === process.env.MASTER_LOGIN_ID && password === process.env.MASTER_LOGIN_PW;

  if (!employee && isMasterLogin) {
    // 마스터 계정 최초 로그인 시 자동으로 승인된 관리자 계정 생성 (별도 가입 절차 불필요)
    const password_hash = await bcrypt.hash(password, 10);
    const { data: created, error: createErr } = await supabase
      .from('approval_employees')
      .insert({
        login_id,
        password_hash,
        name: '관리자(mcjjang)',
        signup_status: 'approved',
        is_active: true,
        approved_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (createErr) return res.status(500).json({ error: '관리자 계정 생성 중 오류가 발생했습니다.' });
    employee = created;
  } else if (!employee) {
    return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
  } else if (!isMasterLogin) {
    if (!employee.password_hash) {
      return res.status(403).json({
        error: '아직 비밀번호가 설정되지 않은 계정입니다. "최초 설정" 탭에서 전화번호로 먼저 계정을 활성화해주세요.',
      });
    }
    const ok = await bcrypt.compare(password, employee.password_hash);
    if (!ok) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
  }

  if (employee.signup_status === 'pending') {
    return res.status(403).json({ error: '아직 관리자 승인 대기 중입니다.' });
  }
  if (employee.signup_status === 'rejected' || !employee.is_active) {
    return res.status(403).json({ error: '로그인이 제한된 계정입니다. 관리자에게 문의해주세요.' });
  }

  let departmentName = null;
  if (employee.department_id) {
    const { data: dept } = await supabase
      .from('approval_departments')
      .select('name')
      .eq('id', employee.department_id)
      .maybeSingle();
    departmentName = dept ? dept.name : null;
  }

  const token = signSession(employee);

  // 쿠키(30일)와 응답 본문 둘 다에 토큰을 실어줌 — 프론트에서 편한 방식으로 사용
  res.setHeader(
    'Set-Cookie',
    `gtr_approval_session=${encodeURIComponent(token)}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Lax; Secure`
  );

  return res.status(200).json({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      login_id: employee.login_id,
      is_team_leader: employee.is_team_leader,
      is_dev_director: employee.is_dev_director,
      is_accounting_reviewer: employee.is_accounting_reviewer,
      department_name: departmentName,
    },
  });
};
