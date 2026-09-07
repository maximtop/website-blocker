import { t } from '../i18n';
import { WebsiteError } from '../website-error';

/** Show translated validation errors and a localized fallback for storage errors. */
export function getErrorMessage(error: unknown): string {
    if (error instanceof WebsiteError) {
        return t(error.code, error.website);
    }
    return t('saveError');
}
