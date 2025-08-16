# Community Video System Testing Guide

## 🚀 Quick Start Testing

### Step 1: Database Migration
First, run the database migration to update your schema:

```sql
-- Run this in your database console
ALTER TABLE posts 
DROP COLUMN IF EXISTS auto_accept_invites,
ADD COLUMN community_name VARCHAR(100);

-- Update existing data if needed
UPDATE posts 
SET community_name = group_name 
WHERE group_name IS NOT NULL;

-- Drop old column
ALTER TABLE posts 
DROP COLUMN IF EXISTS group_name;
```

### Step 2: Test Video Upload
1. Navigate to `/create-video`
2. Upload a video file (any format, under 100MB)
3. Add description: "Let's grab coffee downtown!"
4. Enable invites toggle
5. Set invite description: "Join me for a casual coffee meetup"
6. Click "Generate" next to Community Name (should create "Let's grab coffee Community")
7. Set max participants: 8
8. Click "Post Video"

**Expected Result**: Success message and redirect to feed

### Step 3: Test Community Join
1. Open another browser/incognito window
2. Login with different account
3. Navigate to feed
4. Find the video you just posted
5. Should see "Join Community" button (green)
6. Should see invite description: "Join me for a casual coffee meetup"
7. Should NOT see any small numbers (like counts, participant counts)
8. Click "Join Community"

**Expected Result**: 
- "Welcome to the community!" toast message
- Automatic redirect to community chat
- Both users in the community

### Step 4: Test Community Chat
1. Verify community name is "Let's grab coffee Community"
2. Verify original poster is admin
3. Verify joiner is member
4. Send messages between accounts
5. Verify real-time messaging works

## 🐛 Troubleshooting

### Common Issues:

#### 1. "Column does not exist" error
**Problem**: Database not migrated
**Solution**: Run the migration SQL above

#### 2. "Community name required" error
**Problem**: Form validation working correctly
**Solution**: Enter a community name or click "Generate"

#### 3. Video upload fails
**Problem**: File too large or wrong format
**Solution**: Use video under 100MB, any video format

#### 4. "Join Community" button not showing
**Problem**: Post doesn't have invites enabled
**Solution**: Make sure invites toggle is ON when creating video

#### 5. No redirect to community chat
**Problem**: Group creation might have failed
**Solution**: Check browser console for errors, verify database has groups table

### Debug Steps:

1. **Check Browser Console**: Look for JavaScript errors
2. **Check Network Tab**: Look for failed API requests
3. **Check Database**: Verify posts table has `community_name` column
4. **Check API Logs**: Look at server console for API errors

## 📊 What Should Work Now:

✅ Clean video upload interface (TikTok-style)
✅ Community name generation
✅ "Join Community" button (not "Accept Invite")
✅ No small numbers on feed (no like counts, etc.)
✅ Automatic community creation
✅ Instant community chat access
✅ One-click join process

## 🔍 Key Changes Made:

1. **Database Schema**: 
   - Removed `auto_accept_invites` column
   - Added `community_name` column
   - Updated all APIs to use new schema

2. **UI Changes**:
   - Removed auto-accept toggle
   - Changed to "Community Name" field
   - Button says "Join Community"
   - Removed all small numbers/counts

3. **API Changes**:
   - Always auto-accept community joins
   - Create community on first join
   - Updated field names throughout

## 🎯 Success Criteria:

- [ ] Video uploads successfully
- [ ] Community name saves correctly
- [ ] "Join Community" button appears
- [ ] No small numbers visible on feed
- [ ] One-click join works
- [ ] Community chat created automatically
- [ ] Both users can message in community
- [ ] Clean, TikTok-style interface

If any of these fail, check the troubleshooting section above!