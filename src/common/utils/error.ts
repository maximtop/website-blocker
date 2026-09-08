import { t } from '../i18n';
import { WebsiteError } from '../website-error';
import { BlockDurationError } from '../block-duration-error';

/**
 * Translates expected validation errors and uses a localized fallback for storage failures.
 *
 * @param error - Failure to describe in the interface.
 * @returns A translated validation message or generic save error.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof BlockDurationError) {
        return error.message;
    }
    if (error instanceof WebsiteError) {
        return t(error.code, error.website);
    }
    return t('saveError');
}
