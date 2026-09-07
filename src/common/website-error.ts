/** Expected input errors, distinct from browser storage failures. */
export class WebsiteError extends Error {
    readonly code: 'invalidWebsite' | 'duplicateWebsite' | 'missingWebsite';

    readonly website: string;

    constructor(code: 'invalidWebsite' | 'duplicateWebsite' | 'missingWebsite', website: string) {
        super(code);
        this.name = 'WebsiteError';
        this.code = code;
        this.website = website;
        Object.setPrototypeOf(this, WebsiteError.prototype);
    }
}
