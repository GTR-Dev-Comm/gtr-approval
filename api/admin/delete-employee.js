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
    .select('id, name')
    .eq('id', employee_id)
    .maybeSingle();
  if (error || !employee) return res.status(404).json({ error: '직원을 찾을 수 없습니다.' });

  // 이 직원과 연결된 문서/결재 이력이 있으면 삭제를 막습니다 (데이터 보호)
  const { count: docCount } = await supabase
    .from('approval_documents')
    .select('id', { count: 'exact', head: true })
    .eq('drafter_id', employee_id);
  const { count: stepCount } = await supabase
    .from('approval_steps')
    .select('id', { count: 'exact', head: true })
    .eq('approver_id', employee_id);

  if ((docCount || 0) > 0 || (stepCount || 0) > 0) {
    return res.status(409).json({
      error: '이 직원이 작성했거나 결재에 관여한 문서가 있어 완전히 삭제할 수 없습니다. 대신 "비활성화"를 사용해주세요.',
    });
  }

  const { error: delErr } = await supabase.from('approval_employees').delete().eq('id', employee_id);
  if (delErr) return res.status(500).json({ error: '삭제 중 오류가 발생했습니다.' });

  return res.status(200).json({ message: `${employee.name}님의 계정이 완전히 삭제되었습니다.` });
};
