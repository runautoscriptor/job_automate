const { defineConfig, devices } = require('@playwright/test');
const { getEnv, getNumberEnv } = require('./utils/env');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: getNumberEnv('DEFAULT_TIMEOUT', 30000),
  expect: {
    timeout: 10000
  },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }]
  ],
  use: {
    baseURL: getEnv('NAUKRI_BASE_URL', 'https://www.naukri.com'),
    browserName: getEnv('BROWSER', 'chromium'),
    headless: getEnv('HEADLESS', 'false') === 'true',
    actionTimeout: getNumberEnv('ACTION_TIMEOUT', 15000),
    navigationTimeout: getNumberEnv('NAVIGATION_TIMEOUT', 45000),
    launchOptions: {
      slowMo: getNumberEnv('SLOW_MO', 0)
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome']
      }
    }
  ],
  outputDir: 'reports/test-results'
});
