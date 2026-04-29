import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    pool: 'forks',
    env: {
      NODE_ENV: process.env.NODE_ENV ?? 'test',
      PORT: process.env.PORT ?? '3001',
      LOG_LEVEL: process.env.LOG_LEVEL ?? 'error',
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5434/judging_test',
      CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? 'test-secret-1',
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'test-secret-2',
    },
    setupFiles: ['./test/global-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/__tests__/**',
        '**/*.spec.ts',
        'src/main.ts',
        'src/common/decorators/**',
        '**/dto/**',
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
