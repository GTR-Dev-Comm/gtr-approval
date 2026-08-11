const { getSupabase, requireAuth } = require('../_lib');

const MGMT_SUPPORT_DEPT_NAME = '경영지원팀';

async function buildStepPlan(supabase, drafter) {
  const { data: master } = await supabase
    .from('approval_employees')
    .select('id')
    .eq('login_id', process.env.MASTER_LOGIN_ID)
    .maybeSingle();

  async function findTeamLeader(departmentId, excludeId) {
    if (!departmentId) return null;
    let query = supabase
      .from('approval_employees')
      .select('id')
      .eq('department_id', departmentId)
      .eq('is_team_leader', true)
      .eq('signup_status', 'approved');
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    return data;
  }

  let approvalGroup = 'B';
  if (drafter.department_id) {
    const { data: dept } = await supabase
      .from('approval_departments')
      .select('approval_group')
      .eq('id', drafter.department_id)
      .maybeSingle();
    if (dept && dept.approval_group) approvalGroup = dept.approval_group;
  }

  const stepPlan = [];

  // 1) 담당팀장 (없으면 이 단계는 건너뜀)
  const teamLeader = await findTeamLeader(drafter.department_id, drafter.id);
  if (teamLeader) {
    stepPlan.push({ step_name: '담당팀장 승인', approver: teamLeader });
  }

  // 2) 개발이사 (A그룹만)
  if (approvalGroup === 'A') {
    const { data: devDirector } = await supabase
      .from('approval_employees')
      .select('id')
      .eq('is_dev_director', true)
      .eq('signup_status', 'approved')
      .maybeSingle();
    stepPlan.push({ step_name: '개발이사 승인', approver: devDirector || master });
  }

  // 3) 회계담당 (전 부서 공통)
  const { data: accountingReviewer } = await supabase
    .from('approval_employees')
    .select('id')
    .eq('is_accounting_reviewer', true)
    .eq('signup_status', 'approved')
    .maybeSingle();
  stepPlan.push({ step_name: '회계담당 승인', approver: accountingReviewer || master });

  // 4) 경영지원팀장 (전 부서 공통, 최종 단계)
  const { data: mgmtDept } = await supabase
    .from('approval_departments')
    .select('id')
    .eq('name', MGMT_SUPPORT_DEPT_NAME)
    .maybeSingle();
  const mgmtLeader = mgmtDept ? await findTeamLeader(mgmtDept.id, null) : null;
  stepPlan.push({ step_name: '경영지원팀장 승인', approver: mgmtLeader || master });

  return stepPlan;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { doc_type_code, title, content, action, document_id } = req.body || {};
  if (!doc_type_code || !title || !content) {
    return res.status(400).json({ error: '문서종류, 제목, 내용은 필수입니다.' });
  }
  const mode = action === 'draft' ? 'draft' : 'submit';

  const supabase = getSupabase();

  const { data: drafter, error: drafterErr } = await supabase
    .from('approval_employees')
    .select('*')
    .eq('id', payload.sub)
    .maybeSingle();
  if (drafterErr || !drafter) {
    return res.status(401).json({ error: '작성자 정보를 확인할 수 없습니다.' });
  }

  const { data: docType, error: docTypeErr } = await supabase
    .from('approval_doc_types')
    .select('id, code, name')
    .eq('code', doc_type_code)
    .maybeSingle();
  if (docTypeErr || !docType) {
    return res.status(400).json({ error: '알 수 없는 문서 종류입니다.' });
  }

  let document = null;
  if (document_id) {
    const { data: existing, error: existingErr } = await supabase
      .from('approval_documents')
      .select('*')
      .eq('id', document_id)
      .maybeSingle();
    if (existingErr || !existing) {
      return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
    }
    if (existing.drafter_id !== drafter.id) {
      return res.status(403).json({ error: '본인이 작성한 문서만 수정할 수 있습니다.' });
    }
    if (existing.status !== 'draft') {
      return res.status(409).json({ error: '이미 상신되었거나 처리된 문서는 수정할 수 없습니다.' });
    }
    const { data: updated, error: updateErr } = await supabase
      .from('approval_documents')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', document_id)
      .select()
      .single();
    if (updateErr || !updated) {
      return res.status(500).json({ error: '문서 저장 중 오류가 발생했습니다.' });
    }
    document = updated;
  } else {
    const { data: created, error: createErr } = await supabase
      .from('approval_documents')
      .insert({
        doc_type_id: docType.id,
        drafter_id: drafter.id,
        title,
        content,
        status: 'draft',
        current_step: 0,
      })
      .select()
      .single();
    if (createErr || !created) {
      return res.status(500).json({ error: '문서 생성 중 오류가 발생했습니다.' });
    }
    document = created;
  }

  if (mode === 'draft') {
    return res.status(200).json({ message: '임시저장되었습니다.', document_id: document.id, status: 'draft' });
  }

  const stepPlan = await buildStepPlan(supabase, drafter);
  if (stepPlan.length === 0 || stepPlan.some((s) => !s.approver)) {
    return res.status(500).json({
      error: '결재자를 찾을 수 없습니다. 관리자에게 부서/팀장/역할 설정을 확인해달라고 요청해주세요.',
    });
  }

  const { error: statusErr } = await supabase
    .from('approval_documents')
    .update({ status: 'pending', current_step: 1, updated_at: new Date().toISOString() })
    .eq('id', document.id);
  if (statusErr) {
    return res.status(500).json({ error: '상신 처리 중 오류가 발생했습니다.' });
  }

  const stepsToInsert = stepPlan.map((s, idx) => ({
    document_id: document.id,
    step_order: idx + 1,
    step_name: s.step_name,
    approver_id: s.approver.id,
    status: idx === 0 ? 'waiting' : 'pending',
  }));

  const { error: stepsErr } = await supabase.from('approval_steps').insert(stepsToInsert);
  if (stepsErr) {
    return res.status(500).json({ error: '결재라인 생성 중 오류가 발생했습니다.' });
  }

  await supabase.from('approval_notifications').insert({
    employee_id: stepPlan[0].approver.id,
    document_id: document.id,
    message: `${drafter.name}님이 상신한 "${title}" 문서가 결재를 기다리고 있습니다.`,
  });

  return res.status(200).json({ message: '상신되었습니다.', document_id: document.id, status: 'pending' });
};
