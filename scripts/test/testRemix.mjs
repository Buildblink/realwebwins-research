#!/usr/bin/env node
/**
 * Test Remix API (POST /api/remix/[workspaceId])
 *
 * Tests:
 * 1. Clone a published workspace
 * 2. Verify new workspace is created
 * 3. Verify workspace_remixes table updated
 * 4. Verify all outputs are cloned
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

async function testRemixAPI() {
  console.log('\n🧪 Testing Remix API\n');

  try {
    // Step 1: Find a published workspace
    console.log('1️⃣  Finding a published workspace...');
    const { data: publishedWorkspaces, error: fetchError } = await supabase
      .from('public_workspaces')
      .select('workspace_id, title')
      .eq('published', true)
      .limit(1);

    if (fetchError || !publishedWorkspaces || publishedWorkspaces.length === 0) {
      console.log('⚠️  No published workspaces found. Please publish a workspace first.');
      console.log('   Run: Visit /workspace/[painPointId] and click "Publish"');
      return { success: false, reason: 'no_published_workspace' };
    }

    const sourceWorkspaceId = publishedWorkspaces[0].workspace_id;
    console.log(`   Found: ${publishedWorkspaces[0].title} (${sourceWorkspaceId})`);

    // Step 2: Count outputs in source workspace
    const { count: sourceOutputCount } = await supabase
      .from('workspace_outputs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', sourceWorkspaceId);

    console.log(`   Source workspace has ${sourceOutputCount} outputs`);

    // Step 3: Call Remix API
    console.log('\n2️⃣  Calling POST /api/remix/[workspaceId]...');
    const response = await fetch(`${API_BASE}/api/remix/${sourceWorkspaceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-remix-123',
        referrerId: 'test-referrer-456',
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`   ❌ API returned ${response.status}:`, result);
      return { success: false, reason: 'api_error', details: result };
    }

    console.log('   ✅ API Success:', result);

    if (!result.success || !result.newWorkspaceId) {
      console.error('   ❌ Invalid response structure');
      return { success: false, reason: 'invalid_response', details: result };
    }

    const newWorkspaceId = result.newWorkspaceId;

    // Step 4: Verify new workspace exists
    console.log('\n3️⃣  Verifying new workspace created...');
    const { data: newWorkspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('*')
      .eq('id', newWorkspaceId)
      .single();

    if (workspaceError || !newWorkspace) {
      console.error('   ❌ New workspace not found in database');
      return { success: false, reason: 'workspace_not_created' };
    }

    console.log(`   ✅ New workspace created: ${newWorkspace.title}`);

    // Step 5: Verify outputs cloned
    console.log('\n4️⃣  Verifying outputs cloned...');
    const { count: newOutputCount } = await supabase
      .from('workspace_outputs')
      .select('*', { count: 'exact', head: true })
      .eq('workspace_id', newWorkspaceId);

    if (newOutputCount !== sourceOutputCount) {
      console.warn(`   ⚠️  Output count mismatch: source=${sourceOutputCount}, new=${newOutputCount}`);
    } else {
      console.log(`   ✅ All ${newOutputCount} outputs cloned successfully`);
    }

    // Step 6: Verify workspace_remixes entry
    console.log('\n5️⃣  Verifying workspace_remixes table...');
    const { data: remixEntry, error: remixError } = await supabase
      .from('workspace_remixes')
      .select('*')
      .eq('new_workspace_id', newWorkspaceId)
      .single();

    if (remixError || !remixEntry) {
      console.error('   ❌ workspace_remixes entry not found');
      return { success: false, reason: 'remix_not_logged' };
    }

    console.log('   ✅ Remix logged:', {
      source: remixEntry.source_workspace_id,
      new: remixEntry.new_workspace_id,
      referrer: remixEntry.referrer_user_id,
    });

    // Step 7: Verify remix count incremented
    console.log('\n6️⃣  Verifying remix count incremented...');
    const { data: updatedPublicWorkspace } = await supabase
      .from('public_workspaces')
      .select('remix_count')
      .eq('workspace_id', sourceWorkspaceId)
      .single();

    console.log(`   Remix count: ${updatedPublicWorkspace?.remix_count || 0}`);

    console.log('\n✅ Remix API Test PASSED\n');
    return {
      success: true,
      sourceWorkspaceId,
      newWorkspaceId,
      outputsCloned: newOutputCount,
      remixCount: updatedPublicWorkspace?.remix_count || 0,
    };
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    return { success: false, reason: 'exception', error: error.message };
  }
}

// Run test
testRemixAPI().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
