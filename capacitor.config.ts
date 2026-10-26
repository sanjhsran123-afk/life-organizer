import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dayledger.app',
  appName: 'DayLedger',
  webDir: 'dist',
  server: {
    // Packages built app files locally from Vite dist folder
    // Uses secure local scheme for asset serving without opening external URLs
    androidScheme: 'https',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_launcher_round',
      iconColor: '#4f46e5',
      sound: 'final.mp3',
    },
  },
};

export default config;
