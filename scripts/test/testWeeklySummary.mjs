#!/usr/bin/env node
/**
 * Test Weekly Summary API (POST /api/cron/weekly-summary)
 *
 * Tests:
 * 1. Call weekly summary endpoint with authorization
 * 2. Verify newsletter markdown generated
 * 3. Verify tweet snippets generated
 * 4. Verify manifest.json created
 * 5. Verify file contents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const WEEKLY_SUMMARY_SECRET = process.env.WEEKLY_SUMMARY_SECRET;

if (!WEEKLY_SUMMARY_SECRET) {
  console.error('❌ Missing WEEKLY_SUMMARY_SECRET environment variable');
  console.error('   Add to .env.local: WEEKLY_SUMMARY_SECRET=your-secret');
  process.exit(1);
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

async function testWeeklySummaryAPI() {
  console.log('\n🧪 Testing Weekly Summary API\n');

  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  const exportDir = path.join(process.cwd(), 'exports', 'weekly', `${year}-${week}`);

  try {
    // Step 1: Clean up previous test output (optional)
    console.log('1️⃣  Preparing test environment...');
    if (fs.existsSync(exportDir)) {
      console.log(`   Existing export directory found: ${exportDir}`);
      console.log('   Files will be overwritten');
    }

    // Step 2: Call Weekly Summary API
    console.log('\n2️⃣  Calling POST /api/cron/weekly-summary...');
    console.log(`   Authorization: Bearer ${WEEKLY_SUMMARY_SECRET.substring(0, 10)}...`);

    const response = await fetch(`${API_BASE}/api/cron/weekly-summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEEKLY_SUMMARY_SECRET}`,
      },
    });

    if (response.status === 401 || response.status === 403) {
      console.error('   ❌ Authorization failed - check WEEKLY_SUMMARY_SECRET');
      return { success: false, reason: 'unauthorized' };
    }

    const result = await response.json();

    if (!response.ok) {
      console.error(`   ❌ API returned ${response.status}:`, result);
      return { success: false, reason: 'api_error', details: result };
    }

    console.log('   ✅ API Success:', result);

    // Step 3: Wait a moment for file system operations
    console.log('\n3️⃣  Waiting for file generation...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Verify export directory created
    console.log('\n4️⃣  Verifying export directory...');
    if (!fs.existsSync(exportDir)) {
      console.error(`   ❌ Export directory not created: ${exportDir}`);
      return { success: false, reason: 'directory_not_created' };
    }
    console.log(`   ✅ Directory exists: ${exportDir}`);

    // Step 5: Verify required files exist
    console.log('\n5️⃣  Verifying generated files...');
    const requiredFiles = [
      { name: 'newsletter.md', type: 'Newsletter markdown' },
      { name: 'tweets.txt', type: 'Tweet snippets' },
      { name: 'manifest.json', type: 'Metadata manifest' },
    ];

    const fileStats = [];
    let allFilesExist = true;

    for (const file of requiredFiles) {
      const filePath = path.join(exportDir, file.name);
      if (!fs.existsSync(filePath)) {
        console.error(`   ❌ ${file.type} not found: ${file.name}`);
        allFilesExist = false;
      } else {
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   ✅ ${file.type}: ${file.name} (${sizeKB} KB)`);
        fileStats.push({ name: file.name, size: stats.size });
      }
    }

    if (!allFilesExist) {
      return { success: false, reason: 'missing_files' };
    }

    // Step 6: Verify file contents
    console.log('\n6️⃣  Verifying file contents...');

    // Check newsletter.md
    const newsletterPath = path.join(exportDir, 'newsletter.md');
    const newsletterContent = fs.readFileSync(newsletterPath, 'utf-8');
    const hasHeading = newsletterContent.includes('# Weekly');
    const hasWorkspaces = newsletterContent.includes('Workspace') || newsletterContent.includes('workspace');

    if (!hasHeading || !hasWorkspaces) {
      console.warn('   ⚠️  newsletter.md may be missing expected content');
    } else {
      console.log('   ✅ newsletter.md has expected structure');
    }

    // Check tweets.txt
    const tweetsPath = path.join(exportDir, 'tweets.txt');
    const tweetsContent = fs.readFileSync(tweetsPath, 'utf-8');
    const tweetLines = tweetsContent.split('\n').filter(l => l.trim());

    console.log(`   ✅ tweets.txt contains ${tweetLines.length} lines`);

    // Check manifest.json
    const manifestPath = path.join(exportDir, 'manifest.json');
    let manifestData;
    try {
      manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      console.log('   ✅ manifest.json is valid JSON');
      console.log(`      Generated: ${manifestData.generatedAt}`);
      console.log(`      Week: ${manifestData.week}`);
      console.log(`      Workspaces: ${manifestData.workspaceCount}`);
    } catch (err) {
      console.error('   ❌ manifest.json is invalid:', err.message);
      return { success: false, reason: 'invalid_manifest' };
    }

    // Step 7: Summary
    console.log('\n7️⃣  Summary:');
    console.log(`   📁 Export directory: ${exportDir}`);
    console.log(`   📄 Files generated: ${fileStats.length}`);
    fileStats.forEach(file => {
      console.log(`      - ${file.name}: ${file.size} bytes`);
    });

    console.log('\n✅ Weekly Summary API Test PASSED\n');
    return {
      success: true,
      exportDir,
      files: fileStats,
      manifestData,
    };
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error(error.stack);
    return { success: false, reason: 'exception', error: error.message };
  }
}

// Run test
testWeeklySummaryAPI().then((result) => {
  if (!result.success) {
    process.exit(1);
  }
});
