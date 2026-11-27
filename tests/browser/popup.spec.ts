import path from 'node:path';

import { chromium, expect, test as base } from '@playwright/test';

import type { BrowserContext } from '@playwright/test';

const test = base.extend<{ extensionContext: BrowserContext; popupUrl: string }>({
    extensionContext: async ({ browserName }, provide) => {
        expect(browserName).toBe('chromium');
        const extensionPath = path.resolve('dist/dev/chrome');
        const context = await chromium.launchPersistentContext('', {
            channel: 'chromium',
            headless: true,
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
            ],
        });
        try {
            await provide(context);
        } finally {
            await context.close();
        }
    },
    popupUrl: async ({ extensionContext }, provide) => {
        const worker = extensionContext.serviceWorkers()[0]
            ?? await extensionContext.waitForEvent('serviceworker');
        await provide(new URL('popup.html', worker.url()).href);
    },
});

// A toolbar popup starts with a small viewport before Chromium sizes it to its content.
// Navigating a regular 1280px tab to popup.html alone would miss the 100vw regression.
for (const initialWidth of [100, 400, 800]) {
    test(`popup keeps its width from a ${initialWidth}px viewport`, async ({ extensionContext, popupUrl }) => {
        const page = await extensionContext.newPage();
        await page.setViewportSize({ width: initialWidth, height: 600 });
        await page.goto(popupUrl);
        await expect(page.getByRole('button')).toBeVisible();
        await expect.poll(async () => page.locator('body').evaluate((body) => {
            return body.getBoundingClientRect().width;
        })).toBe(400);

        // Let the host adopt that intrinsic width, as an extension popup does.
        await page.setViewportSize({ width: 400, height: 600 });
        const dimensions = await page.evaluate(() => ({
            width: document.documentElement.scrollWidth,
            height: document.body.getBoundingClientRect().height,
        }));
        expect(dimensions.width).toBe(400);
        expect(dimensions.height).toBeLessThan(300);

        const opened = extensionContext.waitForEvent('page');
        await page.getByRole('button').click();
        const options = await opened;
        await expect(options).toHaveURL(new URL('options.html', popupUrl).href);
    });
}
