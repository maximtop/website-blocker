/**
 * Stable codes shared by website validation and translated error messages.
 */
export const WEBSITE_ERROR_CODE = {
    Invalid: 'invalidWebsite',
    Duplicate: 'duplicateWebsite',
    Missing: 'missingWebsite',
} as const;

/**
 * Supported validation codes derived from their shared definitions.
 */
export type WebsiteErrorCode = typeof WEBSITE_ERROR_CODE[keyof typeof WEBSITE_ERROR_CODE];

/**
 * Expected input errors, distinct from browser storage failures.
 */
export class WebsiteError extends Error {
    readonly code: WebsiteErrorCode;

    readonly website: string;

    /**
     * Preserves the validation code and untranslated website for the interface.
     *
     * @param code - Validation failure identifying the translated message.
     * @param website - Literal address involved in the failed operation.
     */
    constructor(code: WebsiteErrorCode, website: string) {
        super(code);
        this.name = 'WebsiteError';
        this.code = code;
        this.website = website;
        Object.setPrototypeOf(this, WebsiteError.prototype);
    }
}
