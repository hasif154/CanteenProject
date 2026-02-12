
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = 'https://wfiepubzfgyklrkvnjtn.supabase.co';
const supabaseKey = 'sb_publishable_nm1gw1wCo384Zc_9q8JFNw_ZwIQCtxA';

if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  WARNING: SUPABASE_URL or SUPABASE_ANON_KEY is missing in .env');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
