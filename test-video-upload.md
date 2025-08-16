# Testing Video Upload with Group Invites

## Test Scenarios

### 1. Basic Video Upload
- [ ] Navigate to `/create-video`
- [ ] Upload a video file
- [ ] Add description
- [ ] Post without invites enabled
- [ ] Verify video appears in feed

### 2. Auto-Accept Group Invite
- [ ] Upload video with invites enabled
- [ ] Set invite description: "Join me for coffee at Starbucks"
- [ ] Enable auto-accept
- [ ] Set group name: "Coffee Meetup"
- [ ] Post video
- [ ] From another account, tap "Join Group"
- [ ] Verify automatic acceptance
- [ ] Verify group chat creation
- [ ] Verify both users in group

### 3. Manual Review Invite
- [ ] Upload video with invites enabled
- [ ] Set invite description: "Let's go hiking this weekend"
- [ ] Disable auto-accept
- [ ] Post video
- [ ] From another account, tap "Request to Join"
- [ ] Verify "Request Sent" status
- [ ] Verify notification to host

### 4. Location Request
- [ ] Upload video with location enabled
- [ ] Set location: "Central Park"
- [ ] Post video
- [ ] From another account, tap "Request Location"
- [ ] Verify location request sent

### 5. Feed Display
- [ ] Verify videos display in TikTok-style feed
- [ ] Verify auto-play functionality
- [ ] Verify invite buttons show correctly
- [ ] Verify participant count displays

## Expected Behavior

### Video Upload
- File validation (size, type)
- Preview with play/pause
- Progress indicator during upload
- Success message and redirect to feed

### Group Creation
- Automatic group creation on first acceptance
- Host becomes admin
- Participants become members
- Group name from video or custom input

### Invite Status
- "Join Group" for auto-accept
- "Request to Join" for manual
- "Request Sent" for pending
- "In Group" for accepted
- Participant count display

### Feed Integration
- Videos auto-play when in view
- Invite buttons prominent and functional
- Real-time status updates
- Smooth scrolling experience

## Error Handling
- File too large: Show error message
- Invalid file type: Show error message
- Network error: Retry mechanism
- Already requested: Show appropriate status
- Invite full: Disable button