import { NextRequest, NextResponse } from 'next/server';
import { cohortTracker } from '@/lib/cohortTracker';

/**
 * Activity tracking middleware
 * Automatically tracks user activities for retention analysis
 */

interface ActivityMapping {
  [key: string]: {
    action: string;
    condition?: (req: NextRequest) => boolean;
  };
}

// Map API routes to activity types
const ACTIVITY_MAPPINGS: ActivityMapping = {
  '/api/auth/login': { action: 'login' },
  '/api/posts': { 
    action: 'post_created',
    condition: (req) => req.method === 'POST'
  },
  '/api/posts/[id]/like': { 
    action: 'post_liked',
    condition: (req) => req.method === 'POST'
  },
  '/api/posts/[id]/comments': { 
    action: 'comment_made',
    condition: (req) => req.method === 'POST'
  },
  '/api/messages': { 
    action: 'message_sent',
    condition: (req) => req.method === 'POST'
  },
  '/api/stories/[id]/view': { 
    action: 'story_viewed',
    condition: (req) => req.method === 'POST'
  },
  '/api/users/[id]/follow': { 
    action: 'follow_made',
    condition: (req) => req.method === 'POST'
  },
  '/api/users/[id]/profile': { 
    action: 'profile_visited',
    condition: (req) => req.method === 'GET'
  },
  '/api/search': { 
    action: 'search_performed',
    condition: (req) => req.method === 'GET'
  },
  '/api/feed': { 
    action: 'feed_scrolled',
    condition: (req) => req.method === 'GET'
  }
};

/**
 * Extract user ID from request (adjust based on your auth implementation)
 */
function extractUserId(req: NextRequest): string | null {
  // Try to get from Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    // Decode JWT or session token to get user ID
    // This is a placeholder - implement based on your auth system
    try {
      // Example: const token = authHeader.substring(7);
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // return decoded.userId;
    } catch (error) {
      console.error('Error extracting user ID from token:', error);
    }
  }

  // Try to get from cookies
  const sessionCookie = req.cookies.get('session')?.value;
  if (sessionCookie) {
    // Decode session cookie to get user ID
    // This is a placeholder - implement based on your session system
  }

  // Try to get from custom header
  const userIdHeader = req.headers.get('x-user-id');
  if (userIdHeader) {
    return userIdHeader;
  }

  return null;
}

/**
 * Match request path to activity mapping
 */
function matchActivity(pathname: string, method: string): string | null {
  // Direct match
  if (ACTIVITY_MAPPINGS[pathname]) {
    const mapping = ACTIVITY_MAPPINGS[pathname];
    if (!mapping.condition || mapping.condition({ method } as any)) {
      return mapping.action;
    }
  }

  // Pattern matching for dynamic routes
  for (const [pattern, mapping] of Object.entries(ACTIVITY_MAPPINGS)) {
    if (pattern.includes('[') && pattern.includes(']')) {
      const regex = new RegExp(
        '^' + pattern.replace(/\[.*?\]/g, '[^/]+') + '$'
      );
      if (regex.test(pathname)) {
        if (!mapping.condition || mapping.condition({ method } as any)) {
          return mapping.action;
        }
      }
    }
  }

  return null;
}

/**
 * Activity tracking middleware function
 */
export async function trackActivity(req: NextRequest): Promise<void> {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return; // No user ID found, skip tracking
    }

    const pathname = req.nextUrl.pathname;
    const method = req.method;
    
    const activityType = matchActivity(pathname, method);
    if (!activityType) {
      return; // No matching activity type
    }

    // Extract metadata from request
    const metadata = {
      path: pathname,
      method,
      userAgent: req.headers.get('user-agent'),
      ip: req.ip || req.headers.get('x-forwarded-for'),
      timestamp: new Date().toISOString()
    };

    // Track the activity asynchronously (don't block the request)
    setImmediate(async () => {
      try {
        await cohortTracker.trackUserAction(userId, activityType, metadata);
      } catch (error) {
        console.error('Error tracking user activity:', error);
      }
    });

  } catch (error) {
    console.error('Error in activity tracking middleware:', error);
  }
}

/**
 * Middleware wrapper for Next.js
 */
export function withActivityTracking(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Track activity before processing request
    await trackActivity(req);
    
    // Process the original request
    return handler(req);
  };
}

/**
 * Manual activity tracking function for use in API routes
 */
export async function trackManualActivity(
  userId: string, 
  activityType: string, 
  metadata?: any
): Promise<void> {
  try {
    await cohortTracker.trackUserAction(userId, activityType, metadata);
  } catch (error) {
    console.error('Error tracking manual activity:', error);
  }
}

/**
 * Track app open/session start
 */
export async function trackAppOpen(userId: string, metadata?: any): Promise<void> {
  await trackManualActivity(userId, 'app_opened', {
    ...metadata,
    sessionStart: new Date().toISOString()
  });
}

/**
 * Track user login
 */
export async function trackLogin(userId: string, metadata?: any): Promise<void> {
  await trackManualActivity(userId, 'login', {
    ...metadata,
    loginTime: new Date().toISOString()
  });
}