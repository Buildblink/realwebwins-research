#!/usr/bin/env node
/**
 * Verify Phase 15 Database State
 *
 * Checks:
 * 1. All 4 Phase 15 tables exist
 * 2. Table structures are correct
 * 3. Display current row counts
 * 4. Show sample data from each table
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyPhase15Database() {
  console.log('\n🔍 Verifying Phase 15 Database State\n');

  const results = {
    tablesExist: {},
    rowCounts: {},
    sampleData: {},
    issues: [],
  };

  try {
    // Step 1: Verify workspace_remixes table
    console.log('1️⃣  Checking workspace_remixes table...');
    const { data: remixes, error: remixError, count: remixCount } = await supabase
      .from('workspace_remixes')
      .select('*', { count: 'exact' })
      .limit(5);

    if (remixError) {
      console.error(`   ❌ Table check failed: ${remixError.message}`);
      results.tablesExist.workspace_remixes = false;
      results.issues.push(`workspace_remixes: ${remixError.message}`);
    } else {
      console.log(`   ✅ Table exists with ${remixCount} rows`);
      results.tablesExist.workspace_remixes = true;
      results.rowCounts.workspace_remixes = remixCount;
      if (remixes && remixes.length > 0) {
        console.log(`   Sample: source=${remixes[0].source_workspace_id}, new=${remixes[0].new_workspace_id}`);
        results.sampleData.workspace_remixes = remixes[0];
      }
    }

    // Step 2: Verify referral_clicks table
    console.log('\n2️⃣  Checking referral_clicks table...');
    const { data: referralClicks, error: referralError, count: referralCount } = await supabase
      .from('referral_clicks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (referralError) {
      console.error(`   ❌ Table check failed: ${referralError.message}`);
      results.tablesExist.referral_clicks = false;
      results.issues.push(`referral_clicks: ${referralError.message}`);
    } else {
      console.log(`   ✅ Table exists with ${referralCount} rows`);
      results.tablesExist.referral_clicks = true;
      results.rowCounts.referral_clicks = referralCount;
      if (referralClicks && referralClicks.length > 0) {
        const sample = referralClicks[0];
        const ipHashPreview = sample.ip_hash ? `${sample.ip_hash.substring(0, 16)}...` : 'null';
        console.log(`   Sample: ref=${sample.referrer_user_id}, path=${sample.target_path}, ip=${ipHashPreview}`);
        results.sampleData.referral_clicks = sample;
      }
    }

    // Step 3: Verify affiliate_clicks table
    console.log('\n3️⃣  Checking affiliate_clicks table...');
    const { data: affiliateClicks, error: affiliateError, count: affiliateCount } = await supabase
      .from('affiliate_clicks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);

    if (affiliateError) {
      console.error(`   ❌ Table check failed: ${affiliateError.message}`);
      results.tablesExist.affiliate_clicks = false;
      results.issues.push(`affiliate_clicks: ${affiliateError.message}`);
    } else {
      console.log(`   ✅ Table exists with ${affiliateCount} rows`);
      results.tablesExist.affiliate_clicks = true;
      results.rowCounts.affiliate_clicks = affiliateCount;
      if (affiliateClicks && affiliateClicks.length > 0) {
        const sample = affiliateClicks[0];
        console.log(`   Sample: tool=${sample.tool_name}, workspace=${sample.workspace_id}`);
        results.sampleData.affiliate_clicks = sample;
      }
    }

    // Step 4: Verify user_credits table
    console.log('\n4️⃣  Checking user_credits table...');
    const { data: userCredits, error: creditsError, count: creditsCount } = await supabase
      .from('user_credits')
      .select('*', { count: 'exact' })
      .order('balance', { ascending: false })
      .limit(5);

    if (creditsError) {
      console.error(`   ❌ Table check failed: ${creditsError.message}`);
      results.tablesExist.user_credits = false;
      results.issues.push(`user_credits: ${creditsError.message}`);
    } else {
      console.log(`   ✅ Table exists with ${creditsCount} rows`);
      results.tablesExist.user_credits = true;
      results.rowCounts.user_credits = creditsCount;

      // Show users with credits
      const usersWithCredits = userCredits?.filter(u => u.balance > 0) || [];
      if (usersWithCredits.length > 0) {
        console.log(`   Users with credits: ${usersWithCredits.length}`);
        usersWithCredits.forEach(user => {
          console.log(`      - ${user.user_id}: ${user.balance} credits`);
        });
        results.sampleData.user_credits = usersWithCredits[0];
      } else {
        console.log('   No users with positive credit balance yet');
      }
    }

    // Step 5: Summary
    console.log('\n5️⃣  Database Summary:');
    console.log('   ┌─────────────────────┬────────┬───────┐');
    console.log('   │ Table               │ Exists │ Rows  │');
    console.log('   ├─────────────────────┼────────┼───────┤');
    console.log(`   │ workspace_remixes   │   ${results.tablesExist.workspace_remixes ? '✅' : '❌'}   │ ${String(results.rowCounts.workspace_remixes || 0).padStart(5)} │`);
    console.log(`   │ referral_clicks     │   ${results.tablesExist.referral_clicks ? '✅' : '❌'}   │ ${String(results.rowCounts.referral_clicks || 0).padStart(5)} │`);
    console.log(`   │ affiliate_clicks    │   ${results.tablesExist.affiliate_clicks ? '✅' : '❌'}   │ ${String(results.rowCounts.affiliate_clicks || 0).padStart(5)} │`);
    console.log(`   │ user_credits        │   ${results.tablesExist.user_credits ? '✅' : '❌'}   │ ${String(results.rowCounts.user_credits || 0).padStart(5)} │`);
    console.log('   └─────────────────────┴────────┴───────┘');

    if (results.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      results.issues.forEach(issue => console.log(`   - ${issue}`));
      return { success: false, results };
    }

    const allTablesExist = Object.values(results.tablesExist).every(v => v === true);
    if (!allTablesExist) {
      console.log('\n❌ Some tables are missing. Run: npm run ensure:phase14_5-15-schema');
      return { success: false, results };
    }

    console.log('\n✅ Phase 15 Database Verification PASSED\n');
    return { success: true, results };
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error.message);
    return { success: false, reason: 'exception', error: error.message };
  }
}

// Run verification
verifyPhase15Database().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
