import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mirro2.app',
  appName: 'Mirro',
  webDir: 'out',
  server: {
    androidScheme: 'https',
    url: 'https://www.mirro2.com',
    cleartext: true
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
    },
    App: {
      initialPath: "/login"
    }
  }
};

export default config;
