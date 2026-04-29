import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      exclude: ['src/**/index.ts', 'src/domain/**', 'src/api-contracts/**'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
})
