// Mobile app detection and authentication utilities
export const isMobileApp = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Priority 1: Check for Capacitor (most reliable for our app)
    const { Capacitor } = await import('@capacitor/core').catch(() => ({ Capacitor: null }));
    if (Capacitor) {
      const isNative = Capacitor.isNativePlatform && Capacitor.isNativePlatform();
      console.log('🔍 Capacitor detection:', { available: true, isNative });
      if (isNative) {
        return true;
      }
    }
  } catch (error) {
    console.log('🔍 Capacitor not available:', error instanceof Error ? error.message : 'Unknown error');
  }
  
  const userAgent = window.navigator.userAgent;
  console.log('🔍 User Agent:', userAgent);
  
  // Priority 2: Check for common mobile app user agents
  const mobileAppIndicators = [
    'wv', // WebView indicator
    'ReactNative',
    'Expo',
    'CapacitorWebView',
    'Cordova',
    'PhoneGap',
    'Flutter',
    'MirroApp',
    'MirroMobile',
    'Mobile/',
    'Android.*wv' // Android WebView
  ];
  
  for (const indicator of mobileAppIndicators) {
    if (userAgent.includes(indicator) || new RegExp(indicator).test(userAgent)) {
      console.log('🔍 Mobile app detected via user agent:', indicator);
      return true;
    }
  }
  
  // Priority 3: Check for PWA standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('🔍 Mobile app detected via PWA standalone mode');
    return true;
  }
  
  // Priority 4: Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('app') === 'mobile' || urlParams.get('mode') === 'app') {
    console.log('🔍 Mobile app detected via URL params');
    return true;
  }
  
  // Priority 5: Check for mobile-specific properties
  if ('ontouchstart' in window && window.screen.width <= 768) {
    // Touch device with small screen - likely mobile app
    const isMobileDevice = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    if (isMobileDevice) {
      console.log('🔍 Mobile app detected via device characteristics');
      return true;
    }
  }
  
  console.log('🔍 Mobile app detection: false');
  return false;
};

export const getMobileAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    // Check for NextAuth session token first
    const sessionToken = localStorage.getItem('next-auth.session-token') || 
                        localStorage.getItem('__Secure-next-auth.session-token');
    if (sessionToken) return sessionToken;
    
    // Fallback to legacy token
    return localStorage.getItem('mirro_auth_token');
  } catch (error) {
    console.error('Error getting mobile auth token:', error);
    return null;
  }
};

export const setMobileAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // Store as NextAuth session token for consistency
    localStorage.setItem('mirro_auth_token', token);
    console.log('✅ Mobile auth token stored successfully');
  } catch (error) {
    console.error('❌ Error setting mobile auth token:', error);
  }
};

export const removeMobileAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('mirro_auth_token');
    localStorage.removeItem('next-auth.session-token');
    localStorage.removeItem('__Secure-next-auth.session-token');
    console.log('✅ Mobile auth tokens cleared successfully');
  } catch (error) {
    console.error('❌ Error removing mobile auth token:', error);  
  }
};

// Enhanced mobile login that works with NextAuth
export const mobileLogin = async (identifier: string, password: string) => {
  try {
    console.log('🔐 Starting mobile login for:', identifier);
    
    // Use NextAuth signIn for consistency
    const { signIn, getSession } = await import('next-auth/react');
    
    const trimmedIdentifier = identifier.trim();
    const isEmail = trimmedIdentifier.includes('@');
    
    const result = await signIn('credentials', {
      email: isEmail ? trimmedIdentifier : '',
      username: isEmail ? '' : trimmedIdentifier,
      password,
      redirect: false, // Handle redirect manually
    });
    
    console.log('🔐 SignIn result:', { ok: result?.ok, error: result?.error });
    
    if (result?.error) {
      console.error('❌ Mobile login failed:', result.error);
      throw new Error(result.error);
    }
    
    if (result?.ok) {
      // Get the actual session after successful login
      const session = await getSession();
      console.log('✅ Mobile login successful, session:', !!session);
      
      if (session) {
        // Store session indicator for mobile apps
        setMobileAuthToken('authenticated');
      }
      
      return { ...result, session };
    }
    
    throw new Error('Login failed - unknown error');
  } catch (error) {
    console.error('❌ Mobile login error:', error);
    throw error;
  }
};

// Enhanced mobile logout
export const mobileLogout = async (): Promise<void> => {
  try {
    console.log('🚪 Starting mobile logout');
    const { signOut } = await import('next-auth/react');
    
    // Clear mobile token first
    removeMobileAuthToken();
    
    // Sign out from NextAuth
    await signOut({ redirect: false });
    console.log('✅ Mobile logout successful');
    
  } catch (error) {
    console.error('❌ Mobile logout error:', error);
    throw error;
  }
};

// Check if user is authenticated in mobile app
export const isMobileAuthenticated = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    
    const isAuthenticated = !!session;
    console.log('🔍 Mobile auth check:', isAuthenticated);
    
    return isAuthenticated;
  } catch (error) {
    console.error('❌ Error checking mobile authentication:', error);
    return false;
  }
};

// Get user session for mobile app
export const getMobileSession = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    console.log('📱 Mobile session retrieved:', !!session);
    return session;
  } catch (error) {
    console.error('❌ Error getting mobile session:', error);
    return null;
  }
};

// Diagnostic function for troubleshooting mobile auth issues
export const getMobileAuthDiagnostics = async () => {
  if (typeof window === 'undefined') {
    return { 
      platform: 'server-side',
      error: 'Running on server side'
    };
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    cookiesEnabled: navigator.cookieEnabled,
    localStorage: {
      available: false,
      tokens: {} as Record<string, string | null>
    },
    capacitor: {
      available: false,
      platform: null as string | null,
      isNative: false
    },
    nextAuth: {
      sessionAvailable: false,
      sessionData: null as any
    },
    url: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      search: window.location.search
    },
    isMobile: false,
    errors: [] as string[]
  };

  // Check localStorage
  try {
    diagnostics.localStorage.available = true;
    diagnostics.localStorage.tokens = {
      'mirro_auth_token': localStorage.getItem('mirro_auth_token'),
      'next-auth.session-token': localStorage.getItem('next-auth.session-token'),
      '__Secure-next-auth.session-token': localStorage.getItem('__Secure-next-auth.session-token')
    };
  } catch (error) {
    diagnostics.errors.push('localStorage not available: ' + (error instanceof Error ? error.message : String(error)));
  }

  // Check Capacitor
  try {
    const { Capacitor } = await import('@capacitor/core').catch(() => ({ Capacitor: null }));
    if (Capacitor) {
      diagnostics.capacitor.available = true;
      diagnostics.capacitor.platform = Capacitor.getPlatform();
      diagnostics.capacitor.isNative = Capacitor.isNativePlatform && Capacitor.isNativePlatform();
    }
  } catch (error) {
    diagnostics.errors.push('Capacitor check failed: ' + (error instanceof Error ? error.message : String(error)));
  }

  // Check NextAuth session
  try {
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    diagnostics.nextAuth.sessionAvailable = !!session;
    diagnostics.nextAuth.sessionData = session ? { 
      user: !!session.user, 
      expires: session.expires 
    } : null;
  } catch (error) {
    diagnostics.errors.push('NextAuth session check failed: ' + (error instanceof Error ? error.message : String(error)));
  }

  // Check mobile detection
  try {
    diagnostics.isMobile = await isMobileApp();
  } catch (error) {
    diagnostics.errors.push('Mobile detection failed: ' + (error instanceof Error ? error.message : String(error)));
  }

  return diagnostics;
};