const jwt = require('jsonwebtoken');
const supabase = require('../supabaseClient');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

async function authenticateJWT(req, res, next) {
  const auth = req.headers.authorization || req.cookies.authorization;
  if (!auth) return res.status(401).json({ error: 'Missing Authorization' });

  const token = auth.startsWith('Bearer ') ? auth.split(' ')[1] : auth;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Refresh role from DB in case it changed
    try {
      const { data, error } = await supabase.from('users').select('role').eq('id', payload.sub).single();
      if (!error && data && data.role) payload.role = data.role;
    } catch (e) {
      console.warn('Could not fetch role from Supabase', e.message || e);
    }
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticateJWT };
