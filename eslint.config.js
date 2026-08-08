import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import next from '@next/eslint-plugin-next'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// NOTE: eslint-config-next cannot be loaded under ESLint 10 (its legacy shareable
// config has a circular `plugins.react` reference that @eslint/eslintrc's
// FlatCompat validator cannot serialize). We compose the same rule sets from the
// native flat configs instead, which @next/eslint-plugin-next ships directly.
export default defineConfig([
  globalIgnores(['.next', 'out', 'dist', 'public', 'node_modules', 'scripts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      next.configs['core-web-vitals'],
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
])
