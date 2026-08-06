const { getSupabase, requireAuth } = require('../_lib');

const BUCKET = 'approval-attachments';
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  }
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { document_id, file_name, file_type, data_base64 } = req.body || {};
  if (!document_id || !file_name || !file_type || !data_base64) {
    return res.status(400).json({ error: '문서ID, 파일명, 파일타입, 파일데이터가 모두 필요합니다.' });
  }
  if (!['image', 'pdf'].includes(file_type)) {
    return res.status(400).json({ error: '지원하지 않는 파일 형식입니다. (사진 또는 PDF만 가능)' });
  }

  const buffer = Buffer.from(data_base64, 'base64');
  if (buffer.length > MAX_BYTES) {
    return res.status(400).json({ error: '파일 크기는 8MB를 넘을 수 없습니다.' });
  }

  const supabase = getSupabase();

  // 버킷이 없으면 생성 (이미 있으면 에러가 나지만 무시)
  await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => {});

  const safeName = file_name.replace(/[^\w.\-가-힣]/g, '_');
  const path = `expense/${document_id}/${Date.now()}-${safeName}`;

  const contentType = file_type === 'pdf' ? 'application/pdf' : 'image/jpeg';
  const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (uploadErr) {
    return res.status(500).json({ error: '파일 업로드 중 오류가 발생했습니다: ' + uploadErr.message });
  }

  const { data: attachment, error: insertErr } = await supabase
    .from('approval_attachments')
    .insert({
      document_id,
      file_name,
      file_path: path,
      file_type,
      file_size: buffer.length,
    })
    .select()
    .single();

  if (insertErr) {
    return res.status(500).json({ error: '첨부파일 정보 저장 중 오류가 발생했습니다.' });
  }

  return res.status(200).json({ attachment });
};
