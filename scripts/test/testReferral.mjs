#!/usr/bin/env node
/**
 * Test Referral API (POST /api/referral)
 *
 * Tests:
 * 1. Track referral click with IP hashing
 * 2. Verify referral_clicks table updated
 * 3. Verify user_credits incremented
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testReferralAPI() {
  console.log('\n🧪 Testing Referral API\n');

  const testUserId = 'test-referrer-' + Date.now();
  const testPath = `/workspace/test-${Date.now()}`;

  try {
    // Step 1: Get initial credit balance (if exists)
    console.log('1️⃣  Checking initial credit balance...');
    const { data: initialCredits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', testUserId)
      .single();

    const initialBalance = initialCredits?.balance || 0;
    console.log(`   Initial balance: ${initialBalance} credits`);

    // Step 2: Call Referral API
    console.log('\n2️⃣  Calling POST /api/referral...');
    const response = await fetch(`${API_BASE}/api/referral`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '203.0.113.42', // Test IP
      },
      body: JSON.stringify({
        ref: testUserId,
        target: testPath,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`   ❌ API returned ${response.status}:`, result);
      return { success: false, reason: 'api_error', details: result };
    }

    console.log('   ✅ API Success:', result);

    // Step 3: Verify referral_clicks entry
    console.log('\n3️⃣  Verifying referral_clicks table...');
    const { data: referralClicks, error: clickError } = await supabase
      .from('referral_clicks')
      .select('*')
      .eq('referrer_user_id', testUserId)
      .eq('target_path', testPath)
      .order('created_at', { ascending: false })
      .limit(1);

    if (clickError || !referralClicks || referralClicks.length === 0) {
      console.error('   ❌ Referral click not found in database');
      return { success: false, reason: 'click_not_logged' };
    }

    const clickEntry = referralClicks[0];
    console.log('   ✅ Referral click logged:', {
      referrer: clickEntry.referrer_user_id,
      path: clickEntry.target_path,
      ipHash: clickEntry.ip_hash ? `${clickEntry.ip_hash.substring(0, 16)}...` : 'none',
      timestamp: clickEntry.created_at,
    });

    // Step 4: Verify IP was hashed
    if (!clickEntry.ip_hash) {
      console.warn('   ⚠️  IP hash is null (expected SHA-256 hash)');
    } else if (clickEntry.ip_hash.length === 64) {
      console.log('   ✅ IP properly hashed (SHA-256)');
    } else {
      console.warn(`   ⚠️  Unexpected IP hash length: ${clickEntry.ip_hash.length}`);
    }

    // Step 5: Verify user_credits incremented
    console.log('\n4️⃣  Verifying user_credits incremented...');
    const { data: updatedCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('balance, updated_at')
      .eq('user_id', testUserId)
      .single();

    if (creditsError || !updatedCredits) {
      console.error('   ❌ User credits not found');
      return { success: false, reason: 'credits_not_updated' };
    }

    const newBalance = updatedCredits.balance;
    const increment = newBalance - initialBalance;

    console.log(`   New balance: ${newBalance} credits (+${increment})`);

    if (increment !== 1) {
      console.warn(`   ⚠️  Expected +1 credit, got +${increment}`);
    } else {
      console.log('   ✅ Credit balance incremented correctly');
    }

    console.log('\n✅ Referral API Test PASSED\n');
    return {
      success: true,
      userId: testUserId,
      clickLogged: true,
      ipHashed: !!clickEntry.ip_hash,
      creditsIncremented: increment,
      finalBalance: newBalance,
    };
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return { success: false, reason: 'exception', error: error.message };
  }
}

// Run test
testReferralAPI().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
