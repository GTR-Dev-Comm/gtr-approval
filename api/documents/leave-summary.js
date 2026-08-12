const { getSupabase, requireAuth } = require('../_lib');

function countDays(item) {
  if (!item.start_date || !item.end_date) return 0;
  const start = new Date(item.start_date);
  const end = new Date(item.end_date);
  if (isNaN(start) || isNaN(end)) return 0;
  if (item.vacation_type === '반차') return 0.5;
  const diffMs = end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0);
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return days > 0 ? days : 0;
}

module.exports = async (req, res) => {
  const payload = requireAuth(req, res);
  if (!payload) return;

  const supabase = getSupabase();

  const { data: me, error: meErr } = await supabase
    .from('approval_employees')
    .select('id, name, annual_leave_days')
    .eq('id', payload.sub)
    .maybeSingle();
  if (meErr || !me) return res.status(401).json({ error: '사용자 정보를 확인할 수 없습니다.' });

  const { data: vacationType } = await supabase
    .from('approval_doc_types')
    .select('id')
    .eq('code', 'vacation')
    .maybeSingle();

  const year = new Date().getFullYear();
  let used = 0;
  const breakdown = [];

  if (vacationType) {
    const { data: docs } = await supabase
      .from('approval_documents')
      .select('id, title, content, status, created_at')
      .eq('drafter_id', me.id)
      .eq('doc_type_id', vacationType.id)
      .eq('status', 'approved');

    (docs || []).forEach((d) => {
      const days = countDays(d.content || {});
      const startYear = d.content && d.content.start_date ? new Date(d.content.start_date).getFullYear() : null;
      if (startYear === year) {
        used += days;
        breakdown.push({ id: d.id, title: d.title, days, start_date: d.content.start_date, end_date: d.content.end_date });
      }
    });
  }

  const allowance = me.annual_leave_days != null ? Number(me.annual_leave_days) : null;
  const remaining = allowance != null ? Math.round((allowance - used) * 10) / 10 : null;

  return res.status(200).json({ year, allowance, used, remaining, breakdown });
};
