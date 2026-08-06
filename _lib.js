const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// 기존 gtr-golf-manager Supabase 프로젝트와 동일한 환경변수를 재사용합니다.
// Vercel 프로젝트 설정 > Environment Variables 에 아래 값들을 등록해야 합니다:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APP_JWT_SECRET

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

function signSession(employee) {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error('APP_JWT_SECRET 환경변수가 설정되어 있지 않습니다.');
  return jwt.sign(
    {
      sub: employee.id,
      login_id: employee.login_id,
      name: employee.name,
      department_id: employee.department_id,
      is_team_leader: employee.is_team_leader,
      is_master: employee.login_id === process.env.MASTER_LOGIN_ID,
    },
    secret,
    { expiresIn: '30d', algorithm: 'HS256' }
  );
}

function verifySession(token) {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error('APP_JWT_SECRET 환경변수가 설정되어 있지 않습니다.');
  try {
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch (e) {
    return null;
  }
}

function getTokenFromRequest(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  // 쿠키 방식도 지원 (프론트에서 쿠키로 저장할 경우)
  const cookie = req.headers['cookie'] || '';
  const match = cookie.match(/(?:^|;\s*)gtr_approval_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function requireAuth(req, res) {
  const token = getTokenFromRequest(req);
  const payload = token ? verifySession(token) : null;
  if (!payload) {
    res.status(401).json({ error: '로그인이 필요합니다.' });
    return null;
  }
  return payload;
}

function requireMaster(req, res) {
  const payload = requireAuth(req, res);
  if (!payload) return null;
  if (!payload.is_master) {
    res.status(403).json({ error: '관리자만 접근할 수 있습니다.' });
    return null;
  }
  return payload;
}

module.exports = {
  getSupabase,
  signSession,
  verifySession,
  getTokenFromRequest,
  requireAuth,
  requireMaster,
};
