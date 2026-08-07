const { createClient } = require('@supabase/supabase-js');
const { env } = require('./env');

if (!env.supabase.url || !env.supabase.serviceRoleKey) {
  throw new Error(
    'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
  );
}

const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log('Supabase connected successfully');

module.exports = supabase;