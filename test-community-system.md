# Testing Community-Based Video Upload System

## Test Scenarios

### 1. Basic Video Upload with Community
- [ ] Navigate to `/create-video`
- [ ] Upload a video file
- [ ] Add description: "Let's grab coffee downtown!"
- [ ] Enable invites
- [ ] Set invite description: "Join me for a casual coffee meetup"
- [ ] Generate community name (should be "Let's grab coffee Community")
- [ ] Set max participants: 8
- [ ] Post video
- [ ] Verify video appears in feed with "Join Community" button

### 2. Join Community Flow
- [ ] From another account, view the video in feed
- [ ] See invite description: "Join me for a casual coffee meetup"
- [ ] Tap "Join Community" button
- [ ] Verify immediate acceptance
- [ ] Verify redirect to community chat
- [ ] Verify both users are in the community

### 3. Community Chat
- [ ] Verify community name is "Let's grab coffee Community"
- [ ] Verify host is admin
- [ ] Verify joiner is member
- [ ] Send messages between users
- [ ] Verify messages appear in real-time

### 4. Feed Display
- [ ] Verify videos display without small numbers
- [ ] Verify no like/comment counts shown
- [ ] Verify no participant counts shown
- [ ] Verify "Join Community" button is prominent
- [ ] Verify invite description is visible

### 5. Multiple Participants
- [ ] Have 3rd user join the same community
- [ ] Verify all 3 users are in the community chat
- [ ] Verify participant limit is respected
- [ ] Test what happens when limit is reached

## Expected Behavior

### Video Upload
- Clean, TikTok-style interface
- Community name generation works
- All fields save correctly
- Success message and redirect to feed

### Community Join
- One-click "Join Community" button
- Immediate acceptance (no pending state)
- Automatic community chat creation
- Smooth navigation to community

### Feed Experience
- No small numbers/counts visible
- Clean, minimal interface
- Prominent community invite buttons
- Clear invite descriptions

### Community Chat
- Automatic creation on first join
- Proper role assignment (host = admin)
- Real-time messaging
- Community name displayed correctly

## Error Scenarios to Test
- Upload without community name (should show error)
- Upload without invite description (should show error)
- Join when community is full (should show appropriate message)
- Network errors during upload/join

## Database Verification
- Posts table uses `community_name` field
- Groups table created with correct community name
- Group members added with correct roles
- Invite participants tracked correctly