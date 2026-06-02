import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.enesozturk.app",
  appName: "Enes Ozturk",
  webDir: "out",

  // Canli URL - web ve mobil ayni Supabase'i kullanir
  server: {
    url: "https://enes-ozturk.vercel.app",
    cleartext: false,
    androidScheme: "https",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0c0b1a",
      androidSplashResourceName: "splash",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;
