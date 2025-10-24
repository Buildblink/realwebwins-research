#!/usr/bin/env node
/**
 * Test direct insert to referral_clicks table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🧪 Testing Direct Insert to referral_clicks\n');

const testData = {
  referrer_user_id: 'test-user-' + Date.now(),
  target_path: '/test-path',
  ip_hash: 'test-hash-123',
  user_agent: 'test-agent',
  created_at: new Date().toISOString(),
};

console.log('Attempting to insert:', testData);

const { data, error } = await supabase
  .from('referral_clicks')
  .insert([testData])
  .select();

if (error) {
  console.error('\n❌ Insert failed:', error);
  process.exit(1);
} else {
  console.log('\n✅ Insert successful:', data);
  process.exit(0);
}
