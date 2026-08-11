const bcrypt = require('bcryptjs');
const { getSupabase, requireMaster } = require('../_lib');

function randomPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireMaster(req, res);
  if (!payload) return;

  const { employee_id, new_password } = req.body || {};
  if (!employee_id) return res.status(400).json({ error: 'employee_id가 필요합니다.' });

  const supabase = getSupabase();

  const { data: employee, error } = await supabase
    .from('approval_employees')
    .select('id, name, login_id')
    .eq('id', employee_id)
    .maybeSingle();

  if (error || !employee) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });
  if (!employee.login_id) {
    return res.status(409).json({ error: '아직 아이디가 없는 직원입니다. "최초 설정" 탭에서 전화번호로 계정을 만들어야 합니다.' });
  }

  const finalPassword = (new_password && new_password.length >= 6) ? new_password : randomPassword();
  const password_hash = await bcrypt.hash(finalPassword, 10);

  const { error: updateErr } = await supabase
    .from('approval_employees')
    .update({ password_hash })
    .eq('id', employee_id);

  if (updateErr) return res.status(500).json({ error: '초기화 중 오류가 발생했습니다.' });

  return res.status(200).json({
    message: '비밀번호가 초기화되었습니다.',
    login_id: employee.login_id,
    new_password: finalPassword,
  });
};
