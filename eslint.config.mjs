import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  {
    ignores: [
      '.next/**', 'node_modules/**', '.claude/**',
      '.swarm/**', '.claude-flow/**', 'next-env.d.ts',
    ],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
);
