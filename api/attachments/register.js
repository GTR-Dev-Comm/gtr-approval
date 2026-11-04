const { getSupabase, requireAuth } = require('../_lib');

const BUCKET = 'approval-attachments';

// 브라우저가 저장소로 직접 올린 파일이 실제로 있는지 확인한 뒤 첨부파일로 등록합니다.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { document_id, path, file_name, file_type, file_size } = req.body || {};
  if (!document_id || !path || !file_name || !['image', 'pdf'].includes(file_type)) {
    return res.status(400).json({ error: '문서ID, 경로, 파일명, 파일종류가 필요합니다.' });
  }
  if (!String(path).startsWith(`expense/${document_id}/`)) {
    return res.status(400).json({ error: '올바르지 않은 파일 경로입니다.' });
  }

  const supabase = getSupabase();

  const { data: doc } = await supabase
    .from('approval_documents')
    .select('id, drafter_id')
    .eq('id', document_id)
    .maybeSingle();
  if (!doc) return res.status(404).json({ error: '문서를 찾을 수 없습니다.' });
  if (doc.drafter_id !== payload.sub && !payload.is_master) {
    return res.status(403).json({ error: '본인이 작성한 문서에만 첨부할 수 있습니다.' });
  }

  // 파일이 실제로 저장되어 있는지 확인 (없으면 서명 주소를 만들 수 없음)
  const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
  if (signErr || !signed) {
    return res.status(400).json({ error: '업로드된 파일을 확인하지 못했습니다. 다시 시도해주세요.' });
  }

  const { data: attachment, error: insertErr } = await supabase
    .from('approval_attachments')
    .insert({ document_id, file_name, file_path: path, file_type, file_size: Number(file_size) || null })
    .select()
    .single();
  if (insertErr) return res.status(500).json({ error: '첨부파일 정보 저장 중 오류가 발생했습니다.' });

  return res.status(200).json({ attachment });
};
