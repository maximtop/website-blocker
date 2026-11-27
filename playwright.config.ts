/**
 * @file Browser layout regression tests for the built extension.
 */

import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: './tests/browser',
    testMatch: '**/*.spec.ts',
    workers: 1,
    forbidOnly: !!process.env.CI,
});
