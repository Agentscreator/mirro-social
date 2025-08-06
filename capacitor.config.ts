import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'B46X894ZHC.Mirro.Social.App',  // UPDATED TO MATCH APPLE DEVELOPER
  appName: 'Mirro',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    // Use environment variable for URL, fallback to production
    url: process.env.CAPACITOR_SERVER_URL || 'https://www.mirro2.com',
    cleartext: process.env.NODE_ENV === 'development'
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
      launchShowDuration: 1500,
      backgroundColor: "#FFFFFF",
      showSpinner: false,
      androidSpinnerStyle: "large",
      spinnerColor: "#999999",
      androidScaleType: "CENTER_CROP",
      splashFullScreen: true,
      splashImmersive: true
    },
    App: {
      initialPath: "/login"
    }
  }
};

export default config;