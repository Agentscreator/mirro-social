// Mobile app detection and authentication utilities
export const isMobileApp = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check for Capacitor (if available)
    const { Capacitor } = await import('@capacitor/core').catch(() => ({ Capacitor: null }));
    if (Capacitor && Capacitor.isNativePlatform) {
      return Capacitor.isNativePlatform();
    }
  } catch (error) {
    // Capacitor not available, continue with other checks
  }
  
  const userAgent = window.navigator.userAgent;
  
  // Check for common mobile app user agents
  const mobileAppIndicators = [
    'ReactNative',
    'Expo',
    'CapacitorWebView',
    'Cordova',
    'PhoneGap',
    'Flutter',
    'MirroApp',
    'MirroMobile'
  ];
  
  for (const indicator of mobileAppIndicators) {
    if (userAgent.includes(indicator)) {
      return true;
    }
  }
  
  // Check for PWA standalone mode
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('app') === 'mobile' || urlParams.get('mode') === 'app') {
    return true;
  }
  
  return false;
};

export const getMobileAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    return localStorage.getItem('mirro_auth_token');
  } catch (error) {
    console.error('Error getting mobile auth token:', error);
    return null;
  }
};

export const setMobileAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('mirro_auth_token', token);
  } catch (error) {
    console.error('Error setting mobile auth token:', error);
  }
};

export const removeMobileAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('mirro_auth_token');
  } catch (error) {
    console.error('Error removing mobile auth token:', error);
  }
};

// Enhanced mobile login that works with NextAuth
export const mobileLogin = async (identifier: string, password: string) => {
  try {
    // Use NextAuth signIn for consistency
    const { signIn } = await import('next-auth/react');
    
    const result = await signIn('credentials', {
      identifier,
      password,
      redirect: false, // Handle redirect manually
    });
    
    if (result?.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Mobile login error:', error);
    throw error;
  }
};

// Enhanced mobile logout
export const mobileLogout = async (): Promise<void> => {
  try {
    const { signOut } = await import('next-auth/react');
    
    // Clear mobile token
    removeMobileAuthToken();
    
    // Sign out from NextAuth
    await signOut({ redirect: false });
    
  } catch (error) {
    console.error('Mobile logout error:', error);
    throw error;
  }
};

// Check if user is authenticated in mobile app
export const isMobileAuthenticated = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  
  try {
    const { getSession } = await import('next-auth/react');
    const session = await getSession();
    
    return !!session;
  } catch (error) {
    console.error('Error checking mobile authentication:', error);
    return false;
  }
};

// Get user session for mobile app
export const getMobileSession = async () => {
  if (typeof window === 'undefined') return null;
  
  try {
    const { getSession } = await import('next-auth/react');
    return await getSession();
  } catch (error) {
    console.error('Error getting mobile session:', error);
    return null;
  }
}; 