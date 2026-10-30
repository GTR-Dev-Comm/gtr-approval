const { getSupabase, requireMaster } = require('../_lib');

// 이미 상신되어 "담당팀장 결재 대기"에 멈춰 있는 개발이사 라인(A그룹) 문서를
// 팀장 단계를 빼고 바로 개발이사 차례로 옮깁니다. (팀장이 이미 처리한 문서는 건드리지 않습니다)
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireMaster(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data: aDepts } = await supabase.from('approval_departments').select('id').eq('approval_group', 'A');
  const aIds = (aDepts || []).map((d) => d.id);
  if (aIds.length === 0) return res.status(200).json({ moved: 0, message: '개발이사 라인 부서가 없습니다.' });

  const { data: docs, error } = await supabase
    .from('approval_documents')
    .select('id, title, approval_employees(name, department_id)')
    .eq('status', 'pending');
  if (error) return res.status(500).json({ error: '문서 조회 중 오류가 발생했습니다.' });

  const targets = (docs || []).filter((d) => d.approval_employees && aIds.includes(d.approval_employees.department_id));

  let moved = 0;
  for (const d of targets) {
    const { data: steps } = await supabase
      .from('approval_steps')
      .select('id, step_order, step_name, status, approver_id')
      .eq('document_id', d.id)
      .order('step_order', { ascending: true });

    const leader = (steps || []).find((s) => (s.step_name || '').startsWith('담당팀장'));
    if (!leader || leader.status !== 'waiting') continue; // 팀장 단계가 없거나 이미 처리된 문서는 그대로 둡니다
    const rest = steps.filter((s) => s.id !== leader.id);
    if (rest.length === 0) continue;

    await supabase.from('approval_steps').delete().eq('id', leader.id);
    for (let i = 0; i < rest.length; i++) {
      const update = { step_order: i + 1 };
      if (i === 0) update.status = 'waiting'; // 첫 단계(개발이사)를 지금 차례로
      await supabase.from('approval_steps').update(update).eq('id', rest[i].id);
    }
    await supabase
      .from('approval_documents')
      .update({ current_step: 1, updated_at: new Date().toISOString() })
      .eq('id', d.id);
    await supabase.from('approval_notifications').insert({
      employee_id: rest[0].approver_id,
      document_id: d.id,
      message: `"${d.title}" 문서가 결재를 기다리고 있습니다.`,
    });
    moved++;
  }

  return res.status(200).json({
    moved,
    message: moved > 0 ? `${moved}건의 문서를 담당팀장 단계 없이 개발이사 차례로 옮겼습니다.` : '옮길 문서가 없습니다.',
  });
};
