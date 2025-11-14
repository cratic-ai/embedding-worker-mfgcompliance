require('dotenv').config(); // ✅ make sure .env is loaded

const { createClient } = require('@supabase/supabase-js');

// Use only environment variables — no hard-coded fallbacks
const supabaseUrl = "https://hjwzxypjecuogxgjagrh.supabase.co"

const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqd3p4eXBqZWN1b2d4Z2phZ3JoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTU4NTUwNiwiZXhwIjoyMDcxMTYxNTA2fQ.J36ZUMmR9mADWfrntxuPLYDWXDIfeJ6vafFIULGniGA";

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase environment variables. Check your .env file!");
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  },
});

// Optional connection test
const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('auth_table').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log('✅ Supabase connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
};

module.exports = { supabase, testConnection };