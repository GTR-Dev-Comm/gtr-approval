const { getSupabase, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();
  const { doc_type_code } = req.query || {};

  const { data: me } = await supabase
    .from('approval_employees')
    .select('*')
    .eq('id', payload.sub)
    .maybeSingle();
  if (!me) return res.status(401).json({ error: '사용자 정보를 확인할 수 없습니다.' });

  let query = supabase
    .from('approval_documents')
    .select(
      'id, title, status, content, created_at, doc_type_id, drafter_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code), approval_employees(name, department_id)'
    )
    .eq('status', 'approved')
    .in('fulfillment_status', ['pending_payment', 'pending_purchase'])
    .order('created_at', { ascending: false });

  if (doc_type_code) {
    const { data: dt } = await supabase.from('approval_doc_types').select('id').eq('code', doc_type_code).maybeSingle();
    if (dt) query = query.eq('doc_type_id', dt.id);
  }

  const { data: allDocs, error } = await query;
  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });

  // 조회 범위 결정: 회계담당/경영지원팀장은 전체, 개발이사는 개발라인 7개팀, 팀장은 본인팀
  let scopeDeptIds = null; // null = 제한 없음(전체 또는 본인 문서만 별도 병합)
  let hasBroadAccess = false;

  if (me.is_accounting_reviewer) {
    hasBroadAccess = true;
  } else if (me.is_team_leader) {
    const { data: myDept } = await supabase.from('approval_departments').select('name').eq('id', me.department_id).maybeSingle();
    if (myDept && myDept.name === '경영지원팀') {
      hasBroadAccess = true;
    } else {
      scopeDeptIds = me.department_id ? [me.department_id] : [];
    }
  } else if (me.is_dev_director) {
    const { data: aDepts } = await supabase.from('approval_departments').select('id').eq('approval_group', 'A');
    scopeDeptIds = (aDepts || []).map((d) => d.id);
  }

  let visible = (allDocs || []).filter((d) => {
    if (d.drafter_id === me.id) return true; // 본인 문서는 항상 보임
    if (hasBroadAccess) return true;
    if (scopeDeptIds) return d.approval_employees && scopeDeptIds.includes(d.approval_employees.department_id);
    return false;
  });

  const docIds = visible.map((d) => d.id);
  let stepsByDoc = {};
  if (docIds.length > 0) {
    const { data: steps } = await supabase
      .from('approval_steps')
      .select('document_id, step_order, step_name, status, approval_employees(name)')
      .in('document_id', docIds)
      .order('step_order', { ascending: true });
    (steps || []).forEach((s) => {
      if (!stepsByDoc[s.document_id]) stepsByDoc[s.document_id] = [];
      stepsByDoc[s.document_id].push(s);
    });
  }

  const result = visible.map((d) => ({ ...d, steps: stepsByDoc[d.id] || [] }));

  return res.status(200).json({ documents: result });
};
