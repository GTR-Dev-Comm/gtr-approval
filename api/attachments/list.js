const { getSupabase, requireAuth } = require('../_lib');

const BUCKET = 'approval-attachments';

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const { document_id } = req.query || {};
  if (!document_id) return res.status(400).json({ error: 'document_id가 필요합니다.' });

  const supabase = getSupabase();

  const { data: attachments, error } = await supabase
    .from('approval_attachments')
    .select('*')
    .eq('document_id', document_id)
    .order('uploaded_at', { ascending: true });

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });

  const withUrls = [];
  for (const a of attachments || []) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(a.file_path, 60 * 10); // 10분간 유효
    withUrls.push({ ...a, url: signed ? signed.signedUrl : null });
  }

  return res.status(200).json({ attachments: withUrls });
};
