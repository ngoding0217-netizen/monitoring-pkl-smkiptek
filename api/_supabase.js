// Helper: inisialisasi Supabase client di semua endpoint (server-side pakai secret key)
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

module.exports = supabase;
