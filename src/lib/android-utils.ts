// Android-specific utilities for Capacitor
import { Capacitor } from '@capacitor/core';

export const isAndroid = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

export const getAndroidInfo = async () => {
  if (!isAndroid()) {
    return null;
  }
  
  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getInfo();
    return {
      platform: info.platform,
      model: info.model,
      manufacturer: info.manufacturer,
      osVersion: info.osVersion,
      webViewVersion: info.webViewVersion,
      isVirtual: info.isVirtual
    };
  } catch (error) {
    console.error('Error getting Android device info:', error);
    return null;
  }
};

export const configureAndroidStatusBar = async () => {
  if (!isAndroid()) {
    return;
  }
  
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
    await StatusBar.setOverlaysWebView({ overlay: false });
  } catch (error) {
    console.error('Error configuring Android status bar:', error);
  }
};

export const configureAndroidKeyboard = async () => {
  if (!isAndroid()) {
    return;
  }
  
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    
    // Configure keyboard behavior
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('Android keyboard will show with height:', info.keyboardHeight);
      document.body.style.paddingBottom = `${info.keyboardHeight}px`;
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      console.log('Android keyboard will hide');
      document.body.style.paddingBottom = '0px';
    });
  } catch (error) {
    console.error('Error configuring Android keyboard:', error);
  }
};

export const handleAndroidBackButton = async () => {
  if (!isAndroid()) {
    return;
  }
  
  try {
    const { App } = await import('@capacitor/app');
    
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // Handle app exit or show confirmation
        if (confirm('Exit app?')) {
          App.exitApp();
        }
      }
    });
  } catch (error) {
    console.error('Error handling Android back button:', error);
  }
};

export const initializeAndroidFeatures = async () => {
  if (!isAndroid()) {
    console.log('Not running on Android, skipping Android-specific initialization');
    return;
  }
  
  console.log('🤖 Initializing Android-specific features...');
  
  try {
    await configureAndroidStatusBar();
    await configureAndroidKeyboard();
    await handleAndroidBackButton();
    
    const deviceInfo = await getAndroidInfo();
    console.log('🤖 Android device info:', deviceInfo);
    
    console.log('✅ Android features initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Android features:', error);
  }
};

export const checkAndroidPermissions = async () => {
  if (!isAndroid()) {
    return null;
  }
  
  try {
    const { Camera } = await import('@capacitor/camera');
    const cameraPermission = await Camera.checkPermissions();
    
    return {
      camera: cameraPermission.camera,
      photos: cameraPermission.photos
    };
  } catch (error) {
    console.error('Error checking Android permissions:', error);
    return null;
  }
};

export const requestAndroidPermissions = async () => {
  if (!isAndroid()) {
    return null;
  }
  
  try {
    const { Camera } = await import('@capacitor/camera');
    const permissions = await Camera.requestPermissions();
    
    console.log('🤖 Android permissions granted:', permissions);
    return permissions;
  } catch (error) {
    console.error('Error requesting Android permissions:', error);
    return null;
  }
};