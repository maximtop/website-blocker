/** Stable codes shared by website validation and translated error messages. */
export const WEBSITE_ERROR_CODE = {
    Invalid: 'invalidWebsite',
    Duplicate: 'duplicateWebsite',
    Missing: 'missingWebsite',
} as const;

export type WebsiteErrorCode = typeof WEBSITE_ERROR_CODE[keyof typeof WEBSITE_ERROR_CODE];

/** Expected input errors, distinct from browser storage failures. */
export class WebsiteError extends Error {
    readonly code: WebsiteErrorCode;

    readonly website: string;

    constructor(code: WebsiteErrorCode, website: string) {
        super(code);
        this.name = 'WebsiteError';
        this.code = code;
        this.website = website;
        Object.setPrototypeOf(this, WebsiteError.prototype);
    }
}
