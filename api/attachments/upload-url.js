const { getSupabase, requireAuth } = require('../_lib');

const BUCKET = 'approval-attachments';
const MAX_BYTES = 20 * 1024 * 1024; // 20MB

// 저장소에 쓰는 파일 키는 영문/숫자만 사용합니다 (한글·공백·특수문자가 들어간 파일명으로 업로드가 실패하는 것을 방지).
// 원래 파일명은 DB(file_name)에만 보관합니다.
function makeKey(documentId, fileType, originalName) {
  const ext = fileType === 'pdf' ? 'pdf' : (/\.png$/i.test(originalName || '') ? 'png' : 'jpg');
  const rand = Math.random().toString(36).slice(2, 8);
  return `expense/${documentId}/${Date.now()}-${rand}.${ext}`;
}

// 브라우저가 파일을 저장소로 직접 올릴 수 있는 1회용 업로드 주소를 발급합니다.
// (서버를 거치면 Vercel의 요청 크기 제한(약 4.5MB) 때문에 큰 PDF가 올라가지 않습니다)
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { document_id, file_name, file_type, file_size } = req.body || {};
  if (!document_id || !file_name || !file_type) {
    return res.status(400).json({ error: '문서ID, 파일명, 파일종류가 필요합니다.' });
  }
  if (!['image', 'pdf'].includes(file_type)) {
    return res.status(400).json({ error: '지원하지 않는 파일 형식입니다. (사진 또는 PDF만 가능)' });
  }
  if (Number(file_size) > MAX_BYTES) {
    return res.status(400).json({ error: '파일 크기는 20MB를 넘을 수 없습니다.' });
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

  await supabase.storage.createBucket(BUCKET, { public: false }); // 이미 있으면 오류가 나지만 무시

  const path = makeKey(document_id, file_type, file_name);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return res.status(500).json({ error: '업로드 주소를 만들지 못했습니다: ' + (error ? error.message : '알 수 없는 오류') });
  }

  return res.status(200).json({ path, token: data.token, signed_url: data.signedUrl });
};
