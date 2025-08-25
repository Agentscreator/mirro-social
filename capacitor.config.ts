import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mirro2.app',
  appName: 'MirroSocial',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.mirro2.com',
    cleartext: process.env.NODE_ENV === 'development',
    allowNavigation: ['https://www.mirro2.com', 'https://mirro2.com'],
    iosScheme: 'ionic'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 500,  // Further reduced for faster startup
      backgroundColor: "#000000",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#3B82F6",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true,
      launchAutoHide: true
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
    Device: {
      watchSupport: true
    },
    Haptics: {
      watchHaptics: true
    },
    // Performance optimizations
    Network: {
      requestTimeout: 10000 // 10 second timeout
    }
  },
  ios: {
    scheme: "MirroSocial",
    watchApp: {
      bundleId: "com.mirro2.app.watchkitapp",
      displayName: "Mirro Watch"
    },
    webContentsDebuggingEnabled: false,
    allowsLinkPreview: false,
    scrollEnabled: true,
    contentInsetAdjustmentBehavior: "automatic",
    // Performance optimizations
    limitsNavigationsToAppBoundDomains: true,
    handleApplicationURL: true,
    backgroundColor: "#000000"
  },
  android: {
    buildOptions: {
      keystorePath: 'release-key.keystore',
      keystoreAlias: 'key0',
      keystorePassword: 'your_keystore_password'
    },
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
    captureInput: true,
    webViewAssetLoader: true,
    // Performance optimizations
    backgroundColor: "#000000",
    loggingBehavior: "none",
    mixedContentMode: "never",
    // Hardware acceleration
    hardwareAccelerated: true,
    // Network optimizations
    usesCleartextTraffic: false
  }
};

export default config;