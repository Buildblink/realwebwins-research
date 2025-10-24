# Phase 13 & 14 Testing Guide

## 🎯 Testing Overview

This guide will walk you through testing all features built in Phase 13 (Intelligence & Personalization) and Phase 14 (Community & Growth Flywheel).

---

## 🚀 Step 1: Run Database Migrations

### Phase 13 Migration
```bash
npm run ensure:phase13-schema
```

**Expected output:**
- ✅ user_events table created
- ✅ workspace_memories table created
- ✅ workspace_outputs.rating column added
- ✅ workspaces.user_id column added

### Phase 14 Migration
```bash
npm run ensure:phase14-schema
```

**Expected output:**
- ✅ profiles table created
- ✅ public_workspaces table created
- ✅ referrals table created
- ✅ workspace_remixes table created
- ✅ workspaces.published_workspace_id column added

### Verify Migrations (Optional)
Check your Supabase dashboard → SQL Editor → run:
```sql
-- Check Phase 13 tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('user_events', 'workspace_memories');

-- Check Phase 14 tables
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('profiles', 'public_workspaces', 'referrals', 'workspace_remixes');

-- Check new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'workspace_outputs' AND column_name = 'rating';

SELECT column_name FROM information_schema.columns
WHERE table_name = 'workspaces' AND column_name IN ('user_id', 'published_workspace_id');
```

---

## 🧪 Step 2: Start Development Server

```bash
npm run dev
```

Navigate to: http://localhost:3000

---

## 📊 PHASE 13 TESTING

### Test 1: Analytics Tracking

#### 1.1 Workspace Open Tracking
1. Go to `/pain-points`
2. Click any pain point card to open workspace
3. **Check Supabase:**
   ```sql
   SELECT * FROM user_events
   WHERE event = 'workspace_opened'
   ORDER BY created_at DESC LIMIT 5;
   ```
   **Expected:** New event with context containing painPointId, workspaceId, category, niche

#### 1.2 Section Generation Tracking
1. In workspace, click "Generate" on any section (Understand, Ideate, Build, or Validate)
2. Wait for generation to complete
3. **Check Supabase:**
   ```sql
   SELECT * FROM user_events
   WHERE event = 'section_generated'
   ORDER BY created_at DESC LIMIT 5;
   ```
   **Expected:** Event with section name in context

#### 1.3 Export Tracking
1. In workspace, scroll to right sidebar "Deliverables" card
2. Click "Export as PDF"
3. **Check Supabase:**
   ```sql
   SELECT * FROM user_events
   WHERE event IN ('export_clicked', 'export_completed')
   ORDER BY created_at DESC LIMIT 5;
   ```
   **Expected:** Two events (clicked and completed)

#### 1.4 Copilot Tracking
1. In workspace, scroll to right sidebar "Copilot Input"
2. Type a question (e.g., "What's the best tech stack?")
3. Submit
4. **Check Supabase:**
   ```sql
   SELECT * FROM user_events
   WHERE event = 'copilot_asked'
   ORDER BY created_at DESC LIMIT 5;
   ```
   **Expected:** Event with questionLength in context

### Test 2: Dashboard Analytics

1. Navigate to `/dashboard`
2. **Verify displays:**
   - ✅ Total Workspaces count
   - ✅ Sections Generated count
   - ✅ Total Activity count
   - ✅ Active Users count
   - ✅ Recent Activity timeline with events
   - ✅ Top Categories bar chart
   - ✅ Section Generation Breakdown

**Expected:** All metrics should show real data from user_events table

### Test 3: Recommendations System

1. Open any workspace at `/workspace/[painPointId]`
2. Scroll to left sidebar below "Pain Point Snapshot"
3. **Verify:**
   - ✅ "Recommended for You" section appears
   - ✅ Shows up to 5 similar workspaces
   - ✅ Recommendations have category/niche badges
   - ✅ Clicking a recommendation navigates to that workspace
   - ✅ "Highly relevant" badge shows for exact matches

**Check Network tab:** `/api/recommendations` should return similar workspaces

### Test 4: Feedback Rating System

1. Open workspace and generate any section
2. Scroll down in the section content
3. **Verify:**
   - ✅ "Rate this section:" appears below content
   - ✅ Thumbs up/down buttons visible
4. Click thumbs up
   - ✅ Button turns green
   - ✅ Network shows POST to `/api/workspace/[id]/rating`
5. Click thumbs up again
   - ✅ Button returns to neutral (toggle behavior)
6. Click thumbs down
   - ✅ Button turns red
7. **Check Supabase:**
   ```sql
   SELECT id, section, rating FROM workspace_outputs
   WHERE rating IS NOT NULL
   ORDER BY updated_at DESC LIMIT 5;
   ```
   **Expected:** Rating column shows -1, 0, or 1

### Test 5: AI Personalization

1. Open multiple workspaces (3-5 different ones)
2. Generate sections in different categories (Marketing, Product, etc.)
3. Open a new workspace in a category you've explored
4. Generate a section
5. **Check logs:** Console should show user context being fetched
6. **Verify:** Generated content should reference your interests (subtle)

