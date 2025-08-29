# Backblaze B2 Migration Guide

## Overview
This document outlines the migration from Vercel Blob to Backblaze B2 for file storage, including fixes for iOS app crashes during uploads.

## Changes Made

### 1. Storage Backend Migration
- **Removed**: `@vercel/blob` dependency
- **Added**: `@aws-sdk/client-s3` for S3-compatible API with Backblaze B2
- **Created**: `src/lib/storage.ts` - New storage utility with B2 integration

### 2. Environment Variables
Your `.env` file already contains the required Backblaze B2 credentials:
```env
B2_BUCKET_NAME=mirro22
B2_KEY_ID=00538617ec26ee50000000001
B2_APPLICATION_KEY=K005Fr00aO9Tkngdg2w1xK23/HpGX8g
B2_ENDPOINT=https://s3.us-west-004.backblazeb2.com
```

### 3. Updated API Routes
The following API routes have been migrated to use Backblaze B2:

#### Profile Image Upload
- **File**: `app/api/users/profile-image/route.ts`
- **Changes**: 
  - Replaced Vercel Blob with B2 storage
  - Added better error handling and memory management
  - Reduced max file size to 5MB for better iOS compatibility
  - Added timeout handling for form data parsing

#### Post Media Upload
- **File**: `app/api/posts/route.ts`
- **Changes**:
  - Migrated to B2 storage
  - Improved error handling for upload failures
  - Better memory management for large files

#### Message File Upload
- **File**: `app/api/messages/upload/route.ts`
- **Changes**:
  - Replaced Vercel Blob with B2
  - Reduced max file size to 25MB for iOS compatibility
  - Added comprehensive error handling
  - Improved memory management with buffer cleanup

#### Stories Media Upload
- **File**: `app/api/stories/route.ts`
- **Changes**:
  - Migrated to B2 storage
  - Maintained existing functionality with new backend

#### Post Edit Upload
- **File**: `app/api/posts/[id]/route.ts`
- **Changes**:
  - Updated to use new storage utility
  - Removed duplicate upload function

### 4. iOS Crash Fixes

#### Memory Management Improvements
- Added proper buffer cleanup after uploads
- Implemented timeout handling for form data parsing
- Reduced maximum file sizes to prevent memory issues
- Added ArrayBuffer cleanup to help with garbage collection

#### Error Handling Enhancements
- Added retry logic with exponential backoff
- Better error messages for different failure scenarios
- Timeout handling for long-running operations
- Validation of file size before processing

#### File Upload Component Updates
- **File**: `components/image-upload.tsx`
- **Changes**:
  - Added client-side file size validation (10MB max)
  - Added file type validation
  - Added iOS-specific input attributes
  - Better error messaging for users

### 5. Storage Utility Features

#### `src/lib/storage.ts` provides:
- **uploadToB2()**: Main upload function with retry logic
- **deleteFromB2()**: File deletion functionality
- **uploadToStorage()**: Backward compatibility wrapper
- **Comprehensive error handling**: Input validation, retry logic, timeout handling
- **Memory management**: Proper cleanup and garbage collection hints

#### Key Features:
- **Retry Logic**: Up to 3 attempts with exponential backoff
- **File Size Limits**: 100MB maximum to prevent crashes
- **Input Validation**: Validates buffer, filename, and MIME type
- **Metadata Support**: Stores original filename and upload timestamp
- **Public URL Generation**: Constructs proper B2 public URLs

## Benefits of Migration

### Cost Savings
- Backblaze B2 is significantly cheaper than Vercel Blob
- No bandwidth charges for the first 1GB per day
- Lower storage costs per GB

### Reliability Improvements
- Retry logic prevents temporary network failures
- Better error handling provides clearer feedback
- Memory management reduces iOS app crashes

### Performance Enhancements
- Reduced file size limits improve upload speed
- Better timeout handling prevents hanging uploads
- Proper cleanup reduces memory usage

## Testing Recommendations

### 1. Profile Image Upload
- Test with various image sizes (1MB, 5MB, 10MB+)
- Test on iOS devices specifically
- Verify images display correctly after upload

### 2. Post Media Upload
- Test both image and video uploads
- Test large files to ensure proper error handling
- Verify media displays in posts correctly

### 3. Message File Upload
- Test various file types (images, videos, documents)
- Test on slow network connections
- Verify files are accessible in messages

### 4. Stories Upload
- Test both image and video stories
- Verify stories display correctly in feed
- Test expiration functionality

## Monitoring

### Key Metrics to Watch
- Upload success rates
- Error rates by endpoint
- Average upload times
- iOS crash reports related to uploads

### Logging
All upload operations now include comprehensive logging:
- File size and type validation
- Upload progress and timing
- Error details with stack traces
- Memory usage indicators

## Rollback Plan

If issues arise, you can temporarily rollback by:
1. Reinstalling `@vercel/blob`: `npm install @vercel/blob`
2. Reverting the API route changes
3. Updating environment variables to use Vercel Blob token

However, the new implementation should be more stable and cost-effective.

## Next Steps

1. **Deploy and Test**: Deploy the changes and test thoroughly on iOS devices
2. **Monitor**: Watch for any upload failures or crashes
3. **Optimize**: Fine-tune file size limits based on real-world usage
4. **Cleanup**: Remove old Vercel Blob files if migration is successful

## Support

If you encounter any issues:
1. Check the server logs for detailed error messages
2. Verify Backblaze B2 credentials are correct
3. Test with smaller file sizes first
4. Monitor memory usage on iOS devices

The migration should significantly improve upload reliability and reduce costs while fixing the iOS crash issues.