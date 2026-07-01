const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Supabase not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to enable DB features');
  // Export a minimal stub so other modules can call `.from()` without crashing.
  const stub = {
    isConfigured: false,
    from: (/*table*/) => ({
      upsert: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      select: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
      eq: () => ({
        single: async () => ({ data: null, error: { message: 'Supabase not configured' } })
      })
    })
  };
  module.exports = stub;
} else {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false }
  });
  supabase.isConfigured = true;
  module.exports = supabase;
}
