const { getSupabase, requireAuth } = require('../_lib');

// "완료"의 기준: 반려된 문서 / 승인됐고 후속처리(지급·구매)가 필요없는 문서 / 승인됐고 후속처리까지 끝난 문서
function isTrulyDone(d) {
  if (d.status === 'rejected') return true;
  if (d.status !== 'approved') return false;
  if (!d.fulfillment_status) return true; // 후속처리 대상이 아닌 문서종류
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

  let documents = [];

  if (payload.is_master) {
    // 마스터는 전체 문서를 다 봅니다.
    let query = supabase
      .from('approval_documents')
      .select('id, title, content, status, created_at, updated_at, doc_type_id, drafter_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code), approval_employees(name)')
      .in('status', ['approved', 'rejected']);
    if (docTypeId) query = query.eq('doc_type_id', docTypeId);
    const { data } = await query;
    documents = (data || []).filter(isTrulyDone);
  } else {
    // 1) 내가 작성한 문서 중 완료된 것
    let myQuery = supabase
      .from('approval_documents')
      .select('id, title, content, status, created_at, updated_at, doc_type_id, drafter_id, fulfillment_status, fulfilled_at, approval_doc_types(name, code), approval_employees(name)')
      .eq('drafter_id', payload.sub)
      .in('status', ['approved', 'rejected']);
    if (docTypeId) myQuery = myQuery.eq('doc_type_id', docTypeId);
    const { data: myDocs } = await myQuery;

    // 2) 내가 결재(승인/반려) 처리한 문서
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

    documents = Object.values(merged).filter(isTrulyDone);
  }

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
