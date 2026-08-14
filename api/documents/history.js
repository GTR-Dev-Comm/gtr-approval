const { getSupabase, requireAuth } = require('../_lib');

const MGMT_SUPPORT_DEPT_NAME = '경영지원팀';

function isTrulyDone(d) {
  if (d.status !== 'approved') return false;
  if (!d.fulfillment_status) return true;
  return d.fulfillment_status === 'paid' || d.fulfillment_status === 'purchased';
}

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();
  const { doc_type_code } = req.query || {};

  let docTypeId = null;
  if (doc_type_code) {
    const { data: dt } = await supabase.from('approval_doc_types').select('id').eq('code', doc_type_code).maybeSingle();
    docTypeId = dt ? dt.id : '__none__';
  }

  const { data: me } = await supabase
    .from('approval_employees')
    .select('*')
    .eq('id', payload.sub)
    .maybeSingle();
  if (!me) return res.status(401).json({ error: '사용자 정보를 확인할 수 없습니다.' });

  // 조회 범위 판단 (마스터/회계담당/경영지원팀장 = 전체, 개발이사 = 개발라인, 팀장 = 본인팀, 그 외 = 본인 관련만)
  let hasBroadAccess = payload.is_master || !!me.is_accounting_reviewer;
  let scopeDeptIds = null;

  if (!hasBroadAccess && me.is_team_leader) {
    const { data: myDept } = await supabase.from('approval_departments').select('name').eq('id', me.department_id).maybeSingle();
    if (myDept && myDept.name === MGMT_SUPPORT_DEPT_NAME) {
      hasBroadAccess = true;
    } else {
      scopeDeptIds = me.department_id ? [me.department_id] : [];
    }
  } else if (!hasBroadAccess && me.is_dev_director) {
    const { data: aDepts } = await supabase.from('approval_departments').select('id').eq('approval_group', 'A');
    scopeDeptIds = (aDepts || []).map((d) => d.id);
  }

  let documents = [];

  if (hasBroadAccess || scopeDeptIds) {
    let query = supabase
      .from('approval_documents')
      .select('id, title, content, status, created_at, updated_at, doc_type_id, drafter_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code), approval_employees(name, department_id)')
      .in('status', ['approved', 'rejected']);
    if (docTypeId) query = query.eq('doc_type_id', docTypeId);
    const { data } = await query;
    documents = (data || []).filter((d) => {
      if (hasBroadAccess) return true;
      return d.approval_employees && scopeDeptIds.includes(d.approval_employees.department_id);
    });
  } else {
    // 일반 직원: 본인이 작성했거나 결재(승인/반려)했던 문서만
    let myQuery = supabase
      .from('approval_documents')
      .select('id, title, content, status, created_at, updated_at, doc_type_id, drafter_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code), approval_employees(name)')
      .eq('drafter_id', payload.sub)
      .in('status', ['approved', 'rejected']);
    if (docTypeId) myQuery = myQuery.eq('doc_type_id', docTypeId);
    const { data: myDocs } = await myQuery;

    const { data: actedSteps } = await supabase
      .from('approval_steps')
      .select('document_id, status, acted_at, approval_documents(id, title, content, created_at, updated_at, doc_type_id, drafter_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code), approval_employees(name))')
      .eq('approver_id', payload.sub)
      .in('status', ['approved', 'rejected']);

    const merged = {};
    (myDocs || []).forEach((d) => { merged[d.id] = d; });
    (actedSteps || []).forEach((s) => {
      const d = s.approval_documents;
      if (!d) return;
      if (docTypeId && d.doc_type_id !== docTypeId) return;
      if (!merged[d.id]) merged[d.id] = d;
    });

    documents = Object.values(merged);
  }

  documents = documents.filter(isTrulyDone);
  documents.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

  const docIds = documents.map((d) => d.id);
  let stepsByDoc = {};
  if (docIds.length > 0) {
    const { data: steps } = await supabase
      .from('approval_steps')
      .select('document_id, step_order, step_name, status, comment, acted_at, approver_id, approval_employees(name)')
      .in('document_id', docIds)
      .order('step_order', { ascending: true });
    (steps || []).forEach((s) => {
      if (!stepsByDoc[s.document_id]) stepsByDoc[s.document_id] = [];
      stepsByDoc[s.document_id].push(s);
    });
  }

  const result = documents.map((d) => ({ ...d, steps: stepsByDoc[d.id] || [] }));

  return res.status(200).json({ documents: result });
};
