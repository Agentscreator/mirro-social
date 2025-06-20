import { Capacitor } from '@capacitor/core';

export const isMobileApp = () => {
  return Capacitor.isNativePlatform();
};

export const mobileLogin = async (identifier: string, password: string) => {
  try {
    const response = await fetch('YOUR_API_ENDPOINT/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const mobileLogout = async () => {
  // Implement logout logic here
  localStorage.removeItem('auth_token');
};

export const getMobileAuthToken = () => {
  return localStorage.getItem('auth_token');
};

export const setMobileAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token);
}; 