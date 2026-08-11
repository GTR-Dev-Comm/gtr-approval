const { getSupabase } = require('./_lib');

// 직원이 선택할 수 있는 부서는 이 14개로 고정합니다.
// (경영지원팀 등 결재라인 전용 부서는 DB에는 있지만 목록에는 노출하지 않습니다)
const VISIBLE_DEPARTMENTS = [
  '기획팀', '클라이언트팀', '서버팀', '웹앱팀', '그래픽팀', '영상팀', '대회운영팀',
  '센서솔루션팀', '고객기술지원팀', '자재관리팀', '재무회계팀', '국내영업팀', '해외영업팀', '통합마케팅팀',
];

module.exports = async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('approval_departments')
    .select('id, name')
    .in('name', VISIBLE_DEPARTMENTS)
    .order('name', { ascending: true });

  if (error) return res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  return res.status(200).json({ departments: data });
};
