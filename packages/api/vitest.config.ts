import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      PORT: '3001',
      LOG_LEVEL: 'error',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5434/judging_test',
      CORS_ORIGIN: 'http://localhost:3001',
    },
    setupFiles: ['./test/global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/*.spec.ts',
        'prisma/**',
        'vitest.config.ts',
        'src/main.ts',
        'src/common/decorators/**',
        'dist/**',
        'test/**',
        '*.mjs',
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
})
