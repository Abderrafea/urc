import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      '.vercel/**',
      '.idea/**',
      'test-results*/**',
      'playwright-report/**',
      'coverage/**',
    ],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      curly: ['error', 'all'],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'jsx-a11y': jsxA11y },
    rules: { ...reactHooks.configs.recommended.rules, ...jsxA11y.configs.recommended.rules },
  },
);
