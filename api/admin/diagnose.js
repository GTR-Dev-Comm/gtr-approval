const { getSupabase, requireMaster } = require('../_lib');

// 결재 진행 점검: 개발이사 지정 현황 + 결재 진행중인 문서의 결재선(결재자/계정 상태)을 보여줍니다.
module.exports = async (req, res) => {
  const payload = requireMaster(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data: directors, error: dirErr } = await supabase
    .from('approval_employees')
    .select('id, name, login_id, phone, is_active, signup_status')
    .eq('is_dev_director', true);
  if (dirErr) return res.status(500).json({ error: '개발이사 조회 중 오류가 발생했습니다.' });

  const { data: docs, error: docErr } = await supabase
    .from('approval_documents')
    .select('id, title, created_at, drafter_id, approval_doc_types(name), approval_employees(name, department_id, approval_departments(name, approval_group))')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50);
  if (docErr) return res.status(500).json({ error: '문서 조회 중 오류가 발생했습니다.' });

  const ids = (docs || []).map((d) => d.id);
  let stepsByDoc = {};
  if (ids.length > 0) {
    const { data: steps } = await supabase
      .from('approval_steps')
      .select('document_id, step_order, step_name, status, approver_id, approval_employees(name, login_id, is_dev_director, is_accounting_reviewer, is_team_leader)')
      .in('document_id', ids)
      .order('step_order', { ascending: true });
    (steps || []).forEach((s) => {
      if (!stepsByDoc[s.document_id]) stepsByDoc[s.document_id] = [];
      stepsByDoc[s.document_id].push(s);
    });
  }

  return res.status(200).json({
    master_login_id: process.env.MASTER_LOGIN_ID || null,
    directors: directors || [],
    documents: (docs || []).map((d) => ({ ...d, steps: stepsByDoc[d.id] || [] })),
  });
};
