# Testing Scheduled Posts Feature

## ✅ Implementation Complete

### Features Implemented:

1. **Database Schema Updates**:
   - Added `post_status` enum with values: 'draft', 'scheduled', 'live', 'expired'
   - Added `publish_time` timestamp field for scheduling
   - Added `expiry_time` timestamp field for auto-expiry
   - Added indexes for efficient querying

2. **UI Components**:
   - Added "Schedule Post" toggle in NewPostCreator
   - Date and time pickers for publish time
   - Optional expiry time setting
   - Validation for future times and logical time ordering

3. **API Updates**:
   - Updated POST /api/posts to handle scheduling data
   - Set status to 'scheduled' for future posts, 'live' for immediate posts
   - Updated GET /api/posts to only return 'live' posts in all feeds
   - Added validation for scheduling logic

4. **Background Job System**:
   - Created `/api/cron/posts` endpoint for automated processing
   - Publishes scheduled posts when their time arrives
   - Expires live posts when their expiry time is reached
   - Secure with Bearer token authentication

## How to Test:

### 1. Manual Testing:
1. Create a new post
2. Toggle "Schedule Post" 
3. Set a publish time 1-2 minutes in the future
4. Optionally set an expiry time
5. Submit the post
6. Verify it doesn't appear in feeds immediately
7. Wait for publish time and manually trigger cron: `GET /api/cron/posts` with `Authorization: Bearer development-secret`
8. Verify post now appears in feeds

### 2. Automated Scheduling:
- Set up a real cron job to call `/api/cron/posts` every minute
- Or use services like Vercel Cron, GitHub Actions, or similar

### 3. Production Setup:
- Set `CRON_SECRET` environment variable for security
- Configure your preferred cron service to hit the endpoint regularly

## Example Cron Setup:

```yaml
# .github/workflows/scheduled-posts.yml
name: Process Scheduled Posts
on:
  schedule:
    - cron: '* * * * *'  # Every minute
jobs:
  process:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cron endpoint
        run: |
          curl -X GET "${{ secrets.APP_URL }}/api/cron/posts" \
               -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Security Notes:
- Cron endpoint requires Bearer token authentication
- Only 'live' posts are visible in feeds
- Proper validation prevents scheduling in the past
- Database indexes ensure efficient querying

The scheduled post feature is now fully implemented and ready for use!