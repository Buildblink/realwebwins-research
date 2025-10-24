#!/usr/bin/env node
/**
 * Verify Remix Fix - Phase 15
 *
 * Validates that workspaces.user_id type change from uuid to text
 * allows the Remix API to work with arbitrary user identifiers
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

async function verifyRemixFix() {
  console.log('\n🔍 Verifying Remix Fix\n');

  try {
    // Step 1: Verify column type by attempting direct insert
    console.log('1️⃣  Testing workspaces.user_id accepts text values...');

    const testPainPoint = {
      text: 'Test pain point for remix verification',
      category: 'test',
      niche: 'test',
      source: 'verification',
      frequency: 1,
    };

    const { data: painPoint, error: ppError } = await supabase
      .from('pain_points')
      .insert([testPainPoint])
      .select()
      .single();

    if (ppError || !painPoint) {
      console.error('   ❌ Failed to create test pain point:', ppError);
      return { success: false, reason: 'pain_point_creation_failed' };
    }

    const testWorkspace = {
      pain_point_id: painPoint.id,
      title: 'Test Workspace for Remix Verification',
      status: 'active',
      user_id: 'test-string-user-id-' + Date.now(), // String, not UUID
    };

    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert([testWorkspace])
      .select()
      .single();

    if (wsError) {
      console.error('   ❌ workspaces.user_id still rejects text values:', wsError);
      console.error('   ⚠️  Please run the SQL migration first:');
      console.error('      scripts/migrations/fix_workspaces_user_id_type.sql');

      // Cleanup
      await supabase.from('pain_points').delete().eq('id', painPoint.id);

      return { success: false, reason: 'user_id_type_not_fixed', error: wsError };
    }

    console.log('   ✅ workspaces.user_id now accepts text values');

    // Cleanup test data
    await supabase.from('workspaces').delete().eq('id', workspace.id);
    await supabase.from('pain_points').delete().eq('id', painPoint.id);

    // Step 2: Find a published workspace for API test
    console.log('\n2️⃣  Looking for published workspace...');
    const { data: publishedWorkspaces } = await supabase
      .from('public_workspaces')
      .select('workspace_id, title')
      .eq('published', true)
      .limit(1);

    if (!publishedWorkspaces || publishedWorkspaces.length === 0) {
      console.log('   ⚠️  No published workspaces found');
      console.log('   ℹ️  Column type fix verified, but cannot test Remix API');
      console.log('   ℹ️  Publish a workspace to complete full verification');
      return {
        success: true,
        columnTypeFixed: true,
        apiTestSkipped: true,
        reason: 'no_published_workspace',
      };
    }

    const sourceWorkspaceId = publishedWorkspaces[0].workspace_id;
    console.log(`   Found: ${publishedWorkspaces[0].title}`);

    // Step 3: Call Remix API
    console.log('\n3️⃣  Calling Remix API with string user_id...');
    const response = await fetch(`${API_BASE}/api/remix/${sourceWorkspaceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'verify-remix-user-' + Date.now(),
        ref: 'verify-ref-' + Date.now(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`   ❌ Remix API failed (${response.status}):`, result);
      return { success: false, reason: 'api_failed', details: result };
    }

    if (!result.success || !result.data?.newWorkspaceId) {
      console.error('   ❌ Unexpected API response:', result);
      return { success: false, reason: 'invalid_response', details: result };
    }

    console.log('   ✅ Remix API succeeded');
    console.log(`   New workspace: ${result.data.newWorkspaceId}`);

    // Step 4: Verify database state
    console.log('\n4️⃣  Verifying database records...');

    const { data: newWorkspace } = await supabase
      .from('workspaces')
      .select('id, user_id, title')
      .eq('id', result.data.newWorkspaceId)
      .single();

    if (!newWorkspace) {
      console.error('   ❌ New workspace not found in database');
      return { success: false, reason: 'workspace_not_found' };
    }

    console.log(`   ✅ Workspace created: ${newWorkspace.title}`);
    console.log(`   ✅ user_id stored correctly: ${newWorkspace.user_id}`);

    const { data: remixEntry } = await supabase
      .from('workspace_remixes')
      .select('*')
      .eq('new_workspace_id', result.data.newWorkspaceId)
      .single();

    if (!remixEntry) {
      console.error('   ❌ workspace_remixes entry not found');
      return { success: false, reason: 'remix_not_logged' };
    }

    console.log('   ✅ Remix logged in workspace_remixes');

    console.log('\n✅ Remix Fix Verification PASSED\n');
    console.log('Summary:');
    console.log('  - workspaces.user_id now accepts text values ✅');
    console.log('  - Remix API works with string user IDs ✅');
    console.log('  - Database records created correctly ✅');
    console.log('');

    return {
      success: true,
      columnTypeFixed: true,
      apiTested: true,
      newWorkspaceId: result.data.newWorkspaceId,
    };
  } catch (error) {
    console.error('\n❌ Verification failed with error:', error.message);
    return { success: false, reason: 'exception', error: error.message };
  }
}

// Run verification
verifyRemixFix().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
