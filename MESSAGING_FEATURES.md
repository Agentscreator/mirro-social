# TikTok-Style Video Upload with Community Invites

## Overview
The app now features a TikTok-style video upload system where users can create short-form video content and invite others to join communities, automatically creating community chats for all participants.

## Key Features

### 1. Video Upload System
- **TikTok-style interface**: Vertical video format (9:16 aspect ratio) optimized for mobile
- **Video requirements**: 
  - Max file size: 100MB
  - Supported formats: All video formats
  - Duration tracking and display
- **Upload flow**:
  1. Select video from device
  2. Preview with play/pause controls
  3. Add description and community settings
  4. Post to feed

### 2. Community Invite System
- **Invite Description**: Users describe what they're inviting people to do (e.g., "Join me for coffee", "Let's go hiking")
- **Participant Limits**: Set maximum number of participants (2-50)
- **Auto-Join Communities**: 
  - All requests are automatically accepted
  - Automatically creates a community chat
  - Users are immediately added to the community
- **Simple Join Process**: One-click "Join Community" button

### 3. Community Creation
- **Custom Community Names**: Users name their communities
- **Instant Messaging**: All participants are added to community chat
- **Community Management**: Host becomes admin, participants are members

### 4. Location Sharing
- **Private Locations**: Users can add location information
- **Location Requests**: Viewers can request location details from the host
- **Privacy Control**: Locations are private by default

### 5. Feed Integration
- **Video Feed**: TikTok-style vertical scrolling feed
- **Invite Buttons**: Prominent invite buttons on videos with invites enabled
- **Real-time Status**: Shows current participant count and request status
- **Auto-play**: Videos auto-play when in view

## User Flow

### Creating a Video Community
1. Tap "Create" button in navigation
2. Select or record video
3. Add description
4. Enable invites and describe the activity
5. Set participant limit
6. Name your community
7. Optionally add location
8. Post video

### Joining a Community
1. View video in feed
2. See invite description below video
3. Tap "Join Community"
4. Immediately join community chat
5. Start connecting with other members

### Community Chat Experience
1. Automatic community creation upon first join
2. Host is admin, participants are members
3. Community name reflects the activity
4. Standard messaging features available

## Technical Implementation

### Database Schema
- `post_invites` table with invite descriptions
- `groups` table linked to posts
- `group_members` table for participant management
- `invite_requests` table for tracking requests

### API Endpoints
- `POST /api/posts` - Create video with invite
- `POST /api/posts/[id]/invite` - Request to join invite
- `GET /api/posts/[id]/invite` - Get invite details

### Components
- `CreateVideoPage` - TikTok-style upload interface
- `InviteButton` - Smart invite button with status
- `VideoFeedItem` - Enhanced video display with invites

## Benefits
1. **Social Discovery**: Easy way to find and join local activities
2. **Instant Connection**: Automatic community creation facilitates immediate communication
3. **Visual Appeal**: Video format is more engaging than text posts
4. **Mobile-First**: Optimized for mobile usage patterns
5. **Simplified Process**: One-click join removes friction
6. **Community Building**: Focus on building lasting communities around shared interests

## Future Enhancements
- Video editing tools integration
- Live streaming capabilities
- Event scheduling within communities
- Location-based community discovery
- Push notifications for community updates
- Community moderation tools