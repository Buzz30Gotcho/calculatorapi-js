const { defineConfig, devices } = require("@playwright/test");

/**
 * Configuration Playwright
 */
module.exports = defineConfig({
  testDir: ".",
  fullyParallel: true,
  reporter: "list",
  use: {
    // Le lien entre Playwright et le front
    baseURL: process.env.BASE_URL || "http://localhost:8081",
    trace: "on-first-retry",
    // Ralenti optionnel : SLOWMO=1000 npx playwright test --headed
    launchOptions: {
      slowMo: process.env.SLOWMO ? Number(process.env.SLOWMO) : 0,
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
