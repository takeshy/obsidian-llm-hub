import obsidianmd from 'eslint-plugin-obsidianmd';
import tseslint from 'typescript-eslint';
import { DEFAULT_BRANDS } from 'eslint-plugin-obsidianmd/dist/lib/rules/ui/brands.js';

const BRANDS = [
  ...DEFAULT_BRANDS,
  'Dashboard Hub',
  'LLM Hub',
  'Discussion Hub',
  'AI Discussion',
  'Antigravity',
  'Codex',
  'Ollama',
  'LM Studio',
  'vLLM',
  'AnythingLLM',
  'OpenCode',
  'OpenCode Go',
  'OpenCode Zen',
  'Grok',
  'npx',
  'Python',
  'MP3',
  'WAV',
  'MP4',
  'Top K',
  'Timeline',
  'Tasks',
  'RAG',
  'OKF',
  'MCP',
];

const SENTENCE_CASE_IGNORES = [
  '^\\(',
  '^\\.\\.\\.',
  '^#',
  '^[Ee]\\.g\\.',
  'https?://',
  'https?\\(s\\)',
  '_',
  '\\^|[\\\\/]',
  '\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)+\\b',
  '\\b(?:agy|claude|codex) command\\b',
  '[\"\\\'][a-z][a-z0-9-]*[\"\\\']',
  '^(?:[a-z0-9]+,\\s*)+[a-z0-9]+$',
  '\\b(?:md|pdf|png|jpe?g|mp3|wav|mp4)(?:,\\s*(?:md|pdf|png|jpe?g|mp3|wav|mp4))+\\b',
  '^(?:OR|AND)\\b',
  '^(?:result|stale|day\\(s\\)|month\\(s\\)|year\\(s\\))$',
];

export default tseslint.config(
  {
    ignores: ['main.js', 'node_modules/**', 'pdfjs/**', 'scripts/*.mjs', 'test/**', '*.js', '*.mjs', 'vitest.config.ts', 'src/**/*.test.ts'],
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      obsidianmd,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-deprecated': 'warn',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',

      // Obsidian plugin rules (from recommended config)
      'obsidianmd/commands/no-command-in-command-id': 'error',
      'obsidianmd/commands/no-command-in-command-name': 'error',
      'obsidianmd/commands/no-default-hotkeys': 'error',
      'obsidianmd/commands/no-plugin-id-in-command-id': 'error',
      'obsidianmd/commands/no-plugin-name-in-command-name': 'error',
      'obsidianmd/settings-tab/no-manual-html-headings': 'error',
      'obsidianmd/settings-tab/no-problematic-settings-headings': 'error',
      'obsidianmd/settings-tab/prefer-setting-definitions': 'warn',
      'obsidianmd/settings-tab/prefer-update-over-display': 'warn',
      'obsidianmd/settings-tab/no-deprecated-display': 'warn',
      'obsidianmd/vault/iterate': 'error',
      'obsidianmd/detach-leaves': 'error',
      'obsidianmd/hardcoded-config-path': 'error',
      'obsidianmd/no-forbidden-elements': 'error',
      'obsidianmd/no-global-this': 'warn',
      'obsidianmd/no-plugin-as-component': 'error',
      'obsidianmd/no-sample-code': 'error',
      'obsidianmd/no-tfile-tfolder-cast': 'error',
      'obsidianmd/no-view-references-in-plugin': 'error',
      'obsidianmd/no-static-styles-assignment': 'error',
      'obsidianmd/object-assign': 'error',
      'obsidianmd/platform': 'error',
      'obsidianmd/prefer-file-manager-trash-file': 'warn',
      'obsidianmd/prefer-create-el': 'warn',
      'obsidianmd/prefer-window-timers': 'warn',
      'obsidianmd/prefer-abstract-input-suggest': 'error',
      'obsidianmd/regex-lookbehind': 'error',
      'obsidianmd/sample-names': 'error',
      'obsidianmd/validate-manifest': 'error',
      'obsidianmd/validate-license': 'error',
      'obsidianmd/ui/sentence-case': ['error', {
        brands: BRANDS,
        ignoreRegex: SENTENCE_CASE_IGNORES,
        allowAutoFix: true,
      }],
      'obsidianmd/ui/sentence-case-locale-module': ['error', {
        brands: BRANDS,
        ignoreWords: ['RAG', 'OKF', 'OR', 'AND', 'VOTE', 'Base', 'View'],
        ignoreRegex: SENTENCE_CASE_IGNORES,
        allowAutoFix: true,
      }],

      // Additional strict rules
      'no-case-declarations': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-useless-escape': 'error',
    },
  },
);
