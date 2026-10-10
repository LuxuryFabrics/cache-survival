import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.cache.survival",
  appName: "CACHE",
  webDir: "apps/web/dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
