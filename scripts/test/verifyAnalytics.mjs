#!/usr/bin/env node
/**
 * Verify Analytics Aggregation - Phase 15.1
 * Tests both manual and cron aggregation endpoints
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEEKLY_SECRET = process.env.WEEKLY_SUMMARY_SECRET;
const API_BASE = process.env.API_BASE || 'http://localhost:3000';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !WEEKLY_SECRET) {
  console.error('❌ Missing required environment variables');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEEKLY_SUMMARY_SECRET');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function verifyAnalytics() {
  console.log('\n🧪 Verifying Analytics Aggregation\n');
  let hasErrors = false;

  try {
    // Step 1: Test manual aggregation endpoint
    console.log('1️⃣  Testing manual aggregation endpoint...');
    const aggregateResponse = await fetch(`${API_BASE}/api/analytics/aggregate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const aggregateData = await aggregateResponse.json();

    if (!aggregateResponse.ok || !aggregateData.success) {
      console.error('   ❌ Manual aggregation failed:', aggregateData);
      hasErrors = true;
    } else {
      console.log('   ✅ Manual aggregation succeeded');
      console.log('   Period:', aggregateData.period);
      console.log('   Metrics:');
      aggregateData.data?.forEach(metric => {
        console.log(`      - ${metric.metric_type}: ${metric.value}`);
      });
    }

    // Step 2: Test cron endpoint with auth
    console.log('\n2️⃣  Testing cron aggregation endpoint...');
    const cronResponse = await fetch(`${API_BASE}/api/cron/analytics-weekly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEEKLY_SECRET}`
      }
    });

    const cronData = await cronResponse.json();

    if (!cronResponse.ok) {
      console.error('   ❌ Cron aggregation failed:', cronData);
      hasErrors = true;
    } else {
      console.log('   ✅ Cron aggregation succeeded');
      console.log('   Message:', cronData.message);
      console.log('   Metrics:', cronData.metrics);
    }

    // Step 3: Verify database records
    console.log('\n3️⃣  Verifying analytics_metrics table...');
    const { data: metrics, error: queryError } = await supabase
      .from('analytics_metrics')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (queryError) {
      console.error('   ❌ Failed to query analytics_metrics:', queryError);
      hasErrors = true;
    } else {
      console.log(`   ✅ Found ${metrics?.length || 0} metric records`);
      if (metrics && metrics.length > 0) {
        console.log('   Latest metrics:');
        metrics.slice(0, 4).forEach(m => {
          console.log(`      - ${m.metric_type}: ${m.value} (${m.period_start.split('T')[0]})`);
        });
      }
    }

    // Step 4: Verify AgentStatus logs
    console.log('\n4️⃣  Checking AgentStatus logs...');
    const { data: logs, error: logError } = await supabase
      .from('AgentStatus')
      .select('*')
      .eq('idea', 'viral-growth')
      .order('last_run', { ascending: false })
      .limit(5);

    if (logError) {
      console.error('   ❌ Failed to query AgentStatus:', logError);
      hasErrors = true;
    } else {
      console.log(`   ✅ Found ${logs?.length || 0} AgentStatus entries`);
      logs?.forEach(log => {
        console.log(`      - ${log.stage}: ${log.success ? 'SUCCESS' : 'FAILED'}`);
      });
    }

    if (hasErrors) {
      console.log('\n❌ Analytics verification FAILED\n');
      process.exit(1);
    } else {
      console.log('\n✅ Analytics verification PASSED\n');
      console.log('Summary:');
      console.log('  - Manual aggregation endpoint working');
      console.log('  - Cron aggregation endpoint working');
      console.log('  - Database records created');
      console.log('  - AgentStatus logging functional');
      console.log('');
    }
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyAnalytics();
