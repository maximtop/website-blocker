// @vitest-environment node

import {
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';
import { canEditWebsiteSettings, openRegularWebsiteSettings } from '../../src/common/settings-context';

const browserMock = vi.hoisted(() => ({
    extension: { inIncognitoContext: false },
    getURL: vi.fn(),
    createWindow: vi.fn(),
}));

vi.mock('webextension-polyfill', () => ({
    default: {
        extension: browserMock.extension,
        runtime: { getURL: browserMock.getURL },
        windows: { create: browserMock.createWindow },
    },
}));

beforeEach(() => {
    vi.resetAllMocks();
    browserMock.extension.inIncognitoContext = false;
});

describe('website settings context', () => {
    it('allows edits in a regular context and prevents them in a private context', () => {
        expect(canEditWebsiteSettings()).toBe(true);

        browserMock.extension.inIncognitoContext = true;
        expect(canEditWebsiteSettings()).toBe(false);
    });

    it('opens the options page in an explicitly regular window and returns the result', async () => {
        const url = 'chrome-extension://website-blocker/options.html';
        const createdWindow = { id: 7, incognito: false };
        browserMock.getURL.mockReturnValue(url);
        browserMock.createWindow.mockResolvedValue(createdWindow);

        expect(await openRegularWebsiteSettings()).toEqual(createdWindow);
        expect(browserMock.getURL).toHaveBeenCalledExactlyOnceWith('options.html');
        expect(browserMock.createWindow).toHaveBeenCalledExactlyOnceWith({ url, incognito: false });
    });

    it('propagates a failure to open the regular settings window', async () => {
        browserMock.createWindow.mockRejectedValue(new Error('Window creation failed'));

        await expect(openRegularWebsiteSettings()).rejects.toThrow('Window creation failed');
    });
});
