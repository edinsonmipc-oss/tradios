import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tradiesitepilot.app',
  appName: 'Tradie SitePilot',
  webDir: 'www',
  server: {
    // For production: point to your deployed Next.js app
    // url: 'https://tradeos.vercel.app',
    // For local dev: start `npm run dev` and uncomment below
    // url: 'http://localhost:3000',
    androidScheme: 'https',
    cleartext: true,
  },
  android: {
    backgroundColor: '#0f172a',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
