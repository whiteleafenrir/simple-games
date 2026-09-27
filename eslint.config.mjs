import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['node_modules/**', 'dist/**', '.angular/**', '.local/**', '.npm-cache/**', 'tmp/**']),
  {
    files: ['**/*.{js,cjs,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node }
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@nestjs/*',
                '@prisma/*',
                'pg',
                'node:*',
                '**/apps/api/**',
                '**/prisma/**',
                '**/packages/pet-contract/**'
              ],
              message:
                'Frontend использует API и type imports из @simple-games/pet-contract; серверный код и прямые пути к контракту запрещены.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['apps/api/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', '**/src/app/**', '**/packages/pet-contract/**'],
              message: 'API не зависит от Angular/frontend; общий контракт импортируй через @simple-games/pet-contract.'
            }
          ]
        }
      ]
    }
  },
  {
    files: ['packages/pet-contract/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@angular/*', '@nestjs/*', '@prisma/*', 'pg', 'node:*', '**/apps/**', '**/src/app/**'],
              message: 'Transport types должны оставаться независимыми от frontend, backend, runtime и persistence.'
            }
          ]
        }
      ]
    }
  }
]);
