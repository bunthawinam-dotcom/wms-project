require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { authenticateJWT } = require('./middleware/auth');
const supabase = require('./supabaseClient');

const app = express();
app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 4000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

app.get('/', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV || 'dev' }));

// Start Google OAuth flow (redirect user to Google consent)
app.get('/auth/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'Google OAuth not configured',
      message: 'Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env'
    });
  }

  const redirectUri = `${BASE_URL}/auth/google/callback`;
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent'
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Google OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  if (req.query.error) {
    return res.status(400).json({
      error: 'Google OAuth error',
      google_error: req.query.error,
      description: req.query.error_description || 'No description provided'
    });
  }

  const code = req.query.code;
  if (!code) {
    return res.status(400).json({
      error: 'Missing code',
      message: 'This endpoint is only for Google callback. Start from /auth/google to begin login.'
    });
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${BASE_URL}/auth/google/callback`,
        grant_type: 'authorization_code'
      })
    });
    const tokenJson = await tokenRes.json();
    if (tokenJson.error) return res.status(400).json(tokenJson);

    const accessToken = tokenJson.access_token;
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const profile = await userRes.json();

    // Create our own JWT to exchange with frontend (contains minimal claims)
    // Upsert user into Supabase and get stored role
    try {
      const upsert = await supabase.from('users').upsert({ id: profile.id, email: profile.email, full_name: profile.name, provider: 'google' }, { returning: 'representation' });
      const inserted = upsert.data && upsert.data[0] ? upsert.data[0] : null;
      const role = (inserted && inserted.role) ? inserted.role : 'user';
      const payload = { sub: profile.id, email: profile.email, name: profile.name, provider: 'google', role };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: payload });
    } catch (err) {
      console.error('Supabase upsert error', err);
      const payload = { sub: profile.id, email: profile.email, name: profile.name, provider: 'google', role: 'user' };
      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
      res.json({ token, user: payload });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'OAuth exchange failed' });
  }
});

// Token exchange endpoint (accept 3rd-party token and return our JWT)
app.post('/auth/exchange', async (req, res) => {
  // Example: client can POST { provider: 'google', access_token: '...' }
  const { provider, access_token } = req.body;
  if (!provider || !access_token) return res.status(400).json({ error: 'Missing parameters' });
  try {
    if (provider === 'google') {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        const profile = await userRes.json();
      if (profile.error) return res.status(400).json(profile);
      try {
        const upsert = await supabase.from('users').upsert({ id: profile.id, email: profile.email, full_name: profile.name, provider: 'google' }, { returning: 'representation' });
        const inserted = upsert.data && upsert.data[0] ? upsert.data[0] : null;
        const role = (inserted && inserted.role) ? inserted.role : 'user';
        const payload = { sub: profile.id, email: profile.email, name: profile.name, provider: 'google', role };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token, user: payload });
      } catch (err) {
        console.error('Supabase upsert error', err);
        const payload = { sub: profile.id, email: profile.email, name: profile.name, provider: 'google', role: 'user' };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ token, user: payload });
      }
    }
    res.status(400).json({ error: 'Unsupported provider' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Exchange failed' });
  }
});

// Protected route example
app.get('/api/me', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

app.listen(PORT, () => console.log(`WMS backend listening on ${PORT}`));
