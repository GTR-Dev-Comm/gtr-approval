const { getSupabase, requireMaster } = require('../_lib');

module.exports = async (req, res) => {
  const payload = requireMaster(req, res);
  if (!payload) return; // requireMaster가 이미 401/403 응답을 보냄

  const supabase = getSupabase();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('approval_employees')
      .select('id, login_id, name, department_id, signup_status, created_at')
      .eq('signup_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
    return res.status(200).json({ pending: data });
  }

  if (req.method === 'POST') {
    // body: { employee_id, action: 'approve' | 'reject', department_id? }
    const { employee_id, action, department_id } = req.body || {};
    if (!employee_id || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'employee_id와 action(approve/reject)이 필요합니다.' });
    }

    const update = {
      signup_status: action === 'approve' ? 'approved' : 'rejected',
      approved_at: new Date().toISOString(),
    };
    if (department_id) update.department_id = department_id;

    const { error } = await supabase
      .from('approval_employees')
      .update(update)
      .eq('id', employee_id);

    if (error) return res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
    return res.status(200).json({ message: action === 'approve' ? '승인되었습니다.' : '반려되었습니다.' });
  }

  return res.status(405).json({ error: '허용되지 않는 요청입니다.' });
};
