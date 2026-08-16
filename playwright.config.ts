import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4321' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile',  use: { ...devices['Desktop Chrome'], viewport: { width: 390,  height: 844 } } },
    // docs/verification.md's sweep names 390/768/1024/1440. 768 and 1024
    // have no bespoke design and most specs assert against the two
    // primary widths above, so these two are scoped via testMatch to the
    // width-agnostic pass/fail checks only (overflow, console errors) —
    // running the whole suite here would either duplicate device-specific
    // assertions or skip on all of them, adding noise without coverage.
    { name: 'tablet',  testMatch: ['layout.spec.ts', 'console.spec.ts'], use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
    { name: 'laptop',  testMatch: ['layout.spec.ts', 'console.spec.ts'], use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 800 } } },
  ],
  webServer: {
    command: 'npm run build && npx serve dist -p 4321',
    url: 'http://localhost:4321',
    // Never adopt a server already on 4321. Reusing one skips the build in
    // the command above, so the suite silently tests whatever `dist` that
    // process was started with — stale HTML fails assertions all over the
    // suite and reads as flakiness.
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
