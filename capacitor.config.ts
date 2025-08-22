import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mirro2.app',  // Updated to match your Apple Developer App ID
  appName: 'MirroSocial',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Use environment variable for URL, fallback to production
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.mirro2.com',
    cleartext: process.env.NODE_ENV === 'development',
    // Performance optimizations
    allowNavigation: ['https://www.mirro2.com', 'https://mirro2.com'],
    iosScheme: 'ionic'
  },
  android: {
    buildOptions: {
      keystorePath: 'release-key.keystore',
      keystoreAlias: 'key0',
      keystorePassword: 'your_keystore_password'
    }
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,  // Reduced from 1500ms
      backgroundColor: "#000000",  // Match app background
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#999999",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
      launchAutoHide: true  // Auto-hide splash screen
    },
    App: {
      initialPath: "/login"
    },
    Keyboard: {
      resize: "ionic",
      resizeOnFullScreen: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000"
    },
    // Apple Watch specific configurations
    Device: {
      watchSupport: true
    },
    Haptics: {
      watchHaptics: true
    }
  },
  // Apple Watch specific settings
  ios: {
    scheme: "MirroSocial",
    watchApp: {
      bundleId: "com.mirro2.app.watchkitapp",
      displayName: "Mirro Watch"
    },
    // iOS Performance optimizations
    webContentsDebuggingEnabled: false,
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInsetAdjustmentBehavior: "automatic"
  },
  
  // Android Performance optimizations
  android: {
    buildOptions: {
      keystorePath: 'release-key.keystore',
      keystoreAlias: 'key0',
      keystorePassword: 'your_keystore_password'
    },
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
    captureInput: true,
    webViewAssetLoader: true
  }
};

export default config;