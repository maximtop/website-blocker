/* eslint-disable no-console */
/**
 * @file Command-line entry of the release preparation, run by the deploy workflows.
 */

import { prepare } from './prepare';

try {
    prepare();
} catch (error) {
    console.error(error instanceof Error ? error.message : 'Release preparation failed');
    process.exitCode = 1;
}
