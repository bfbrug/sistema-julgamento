import { defineConfig } from 'vitest/config'
import { resolve } from 'path'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => ({
  test: {
    environment: 'node',
    globals: true,
    env: loadEnv(mode, process.cwd(), ''),
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/*.spec.ts',
        'prisma/**',
        'vitest.config.ts',
        'src/main.ts',
        'dist/**',
        'test/**',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
}))
