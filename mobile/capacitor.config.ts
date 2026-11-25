import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The one place the app's start URL lives. www.storyhome.app serves the same
 * Vercel deployment as storyhome-1-eqmg (same deployment id and ETag).
 * CI smoke tests patch the built app's copy of this value; never commit another host.
 */
export const STORY_HOME_APP_URL = "https://www.storyhome.app";

const config: CapacitorConfig = {
  appId: "app.storyhome.mobile",
  appName: "Story Home",
  webDir: "www",
  backgroundColor: "#0b0d11",
  appendUserAgent: "StoryHomeApp/1",
  server: {
    url: STORY_HOME_APP_URL,
    cleartext: false,
  },
  ios: {
    contentInset: "never",
    limitsNavigationsToAppBoundDomains: false,
  },
};

export default config;
