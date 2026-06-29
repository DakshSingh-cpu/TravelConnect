import { defineConfig, configDefaults } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    // e2e/*.spec.ts are Playwright tests (run via `npm run test:e2e`), not Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // The real `server-only` package throws when imported outside an RSC
      // bundler; stub it so server modules are unit-testable under Node.
      'server-only': path.resolve(__dirname, '__tests__/stubs/server-only.ts'),
    },
  },
})
