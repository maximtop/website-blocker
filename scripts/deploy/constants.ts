/**
 * @file Configuration for this repository's shared extension deployment flow.
 */

/**
 * Prefix of every release asset: `<prefix>-<version>-<browser>.zip` and
 * `<prefix>-<version>-source.zip`, listed in `SHA256SUMS.txt`.
 */
export const RELEASE_ASSET_PREFIX = 'website-blocker';

/**
 * Stores this extension is deployed to; each one has a deploy workflow.
 */
export const STORE_TARGETS = ['chrome', 'edge', 'firefox'] as const;

/**
 * Store this repository can deploy to.
 */
export type StoreTarget = typeof STORE_TARGETS[number];

/**
 * Firefox add-on ID from `browser_specific_settings.gecko.id`.
 */
export const GECKO_ID = 'website-blocker@maximtop.dev';

/**
 * Files the Firefox source archive must contain.
 */
export const SOURCE_REQUIRED_FILES = [
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    '.swcrc',
    'src/manifest.json',
    'src/_locales/en/messages.json',
    'src/entrypoints/background/index.ts',
    'scripts/build/index.ts',
    'scripts/build/constants.ts',
    'scripts/build/helpers.ts',
    'scripts/build/bundle-runner.ts',
    'scripts/build/webpack-config.ts',
    'scripts/build/webpack.common.ts',
    'scripts/build/manifest.ts',
    'scripts/i18n/catalogs.ts',
    'scripts/deploy/constants.ts',
    'DEVELOPMENT.md',
];

/**
 * Reviewer notes submitted to AMO with every new Firefox version.
 */
export const AMO_REVIEW_NOTES_PATH = 'docs/AMO_REVIEW.md';

/**
 * Filename of the extracted reviewer notes consumed by preflight and upload.
 */
export const AMO_APPROVAL_NOTES_FILENAME = 'approval-notes.txt';

/**
 * Shape of a release tag; the version is the tag without the `v` prefix.
 */
export const RELEASE_TAG_PATTERN = /^v[0-9]+\.[0-9]+\.[0-9]+$/;

/**
 * Directory the deploy workflows download the release assets into.
 */
export const STORE_UPLOAD_DIRECTORY = 'store-upload';
