import { defineConfig, devices } from "@playwright/test";

/** Exercise the merged Pages artifact across desktop engines and a mobile viewport. */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://127.0.0.1:4173", trace: "retain-on-failure" },

  webServer: {
    command: "vpx scripts/serve-pages.ts",
    url: "http://127.0.0.1:4173/folyx/",
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    // Mobile emulation covers responsive UI; hardware coordinate validation is separate.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