**Check Supabase:**
```sql
SELECT event, context->>'category', context->>'niche'
FROM user_events
WHERE event = 'workspace_opened'
ORDER BY created_at DESC LIMIT 10;
```

The AI should detect your most-viewed categories and personalize prompts.

---

## 👥 PHASE 14 TESTING

### Test 6: User Profiles

#### 6.1 Create Profile
**Manual API Test (until we add UI):**

```bash
curl -X POST http://localhost:3000/api/profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-123",
    "username": "testbuilder",
    "bio": "Testing the profile system!",
    "links": [
      {"label": "Twitter", "url": "https://twitter.com/testbuilder"}
    ]
  }'
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "id": "...",
    "user_id": "test-user-123",
    "username": "testbuilder",
    "bio": "Testing the profile system!",
    "links": [...]
  }
}
```

#### 6.2 View Public Profile
1. Navigate to `/u/testbuilder`
2. **Verify:**
   - ✅ Username displays as @testbuilder
   - ✅ Bio appears
   - ✅ Social links show with external link icons
   - ✅ Stats show (Published: 0, Views: 0, Remixes: 0)
   - ✅ "No published workspaces yet" message

### Test 7: Workspace Publishing

#### 7.1 Publish a Workspace
1. Open any workspace at `/workspace/[painPointId]`
2. Generate at least the "Understand" section
3. Click "Publish" button in top bar
4. **Verify modal:**
   - ✅ Modal opens with title "Publish Workspace"
   - ✅ Title field pre-filled with workspace title
   - ✅ Description field pre-filled with pain point text
   - ✅ Category field shows pain point category
   - ✅ Preview card shows at bottom
5. Edit title/description
6. Click "Publish" button
7. **Verify:**
   - ✅ Loading state shows ("Publishing...")
   - ✅ Success checkmark appears
   - ✅ Modal closes after 1.5 seconds

#### 7.2 Check Published Workspace
**Check Supabase:**
```sql
SELECT * FROM public_workspaces
WHERE published = true
ORDER BY created_at DESC LIMIT 5;
```

**Expected:** New row with:
- workspace_id
- published = true
- title, slug, description, category
- views = 0, remix_count = 0

#### 7.3 Unpublish Workspace
1. Open the same workspace
2. Click "Publish" button again
3. **Verify modal:**
   - ✅ Shows "Manage Published Workspace"
   - ✅ Warning: "This workspace is currently published..."
   - ✅ "Unpublish" button visible
4. Click "Unpublish"
5. **Check Supabase:**
   ```sql
   SELECT published FROM public_workspaces
   WHERE workspace_id = '[your-workspace-id]';
   ```
   **Expected:** published = false

### Test 8: Showcase Page

#### 8.1 Basic Display
1. Publish 2-3 workspaces (repeat Test 7.1)
2. Navigate to `/showcase`
3. **Verify:**
   - ✅ "Workspace Showcase" title
   - ✅ Category filter buttons (All, Marketing, Product, etc.)
   - ✅ Sort buttons (Most Recent, Most Popular, Most Remixed)
   - ✅ Grid of published workspace cards
   - ✅ Each card shows: title, description, category/niche badges, views, remixes

#### 8.2 Category Filter
1. Publish workspaces in different categories
2. Click "Marketing" filter
3. **Verify:** Only Marketing workspaces show
4. Click "Product" filter
5. **Verify:** Only Product workspaces show
6. Click "All"
7. **Verify:** All workspaces show

#### 8.3 Sort Options
1. Click "Most Popular" (Eye icon)
   - **Expected:** Workspaces sorted by views (descending)
2. Click "Most Remixed" (Copy icon)
   - **Expected:** Workspaces sorted by remix_count (descending)
3. Click "Most Recent" (Clock icon)
   - **Expected:** Workspaces sorted by created_at (newest first)

#### 8.4 Pagination
1. If you have >12 published workspaces:
   - **Verify:** "Next" button appears
   - Click "Next"
   - **Verify:** Page 2 displays
   - **Verify:** "Previous" button appears
   - Click "Previous"
   - **Verify:** Back to page 1

#### 8.5 Workspace Navigation
1. Click any workspace card in showcase
2. **Verify:** Navigates to `/workspace/[painPointId]`
3. **Verify:** Workspace loads correctly

---

## 🔍 Integration Tests

### Test 9: Full User Journey

**Scenario:** New user discovers, customizes, and publishes a workspace

1. **Discover:**
   - Go to `/pain-points`
   - Browse pain points
   - Click one to open workspace
   - **CHECK:** workspace_opened event tracked

2. **Explore:**
   - View "Understand" section (auto-generated)
   - Click thumbs up
   - **CHECK:** rating saved
   - Generate "Ideate" section
   - **CHECK:** section_generated event tracked

3. **Personalize:**
   - Open 2 more workspaces in same category
   - Generate sections
   - Return to first workspace
   - Generate "Build" section
   - **CHECK:** AI prompt includes user context

