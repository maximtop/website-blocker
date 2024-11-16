const MAX_LINE_LENGTH = 120;

module.exports = {
    env: {
        browser: true,
    },
    extends: [
        'airbnb',
        'airbnb-typescript',
        'plugin:react/recommended',
    ],
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json'
    },
    plugins: [
        'react',
        '@typescript-eslint',
        'import-newlines',
    ],
    root: true,
    rules: {
        'max-len': [
            'error',
            {
                code: MAX_LINE_LENGTH,
                comments: MAX_LINE_LENGTH,
                tabWidth: 4,
                ignoreUrls: true,
                ignoreTrailingComments: false,
                ignoreComments: false,
            },
        ],
        indent: "off",
        "react/jsx-indent": "off",
        '@typescript-eslint/indent': ['error', 4, {
            SwitchCase: 1,
            ignoreComments: false,
        }],
        'import/prefer-default-export': 'off',
        'import/no-default-export': 'error',
        'arrow-body-style': 'off',
        'import/no-extraneous-dependencies': 'off',
        'prefer-destructuring': 'off',
        'react/jsx-indent-props': 'off',
        'import-newlines/enforce': ['error', { items: 3, 'max-len': MAX_LINE_LENGTH }],
    },
};
