const { getSupabase, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data: me, error: meErr } = await supabase
    .from('approval_employees')
    .select('*')
    .eq('id', payload.sub)
    .maybeSingle();
  if (meErr || !me) return res.status(401).json({ error: '사용자 정보를 확인할 수 없습니다.' });

  let hasAccess = false;
  let deptFilterIds = null; // null = 전체 조회, 배열이면 해당 부서로 제한

  if (me.is_accounting_reviewer) {
    hasAccess = true;
  } else if (me.is_team_leader) {
    hasAccess = true;
    const { data: myDept } = await supabase
      .from('approval_departments')
      .select('name')
      .eq('id', me.department_id)
      .maybeSingle();
    if (!myDept || myDept.name !== '경영지원팀') {
      deptFilterIds = me.department_id ? [me.department_id] : [];
    }
    // 경영지원팀장이면 deptFilterIds = null (전체 조회)
  } else if (me.is_dev_director) {
    hasAccess = true;
    const { data: aDepts } = await supabase
      .from('approval_departments')
      .select('id')
      .eq('approval_group', 'A');
    deptFilterIds = (aDepts || []).map((d) => d.id);
  }

  if (!hasAccess) {
    return res.status(403).json({ error: '전체 문서 조회 권한이 없습니다.' });
  }

  let query = supabase
    .from('approval_documents')
    .select(
      'id, title, status, content, created_at, doc_type_id, drafter_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code), approval_employees(name, department_id)'
    )
    .neq('status', 'draft') // 임시저장 중인 남의 문서는 안 보이게
    .order('created_at', { ascending: false });

  const { doc_type_code } = req.query || {};
  if (doc_type_code) {
    const { data: dt } = await supabase
      .from('approval_doc_types')
      .select('id')
      .eq('code', doc_type_code)
      .maybeSingle();
    if (dt) query = query.eq('doc_type_id', dt.id);
  }

  const { data: docs, error } = await query;
  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });

  let filtered = docs || [];
  if (deptFilterIds) {
    filtered = filtered.filter(
      (d) => d.approval_employees && deptFilterIds.includes(d.approval_employees.department_id)
    );
  }

  const docIds = filtered.map((d) => d.id);
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

  const result = filtered.map((d) => ({ ...d, steps: stepsByDoc[d.id] || [] }));

  return res.status(200).json({ documents: result });
};
