const { getSupabase, requireAuth } = require('../_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { step_id, action, comment } = req.body || {};
  if (!step_id || !['approve', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'step_id와 action(approve/reject)이 필요합니다.' });
  }

  const supabase = getSupabase();

  const { data: step, error: stepErr } = await supabase
    .from('approval_steps')
    .select('*')
    .eq('id', step_id)
    .maybeSingle();

  if (stepErr || !step) {
    return res.status(404).json({ error: '결재 단계를 찾을 수 없습니다.' });
  }
  if (step.approver_id !== payload.sub && !payload.is_master) {
    return res.status(403).json({ error: '이 문서의 결재 권한이 없습니다.' });
  }
  if (step.status !== 'waiting') {
    return res.status(409).json({ error: '이미 처리되었거나 아직 순서가 되지 않은 결재입니다.' });
  }

  const { data: document, error: docErr } = await supabase
    .from('approval_documents')
    .select('*')
    .eq('id', step.document_id)
    .maybeSingle();
  if (docErr || !document) {
    return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  }

  await supabase
    .from('approval_steps')
    .update({
      status: action === 'approve' ? 'approved' : 'rejected',
      comment: comment || null,
      acted_at: new Date().toISOString(),
    })
    .eq('id', step.id);

  if (action === 'reject') {
    await supabase
      .from('approval_documents')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', document.id);

    await supabase.from('approval_notifications').insert({
      employee_id: document.drafter_id,
      document_id: document.id,
      message: `"${document.title}" 문서가 반려되었습니다.${comment ? ' 사유: ' + comment : ''}`,
    });

    return res.status(200).json({ message: '반려 처리되었습니다.' });
  }

  // 승인 처리: 다음 단계가 있는지 확인
  const { data: nextStep } = await supabase
    .from('approval_steps')
    .select('*')
    .eq('document_id', document.id)
    .eq('step_order', step.step_order + 1)
    .maybeSingle();

  if (nextStep) {
    await supabase.from('approval_steps').update({ status: 'waiting' }).eq('id', nextStep.id);
    await supabase
      .from('approval_documents')
      .update({ current_step: nextStep.step_order, updated_at: new Date().toISOString() })
      .eq('id', document.id);
    await supabase.from('approval_notifications').insert({
      employee_id: nextStep.approver_id,
      document_id: document.id,
      message: `"${document.title}" 문서가 결재를 기다리고 있습니다.`,
    });
  } else {
    const { data: docType } = await supabase
      .from('approval_doc_types')
      .select('code')
      .eq('id', document.doc_type_id)
      .maybeSingle();

    const initialFulfillment =
      docType && docType.code === 'expense' ? 'pending_payment' :
      docType && docType.code === 'purchase' ? 'pending_purchase' :
      null;

    await supabase
      .from('approval_documents')
      .update({
        status: 'approved',
        fulfillment_status: initialFulfillment,
        updated_at: new Date().toISOString(),
      })
      .eq('id', document.id);
    await supabase.from('approval_notifications').insert({
      employee_id: document.drafter_id,
      document_id: document.id,
      message: `"${document.title}" 문서가 최종 승인되었습니다.`,
    });
  }

  return res.status(200).json({ message: '승인 처리되었습니다.' });
};
