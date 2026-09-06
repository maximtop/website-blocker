/**
 * @file Store deployment constants of this repository. Every other file under scripts/deploy
 * and tests/deploy is identical across the extension repositories; only this file differs.
 */

/**
 * Prefix of every release asset: `<prefix>-<version>-<browser>.zip` and
 * `<prefix>-<version>-source.zip`, listed in `SHA256SUMS.txt`.
 */
export const RELEASE_ASSET_PREFIX = 'website-blocker';

/**
 * Stores this extension is deployed to; each one has a deploy-<store>.yml workflow.
 */
export const STORE_TARGETS = ['chrome'] as const;

export type StoreTarget = typeof STORE_TARGETS[number];

/**
 * Firefox add-on ID (`browser_specific_settings.gecko.id`); empty when Firefox is not a target.
 */
export const GECKO_ID = '';

/**
 * Files the Firefox source archive must contain; unused when Firefox is not a target.
 */
export const SOURCE_REQUIRED_FILES = ['package.json', 'pnpm-lock.yaml', 'src/manifest.json'];

/**
 * Reviewer notes inside the source archive, submitted to AMO with every new Firefox version.
 */
export const AMO_REVIEW_NOTES_PATH = 'docs/AMO_REVIEW.md';

export const RELEASE_TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/;

export const STORE_UPLOAD_DIRECTORY = 'store-upload';
