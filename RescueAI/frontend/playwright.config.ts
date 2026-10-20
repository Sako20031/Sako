import { defineConfig, devices } from "@playwright/test";

const chromium = { executablePath: process.env.PW_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" };

export default defineConfig({
  testDir: "e2e",
  timeout: 60000,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://127.0.0.1:8765", trace: "off" },
  webServer: { command: "./scripts/e2e-server.sh", url: "http://127.0.0.1:8765/api/health", reuseExistingServer: false, timeout: 60000 },
  projects: [
    // Chromium with iPhone viewport/touch emulation. This is NOT WebKit/Safari; real-device testing is still required.
    { name: "iphone-se", use: { ...devices["iPhone SE"], defaultBrowserType: "chromium", launchOptions: chromium } },
    { name: "iphone-13", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium", launchOptions: chromium } },
  ],
});
