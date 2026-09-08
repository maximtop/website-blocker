/**
 * @file Vitest configuration.
 */

import { transform } from '@swc/core';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [{
        name: 'mobx-legacy-decorators',
        enforce: 'pre',
        /**
         * Compiles store decorators with the same SWC configuration as the extension build.
         *
         * @param source - TypeScript source supplied by Vite.
         * @param id - Absolute path of the module being transformed.
         * @returns Transformed store code, or undefined for modules handled by Vite.
         */
        transform(source: string, id: string) {
            if (!/\/src\/options\/stores\/.*\.ts$/.test(id)) {
                return undefined;
            }
            return transform(source, { filename: id, sourceMaps: true });
        },
    }],
    test: {
        include: ['tests/**/*.test.ts'],
    },
});
