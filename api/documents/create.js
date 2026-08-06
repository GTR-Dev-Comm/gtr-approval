const { getSupabase, requireAuth } = require('../_lib');

const ACCOUNTING_DEPT_NAME = '회계팀';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { doc_type_code, title, content } = req.body || {};
  if (!doc_type_code || !title || !content) {
    return res.status(400).json({ error: '문서종류, 제목, 내용은 필수입니다.' });
  }

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

  // 마스터 계정을 최종 안전망 승인자로 사용 (담당팀장/회계팀장을 못 찾을 경우)
  const { data: master } = await supabase
    .from('approval_employees')
    .select('id')
    .eq('login_id', process.env.MASTER_LOGIN_ID)
    .maybeSingle();

  // 1차 승인자: 기안자 소속 부서의 팀장
  let step1Approver = null;
  if (drafter.department_id) {
    const { data: leader } = await supabase
      .from('approval_employees')
      .select('id')
      .eq('department_id', drafter.department_id)
      .eq('is_team_leader', true)
      .eq('signup_status', 'approved')
      .neq('id', drafter.id)
      .maybeSingle();
    step1Approver = leader || null;
  }
  if (!step1Approver) step1Approver = master;

  // 2차 승인자: 회계팀 팀장
  const { data: accountingDept } = await supabase
    .from('approval_departments')
    .select('id')
    .eq('name', ACCOUNTING_DEPT_NAME)
    .maybeSingle();

  let step2Approver = null;
  if (accountingDept) {
    const { data: leader } = await supabase
      .from('approval_employees')
      .select('id')
      .eq('department_id', accountingDept.id)
      .eq('is_team_leader', true)
      .eq('signup_status', 'approved')
      .maybeSingle();
    step2Approver = leader || null;
  }
  if (!step2Approver) step2Approver = master;

  if (!step1Approver || !step2Approver) {
    return res.status(500).json({
      error: '결재자를 찾을 수 없습니다. 관리자에게 부서/팀장 설정을 확인해달라고 요청해주세요.',
    });
  }

  const { data: document, error: docErr } = await supabase
    .from('approval_documents')
    .insert({
      doc_type_id: docType.id,
      drafter_id: drafter.id,
      title,
      content,
      status: 'pending',
      current_step: 1,
    })
    .select()
    .single();

  if (docErr || !document) {
    return res.status(500).json({ error: '문서 생성 중 오류가 발생했습니다.' });
  }

  const { error: stepsErr } = await supabase.from('approval_steps').insert([
    {
      document_id: document.id,
      step_order: 1,
      step_name: '담당팀장 승인',
      approver_id: step1Approver.id,
      status: 'waiting', // 지금 바로 승인 가능한 상태
    },
    {
      document_id: document.id,
      step_order: 2,
      step_name: '회계팀 승인',
      approver_id: step2Approver.id,
      status: 'pending', // 1차 승인 전까지는 대기
    },
  ]);

  if (stepsErr) {
    return res.status(500).json({ error: '결재라인 생성 중 오류가 발생했습니다.' });
  }

  await supabase.from('approval_notifications').insert({
    employee_id: step1Approver.id,
    document_id: document.id,
    message: `${drafter.name}님이 상신한 "${title}" 문서가 결재를 기다리고 있습니다.`,
  });

  return res.status(200).json({ message: '상신되었습니다.', document_id: document.id });
};
