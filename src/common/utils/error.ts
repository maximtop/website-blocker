/**
 * @file Localized error messages for the settings interface.
 */

import { BlockDurationError } from '../block-duration-error';
import { t } from '../i18n';
import { WebsiteError } from '../website-error';

/**
 * Translates expected validation errors and uses a localized fallback for storage failures.
 *
 * @param error - Failure to describe in the interface.
 *
 * @returns A translated validation message or generic save error.
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof BlockDurationError) {
        return t(error.code);
    }
    if (error instanceof WebsiteError) {
        return t(error.code, error.website);
    }
    return t('saveError');
}
