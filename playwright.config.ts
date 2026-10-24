import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the dev server, on two desktop sizes; the
// *.phone.spec.ts files run on a phone (touch, narrow layout) instead.
// CHROMIUM_PATH lets a pre-installed browser be used instead of Playwright's own.
// Every test starts with the welcome card already seen, except the ones that
// clear it to test the card.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    storageState: { cookies: [], origins: [{ origin: 'http://localhost:5173', localStorage: [{ name: 'frame-studio:welcomed', value: '1' }] }] },
    trace: 'retain-on-failure',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: 'desktop', testIgnore: /\.phone\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'laptop', testIgnore: /\.phone\.spec\.ts$/, use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'phone', testMatch: /\.phone\.spec\.ts$/, use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