4. **Publish:**
   - Click "Publish" button
   - Fill out modal
   - Click "Publish"
   - **CHECK:** public_workspaces row created

5. **Share:**
   - Navigate to `/showcase`
   - Find your published workspace
   - **CHECK:** Appears in showcase
   - Click workspace card
   - **CHECK:** Loads correctly

6. **Analytics:**
   - Go to `/dashboard`
   - **CHECK:** All your activity shows in metrics
   - **CHECK:** Activity timeline shows events
   - **CHECK:** Category chart shows your explored categories

### Test 10: Recommendations Accuracy

1. Create 3 workspaces:
   - Workspace A: Category "Marketing", Niche "SaaS"
   - Workspace B: Category "Marketing", Niche "E-commerce"
   - Workspace C: Category "Product", Niche "SaaS"

2. Open Workspace A
3. Check recommendations sidebar
4. **Verify:**
   - Workspace B should appear (same category)
   - Workspace C might appear (same niche)
   - Both should have relevance indicators

---

## 🐛 Common Issues & Fixes

### Issue: Migrations fail with "exec_sql RPC not available"
**Fix:** Run SQL manually in Supabase SQL Editor
- Copy content from `scripts/migrations/create_phase13_tables.sql`
- Paste and run in Supabase
- Repeat for phase14

### Issue: Analytics events not tracking
**Fix:**
- Check browser console for errors
- Verify NEXT_PUBLIC_SUPABASE_URL is set
- Check Network tab for failed API calls

### Issue: Recommendations showing nothing
**Fix:**
- Ensure you have multiple workspaces
- Check that workspaces have different categories/niches
- Verify workspace_id relationships in database

### Issue: Published workspace not appearing in showcase
**Fix:**
```sql
-- Check if workspace is actually published
SELECT * FROM public_workspaces WHERE workspace_id = '[your-id]';

-- Ensure published = true
UPDATE public_workspaces SET published = true WHERE id = '[public-workspace-id]';
```

### Issue: Profile page 404
**Fix:** Ensure username exists in profiles table
```sql
SELECT * FROM profiles WHERE username = 'testbuilder';
```

---

## ✅ Testing Checklist

Copy this checklist and mark off as you test:

### Phase 13
- [ ] Analytics tracking (workspace_opened)
- [ ] Analytics tracking (section_generated)
- [ ] Analytics tracking (export_clicked)
- [ ] Analytics tracking (copilot_asked)
- [ ] Dashboard metrics display
- [ ] Activity timeline shows events
- [ ] Category chart displays
- [ ] Recommendations sidebar appears
- [ ] Recommendations are relevant
- [ ] Feedback rating (thumbs up)
- [ ] Feedback rating (thumbs down)
- [ ] Rating toggle works
- [ ] AI personalization (user context)

### Phase 14
- [ ] Create profile via API
- [ ] View public profile (/u/username)
- [ ] Publish workspace modal opens
- [ ] Publish workspace succeeds
- [ ] Published workspace in database
- [ ] Unpublish workspace works
- [ ] Showcase page loads
- [ ] Showcase category filter works
- [ ] Showcase sort options work
- [ ] Showcase pagination works
- [ ] Clicking showcase card navigates correctly
- [ ] Profile stats update

### Integration
- [ ] Full user journey (discover → publish)
- [ ] Recommendations accuracy
- [ ] Analytics reflect all activity
- [ ] Mobile responsive (test on phone)

---

## 📊 Expected Database State After Testing

After running all tests, your database should have:

**user_events:**
- 20+ events of various types
- workspace_opened, section_generated, export_clicked, copilot_asked, etc.

**workspace_outputs:**
- Multiple sections with ratings (-1, 0, 1)

**workspaces:**
- 5+ workspaces
- Some with user_id set
- Some with published_workspace_id set

**public_workspaces:**
- 3+ published workspaces
- Various categories
- published = true

**profiles:**
- 1+ test profiles
- Unique usernames

---

## 🎯 Next Steps After Testing

1. **If all tests pass:**
   - Document any bugs in GitHub issues
   - Plan deployment to production
   - Consider building remaining features (Remix, Leaderboard)

2. **If tests fail:**
   - Note which feature failed
   - Check error logs
   - Fix issues one by one
   - Re-run tests

3. **Performance testing:**
   - Test with 100+ pain points
   - Test with 50+ published workspaces
   - Check page load times
   - Verify API response times

---

## 📝 Test Results Template

Use this template to document your testing:

```markdown
## Test Results - [Date]

### Phase 13 Results
- Analytics Tracking: ✅ / ❌
- Dashboard: ✅ / ❌
- Recommendations: ✅ / ❌
- Ratings: ✅ / ❌
- AI Personalization: ✅ / ❌

### Phase 14 Results
- Profiles: ✅ / ❌
- Publishing: ✅ / ❌
- Showcase: ✅ / ❌

### Issues Found
1. [Issue description]
2. [Issue description]

### Notes
- [Any observations]
```

---

Ready to start testing? Begin with **Step 1: Run Database Migrations**! 🚀
