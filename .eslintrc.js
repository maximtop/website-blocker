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
    overrides: [
        {
            files: ['src/**/*.{ts,tsx}'],
            plugins: ['jsdoc'],
            settings: {
                jsdoc: { mode: 'typescript' },
            },
            rules: {
                'jsdoc/require-jsdoc': ['error', {
                    require: {
                        ClassDeclaration: true,
                        MethodDefinition: true,
                        FunctionDeclaration: true,
                    },
                    contexts: [
                        'TSInterfaceDeclaration',
                        'TSTypeAliasDeclaration',
                        'TSInterfaceDeclaration TSPropertySignature',
                        'TSInterfaceDeclaration TSMethodSignature',
                        'TSTypeAliasDeclaration TSPropertySignature',
                        'TSTypeAliasDeclaration TSMethodSignature',
                        'VariableDeclarator > ArrowFunctionExpression',
                        'FunctionExpression[id!=null], '
                            + ':matches(VariableDeclarator, AssignmentExpression, Property, PropertyDefinition)'
                            + ' > FunctionExpression',
                        'ExportNamedDeclaration[declaration.type="VariableDeclaration"]',
                    ],
                    checkGetters: true,
                    checkSetters: true,
                    exemptEmptyConstructors: true,
                }],
                'jsdoc/require-description': ['error', {
                    contexts: [
                        'ClassDeclaration',
                        'MethodDefinition',
                        'FunctionDeclaration',
                        'ArrowFunctionExpression',
                        'FunctionExpression',
                        'TSInterfaceDeclaration',
                        'TSTypeAliasDeclaration',
                        'TSInterfaceDeclaration TSPropertySignature',
                        'TSInterfaceDeclaration TSMethodSignature',
                        'TSTypeAliasDeclaration TSPropertySignature',
                        'TSTypeAliasDeclaration TSMethodSignature',
                        'ExportNamedDeclaration[declaration.type="VariableDeclaration"]',
                    ],
                }],
                'jsdoc/multiline-blocks': ['error', { noSingleLineBlocks: true }],
                'jsdoc/check-param-names': 'error',
                'jsdoc/require-param': ['error', { checkDestructured: false }],
                'jsdoc/require-param-description': 'error',
                'jsdoc/require-returns': 'error',
                'jsdoc/require-returns-check': 'error',
                'jsdoc/require-returns-description': 'error',
                'jsdoc/no-types': 'error',
            },
        },
        {
            // Keep the shared deployment fixtures identical across extension repositories.
            files: ['tests/deploy/**/*.ts'],
            rules: {
                'object-curly-newline': 'off',
            },
        },
    ],
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
