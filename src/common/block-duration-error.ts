/**
 * @file Block duration validation error.
 */

/**
 * Expected duration validation failure, distinct from a browser storage error.
 */
export class BlockDurationError extends Error {
    readonly code: 'invalidBlockDuration' | 'blockDurationTooLong';

    /**
     * Preserves a duration validation code for translation by the interface.
     *
     * @param code - Catalog key describing the rejected duration.
     */
    constructor(code: BlockDurationError['code']) {
        super(code);
        this.name = 'BlockDurationError';
        this.code = code;
        Object.setPrototypeOf(this, BlockDurationError.prototype);
    }
}
