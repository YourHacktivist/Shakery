import js from '@eslint/js'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const NODE_AND_ELECTRON = [
  { name: 'electron', message: 'core/ and renderer/ must not depend on Electron.' },
  ...['fs', 'path', 'os', 'child_process', 'url', 'crypto', 'process'].flatMap((name) => [
    { name, message: 'Node modules are only allowed in src/main.' },
    { name: `node:${name}`, message: 'Node modules are only allowed in src/main.' },
  ]),
]

export default tseslint.config(
  {
    ignores: [
      'out/**',
      'dist/**',
      'node_modules/**',
      'design/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.web.json', './tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Free text is rendered as text, never as raw HTML (section 6).',
        },
      ],
    },
  },
  {
    files: ['eslint.config.mjs', 'scripts/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: { ...tseslint.configs.disableTypeChecked.languageOptions, globals: globals.node },
  },
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts', 'tests/**/*.ts', '*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ...reactHooks.configs.flat['recommended-latest'],
    languageOptions: { globals: globals.browser },
    rules: {
      ...reactHooks.configs.flat['recommended-latest'].rules,
      'no-restricted-imports': ['error', { paths: NODE_AND_ELECTRON }],
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/shared/**/*.ts'],
    ignores: ['src/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [...NODE_AND_ELECTRON, { name: 'react', message: 'core/ and shared/ stay framework-free.' }],
          patterns: [
            {
              group: ['**/main/**', '**/renderer/**', '**/preload/**'],
              message: 'core/ and shared/ import nothing from the processes.',
            },
          ],
        },
      ],
    },
  },
)
