import { parse } from 'tldts';

/**
 * Extracts the hostname from a given URL.
 *
 * @param rawUrl The URL to parse.
 * @returns The hostname without 'www.' prefix, or null if the URL is invalid.
 */
export function getHostname(rawUrl: string): string | null {
    const parsed = parse(rawUrl);
    if (!parsed.hostname || !parsed.domain) {
        return null;
    }

    return parsed.hostname.replace(/^www\./, '');
}
