#!/usr/bin/env node
/**
 * Test Affiliate API (POST /api/affiliate)
 *
 * Tests:
 * 1. Track affiliate click
 * 2. Verify affiliate_clicks table updated
 * 3. Verify all metadata captured
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

async function testAffiliateAPI() {
  console.log('\n🧪 Testing Affiliate API\n');

  const testToolName = 'TestTool-' + Date.now();
  const testUrl = 'https://example.com/test-tool';
  const testWorkspaceId = 'test-workspace-' + Date.now();
  const testPlaybookSlug = 'test-playbook';

  try {
    // Step 1: Call Affiliate API
    console.log('1️⃣  Calling POST /api/affiliate...');
    const response = await fetch(`${API_BASE}/api/affiliate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: testToolName,
        url: testUrl,
        workspaceId: testWorkspaceId,
        playbookSlug: testPlaybookSlug,
        ref: 'test-ref-source',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`   ❌ API returned ${response.status}:`, result);
      return { success: false, reason: 'api_error', details: result };
    }

    console.log('   ✅ API Success:', result);

    // Step 2: Verify affiliate_clicks entry
    console.log('\n2️⃣  Verifying affiliate_clicks table...');
    const { data: affiliateClicks, error: clickError } = await supabase
      .from('affiliate_clicks')
      .select('*')
      .eq('tool_name', testToolName)
      .eq('url', testUrl)
      .order('created_at', { ascending: false })
      .limit(1);

    if (clickError || !affiliateClicks || affiliateClicks.length === 0) {
      console.error('   ❌ Affiliate click not found in database');
      return { success: false, reason: 'click_not_logged' };
    }

    const clickEntry = affiliateClicks[0];
    console.log('   ✅ Affiliate click logged:', {
      tool: clickEntry.tool_name,
      url: clickEntry.url,
      workspaceId: clickEntry.workspace_id,
      playbookSlug: clickEntry.playbook_slug,
      ref: clickEntry.ref,
      timestamp: clickEntry.created_at,
    });

    // Step 3: Verify all metadata captured
    console.log('\n3️⃣  Verifying metadata integrity...');
    const verifications = [
      { field: 'tool_name', expected: testToolName, actual: clickEntry.tool_name },
      { field: 'url', expected: testUrl, actual: clickEntry.url },
      { field: 'workspace_id', expected: testWorkspaceId, actual: clickEntry.workspace_id },
      { field: 'playbook_slug', expected: testPlaybookSlug, actual: clickEntry.playbook_slug },
      { field: 'ref', expected: 'test-ref-source', actual: clickEntry.ref },
    ];

    let allCorrect = true;
    for (const check of verifications) {
      if (check.expected === check.actual) {
        console.log(`   ✅ ${check.field}: ${check.actual}`);
      } else {
        console.error(`   ❌ ${check.field}: expected ${check.expected}, got ${check.actual}`);
        allCorrect = false;
      }
    }

    if (!allCorrect) {
      return { success: false, reason: 'metadata_mismatch' };
    }

    // Step 4: Verify timestamp is recent
    const clickTime = new Date(clickEntry.created_at);
    const now = new Date();
    const ageSeconds = (now - clickTime) / 1000;

    console.log(`\n4️⃣  Verifying timestamp freshness...`);
    console.log(`   Click recorded ${ageSeconds.toFixed(1)}s ago`);

    if (ageSeconds > 60) {
      console.warn('   ⚠️  Click timestamp is older than 60 seconds');
    } else {
      console.log('   ✅ Timestamp is fresh');
    }

    console.log('\n✅ Affiliate API Test PASSED\n');
    return {
      success: true,
      clickId: clickEntry.id,
      toolName: testToolName,
      url: testUrl,
      ageSeconds: Math.floor(ageSeconds),
    };
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return { success: false, reason: 'exception', error: error.message };
  }
}

// Run test
testAffiliateAPI().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
