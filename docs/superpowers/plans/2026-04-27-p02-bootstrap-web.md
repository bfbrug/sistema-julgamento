# P02 Bootstrap Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap `packages/web` with Next.js 15 App Router, Tailwind design system, typed API wrapper, UI components, and static pages — server running on `localhost:3001` with ≥80% test coverage.

**Architecture:** Next.js 15 App Router with route groups `(public)` and `(admin)` separating unauthenticated and authenticated surfaces. All API calls funnel through `lib/api.ts` (fetch wrapper with generic types and `ApiError`). UI components are Tailwind-only, no external component library.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.8 strict, Tailwind CSS 4, Vitest 3 + React Testing Library, Zod, `next/font` (Geist), `lucide-react` (icons only if needed), `@testing-library/jest-dom`.

---

## File Map

| File | Responsibility |
|---|---|
| `packages/web/package.json` | All deps + scripts (dev/build/lint/type-check/test/test:ci) |
| `packages/web/tsconfig.json` | Extends base, adds `paths: { "@/*": ["./src/*"] }`, `jsx: "preserve"` |
| `packages/web/next.config.mjs` | Port 3001, strict mode |
| `packages/web/tailwind.config.ts` | Custom tokens (colors, font, spacing) |
| `packages/web/postcss.config.mjs` | Tailwind PostCSS |
| `packages/web/vitest.config.ts` | jsdom, globals, coverage 80% |
| `packages/web/vitest.setup.ts` | Import `@testing-library/jest-dom` |
| `packages/web/.env.example` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL` |
| `packages/web/.env.local` | Local values (gitignored) |
| `packages/web/src/app/globals.css` | Tailwind directives + CSS variables |
| `packages/web/src/app/layout.tsx` | Root layout, font, metadata |
| `packages/web/src/app/(public)/layout.tsx` | Public layout with `<PublicHeader>` |
| `packages/web/src/app/(public)/page.tsx` | Home page |
| `packages/web/src/app/(admin)/layout.tsx` | Admin layout with `<Sidebar>` |
| `packages/web/src/app/(admin)/dashboard/page.tsx` | Dashboard placeholder |
| `packages/web/src/app/auth/login/page.tsx` | Login form (static, no submit) |
| `packages/web/src/styles/tokens.css` | Design token CSS variables |
| `packages/web/src/lib/env.ts` | Zod env validation |
| `packages/web/src/lib/api.ts` | Typed fetch wrapper + `ApiError` |
| `packages/web/src/lib/__tests__/env.spec.ts` | Env validation tests |
| `packages/web/src/lib/__tests__/api.spec.ts` | API wrapper tests |
| `packages/web/src/components/ui/Button.tsx` | Button with variants + sizes |
| `packages/web/src/components/ui/Input.tsx` | Input with label/error/helperText |
| `packages/web/src/components/ui/Card.tsx` | Card with header/body/footer |
| `packages/web/src/components/ui/__tests__/Button.spec.tsx` | Button tests |
| `packages/web/src/components/ui/__tests__/Input.spec.tsx` | Input tests |
| `packages/web/src/components/ui/__tests__/Card.spec.tsx` | Card tests |
| `packages/web/src/components/admin/Sidebar.tsx` | Sidebar stub |
| `packages/web/src/components/public/PublicHeader.tsx` | Public header |
| `packages/web/public/.gitkeep` | Keep public dir |

---

## Task 1: Git branch + install dependencies

**Files:**
- Modify: `packages/web/package.json`

- [ ] **Step 1: Create branch from develop**

```bash
git checkout develop
git pull origin develop
git checkout -b feature/p02-bootstrap-web
```

Expected: on branch `feature/p02-bootstrap-web`

- [ ] **Step 2: Install Next.js and React**

```bash
cd packages/web
pnpm add next@15 react@19 react-dom@19
pnpm add -D @types/react@19 @types/react-dom@19
```

- [ ] **Step 3: Install Tailwind CSS**

```bash
pnpm add -D tailwindcss@^4 @tailwindcss/postcss autoprefixer
```

- [ ] **Step 4: Install test tooling**

```bash
pnpm add -D vitest@3 @vitejs/plugin-react jsdom \
  @testing-library/react @testing-library/user-event \
  @testing-library/jest-dom \
  @vitest/coverage-v8@3
```

- [ ] **Step 5: Install Zod (env validation)**

```bash
pnpm add zod
```

- [ ] **Step 6: Update package.json scripts**

Replace the placeholder scripts in `packages/web/package.json`:

```json
{
  "name": "@judging/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3001",
    "build": "next build",
    "start": "next start -p 3001",
    "lint": "next lint --dir src",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:ci": "vitest run --coverage"
  },
  "dependencies": {
    "next": "15.x",
    "react": "19.x",
    "react-dom": "19.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.x",
    "@testing-library/react": "^16.x",
    "@testing-library/user-event": "^14.x",
    "@types/react": "^19.x",
    "@types/react-dom": "^19.x",
    "@vitejs/plugin-react": "^4.x",
    "@vitest/coverage-v8": "3.x",
    "autoprefixer": "^10.x",
    "jsdom": "^25.x",
    "tailwindcss": "^4.x",
    "@tailwindcss/postcss": "^4.x",
    "vitest": "3.x"
  }
}
```

Note: actual versions will be pinned by pnpm install; the above shows semver ranges for intent.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add packages/web/package.json
git commit -m "chore(web): adiciona dependências do Next.js, React e Tailwind"
```

---

## Task 2: TypeScript + Next.js config

**Files:**
- Modify: `packages/web/tsconfig.json`
- Create: `packages/web/next.config.mjs`

- [ ] **Step 1: Update tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "outDir": "dist",
    "rootDir": ".",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 2: Create next.config.mjs**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

export default nextConfig
```

- [ ] **Step 3: Verify type-check passes on empty src**

```bash
pnpm --filter @judging/web type-check
```

Expected: no errors (or only `next-env.d.ts` missing — that gets generated by `next dev`).

- [ ] **Step 4: Commit**

```bash
git add packages/web/tsconfig.json packages/web/next.config.mjs
git commit -m "chore(web): configura TypeScript e Next.js com paths alias"
```

---

## Task 3: Tailwind CSS setup

**Files:**
- Create: `packages/web/tailwind.config.ts`
- Create: `packages/web/postcss.config.mjs`
- Create: `packages/web/src/styles/tokens.css`
- Create: `packages/web/src/app/globals.css`

- [ ] **Step 1: Create postcss.config.mjs**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 2: Create tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          700: '#15803d',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          700: '#b91c1c',
        },
        neutral: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 3: Create src/styles/tokens.css**

```css
:root {
  --color-primary: #6366f1;
  --color-primary-dark: #4338ca;
  --color-secondary: #64748b;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --color-neutral: #71717a;

  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
  --radius-lg: 0.75rem;
}
```

- [ ] **Step 4: Create src/app/globals.css**

```css
@import '../styles/tokens.css';
@import 'tailwindcss';
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/tailwind.config.ts packages/web/postcss.config.mjs \
        packages/web/src/styles/tokens.css packages/web/src/app/globals.css
git commit -m "chore(web): configura Tailwind com tokens de design e fontes"
```

---

## Task 4: Vitest config

**Files:**
- Create: `packages/web/vitest.config.ts`
- Create: `packages/web/vitest.setup.ts`

- [ ] **Step 1: Create vitest.setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        '**/__tests__/**',
        '**/*.spec.{ts,tsx}',
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/app/globals.css',
        'next.config.mjs',
        '**/*.config.{ts,mjs}',
        'vitest.setup.ts',
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
```

- [ ] **Step 3: Run empty test suite to confirm config loads**

```bash
pnpm --filter @judging/web test:ci
```

Expected: "No test files found" or 0 tests — exit 0 is fine without coverage (will be 0% but no threshold error yet because no files match include).

- [ ] **Step 4: Commit**

```bash
git add packages/web/vitest.config.ts packages/web/vitest.setup.ts
git commit -m "chore(web): configura Vitest com jsdom e cobertura 80%"
```

---

## Task 5: Env validation + API wrapper

**Files:**
- Create: `packages/web/.env.example`
- Create: `packages/web/.env.local`
- Create: `packages/web/src/lib/env.ts`
- Create: `packages/web/src/lib/api.ts`
- Create: `packages/web/src/lib/__tests__/env.spec.ts`
- Create: `packages/web/src/lib/__tests__/api.spec.ts`

- [ ] **Step 1: Write env.spec.ts (failing)**

```ts
// src/lib/__tests__/env.spec.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('env', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('throws when NEXT_PUBLIC_API_URL is missing', async () => {
    delete process.env['NEXT_PUBLIC_API_URL']
    await expect(import('../env')).rejects.toThrow()
  })

  it('returns validated env with valid values', async () => {
    process.env['NEXT_PUBLIC_API_URL'] = 'http://localhost:3000/api'
    process.env['NEXT_PUBLIC_WS_URL'] = 'http://localhost:3000'
    const { env } = await import('../env')
    expect(env.NEXT_PUBLIC_API_URL).toBe('http://localhost:3000/api')
    expect(env.NEXT_PUBLIC_WS_URL).toBe('http://localhost:3000')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
pnpm --filter @judging/web test src/lib/__tests__/env.spec.ts
```

Expected: FAIL — `../env` not found.

- [ ] **Step 3: Create .env.example**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

- [ ] **Step 4: Create .env.local**

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

- [ ] **Step 5: Create src/lib/env.ts**

```ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_WS_URL: z.string().url(),
})

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
  NEXT_PUBLIC_WS_URL: process.env['NEXT_PUBLIC_WS_URL'],
})
```

- [ ] **Step 6: Run env tests — expect PASS**

```bash
pnpm --filter @judging/web test src/lib/__tests__/env.spec.ts
```

Expected: 2 passing.

- [ ] **Step 7: Write api.spec.ts (failing)**

```ts
// src/lib/__tests__/api.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient, ApiError } from '../api'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()
  // provide required env
  vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://localhost:3000/api')
  vi.stubEnv('NEXT_PUBLIC_WS_URL', 'http://localhost:3000')
})

describe('apiClient', () => {
  it('makes GET request and unwraps { data }', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 1 }] }),
    })

    const result = await apiClient<{ id: number }[]>({ method: 'GET', path: '/events' })

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/events',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual([{ id: 1 }])
  })

  it('throws ApiError on 4xx response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Not found', code: 'NOT_FOUND' }),
    })

    await expect(
      apiClient<unknown>({ method: 'GET', path: '/missing' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError on 5xx response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    })

    await expect(
      apiClient<unknown>({ method: 'GET', path: '/broken' }),
    ).rejects.toBeInstanceOf(ApiError)
  })

  it('ApiError carries status and message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ error: 'Unprocessable', code: 'VALIDATION_ERROR' }),
    })

    try {
      await apiClient<unknown>({ method: 'POST', path: '/validate', body: {} })
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError)
      const apiErr = err as ApiError
      expect(apiErr.status).toBe(422)
      expect(apiErr.message).toBe('Unprocessable')
      expect(apiErr.code).toBe('VALIDATION_ERROR')
    }
  })
})
```

- [ ] **Step 8: Run api tests — expect FAIL**

```bash
pnpm --filter @judging/web test src/lib/__tests__/api.spec.ts
```

Expected: FAIL — `../api` not found.

- [ ] **Step 9: Create src/lib/api.ts**

```ts
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ApiErrorBody {
  error: string
  code?: string
}

interface ApiSuccessBody<T> {
  data: T
}

type ApiResponseBody<T> = ApiSuccessBody<T> | ApiErrorBody

interface ApiClientOptions<B> {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  body?: B
  headers?: Record<string, string>
}

function isApiError(body: unknown): body is ApiErrorBody {
  return typeof body === 'object' && body !== null && 'error' in body
}

function isApiSuccess<T>(body: unknown): body is ApiSuccessBody<T> {
  return typeof body === 'object' && body !== null && 'data' in body
}

export async function apiClient<T, B = unknown>({
  method,
  path,
  body,
  headers,
}: ApiClientOptions<B>): Promise<T> {
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''
  const url = `${baseUrl}${path}`

  const res = await fetch(url, {
    method,
    credentials: 'include', // TODO P03: needed once auth cookies are added
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const responseBody = (await res.json()) as ApiResponseBody<T>

  if (!res.ok) {
    if (isApiError(responseBody)) {
      throw new ApiError(responseBody.error, res.status, responseBody.code)
    }
    throw new ApiError(`HTTP ${res.status}`, res.status)
  }

  if (isApiSuccess<T>(responseBody)) {
    return responseBody.data
  }

  return responseBody as T
}
```

- [ ] **Step 10: Run api tests — expect PASS**

```bash
pnpm --filter @judging/web test src/lib/__tests__/api.spec.ts
```

Expected: 4 passing.

- [ ] **Step 11: Commit**

```bash
cd packages/web
git add .env.example src/lib/env.ts src/lib/api.ts \
        src/lib/__tests__/env.spec.ts src/lib/__tests__/api.spec.ts
# do NOT add .env.local (gitignored)
cd ../..
git commit -m "feat(web): implementa wrapper de API tipado e validação de envs"
```

---

## Task 6: UI components — Button

**Files:**
- Create: `packages/web/src/components/ui/Button.tsx`
- Create: `packages/web/src/components/ui/__tests__/Button.spec.tsx`

- [ ] **Step 1: Write Button.spec.tsx (failing)**

```tsx
// src/components/ui/__tests__/Button.spec.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('applies primary variant class by default', () => {
    render(<Button variant="primary">Primary</Button>)
    const btn = screen.getByRole('button')
    expect(btn.className).toMatch(/bg-primary/)
  })

  it('applies danger variant class', () => {
    render(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button').className).toMatch(/bg-danger/)
  })

  it('applies size class for lg', () => {
    render(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button').className).toMatch(/px-6/)
  })

  it('calls onClick when clicked', () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>Click</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handler = vi.fn()
    render(<Button disabled onClick={handler}>Disabled</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handler).not.toHaveBeenCalled()
  })

  it('shows loading spinner when loading=true', () => {
    render(<Button loading>Saving</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByTestId('button-spinner')).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    render(<Button className="my-custom">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('my-custom')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @judging/web test src/components/ui/__tests__/Button.spec.tsx
```

- [ ] **Step 3: Create src/components/ui/Button.tsx**

```tsx
import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-600 text-white hover:bg-primary-700 focus-visible:ring-primary-500',
  secondary:
    'bg-secondary-200 text-secondary-800 hover:bg-secondary-300 focus-visible:ring-secondary-400',
  danger:
    'bg-danger-500 text-white hover:bg-danger-700 focus-visible:ring-danger-500',
  ghost:
    'bg-transparent text-secondary-700 hover:bg-secondary-100 focus-visible:ring-secondary-400',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled ?? loading

  return (
    <button
      {...rest}
      disabled={isDisabled}
      className={[
        'inline-flex items-center justify-center gap-2 rounded font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-colors duration-150',
        variantClasses[variant],
        sizeClasses[size],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading && (
        <svg
          data-testid="button-spinner"
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm --filter @judging/web test src/components/ui/__tests__/Button.spec.tsx
```

Expected: 8 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ui/Button.tsx \
        packages/web/src/components/ui/__tests__/Button.spec.tsx
git commit -m "feat(web): adiciona componente UI Button com variantes e testes"
```

---

## Task 7: UI components — Input

**Files:**
- Create: `packages/web/src/components/ui/Input.tsx`
- Create: `packages/web/src/components/ui/__tests__/Input.spec.tsx`

- [ ] **Step 1: Write Input.spec.tsx (failing)**

```tsx
// src/components/ui/__tests__/Input.spec.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Input } from '../Input'

describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Email" id="email" />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })

  it('shows error message when error prop present', () => {
    render(<Input label="Email" id="email" error="Invalid email" />)
    expect(screen.getByText('Invalid email')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toHaveClass('border-danger-500')
  })

  it('shows helperText when no error', () => {
    render(<Input label="Email" id="email" helperText="Enter your work email" />)
    expect(screen.getByText('Enter your work email')).toBeInTheDocument()
  })

  it('does not show helperText when error is present', () => {
    render(
      <Input
        label="Email"
        id="email"
        error="Bad email"
        helperText="Enter your work email"
      />,
    )
    expect(screen.queryByText('Enter your work email')).not.toBeInTheDocument()
  })

  it('calls onChange with input value', () => {
    const handler = vi.fn()
    render(<Input label="Name" id="name" onChange={handler} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Alice' } })
    expect(handler).toHaveBeenCalled()
  })

  it('accepts custom className on input element', () => {
    render(<Input label="Test" id="test" className="my-input" />)
    expect(screen.getByRole('textbox')).toHaveClass('my-input')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @judging/web test src/components/ui/__tests__/Input.spec.tsx
```

- [ ] **Step 3: Create src/components/ui/Input.tsx**

```tsx
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
  helperText?: string
  className?: string
}

export function Input({
  label,
  id,
  error,
  helperText,
  className = '',
  ...rest
}: InputProps) {
  const inputId = id
  const errorId = `${id}-error`
  const helperId = `${id}-helper`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-secondary-700">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={[
          'rounded border px-3 py-2 text-sm outline-none',
          'focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
          'transition-colors duration-150',
          error
            ? 'border-danger-500 focus:ring-danger-500'
            : 'border-secondary-300 focus:border-primary-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger-500" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-xs text-secondary-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm --filter @judging/web test src/components/ui/__tests__/Input.spec.tsx
```

Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ui/Input.tsx \
        packages/web/src/components/ui/__tests__/Input.spec.tsx
git commit -m "feat(web): adiciona componente UI Input com label, error e helperText"
```

---

## Task 8: UI components — Card

**Files:**
- Create: `packages/web/src/components/ui/Card.tsx`
- Create: `packages/web/src/components/ui/__tests__/Card.spec.tsx`

- [ ] **Step 1: Write Card.spec.tsx (failing)**

```tsx
// src/components/ui/__tests__/Card.spec.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Card } from '../Card'

describe('Card', () => {
  it('renders body content', () => {
    render(<Card body={<p>Body content</p>} />)
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('renders header when provided', () => {
    render(<Card header={<h2>Card Title</h2>} body={<p>Body</p>} />)
    expect(screen.getByText('Card Title')).toBeInTheDocument()
  })

  it('renders footer when provided', () => {
    render(<Card body={<p>Body</p>} footer={<span>Footer</span>} />)
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('does not render header section when header is omitted', () => {
    const { container } = render(<Card body={<p>Body only</p>} />)
    expect(container.querySelector('[data-card-header]')).toBeNull()
  })

  it('does not render footer section when footer is omitted', () => {
    const { container } = render(<Card body={<p>Body only</p>} />)
    expect(container.querySelector('[data-card-footer]')).toBeNull()
  })

  it('accepts custom className', () => {
    const { container } = render(
      <Card body={<p>Body</p>} className="my-card" />,
    )
    expect(container.firstChild).toHaveClass('my-card')
  })
})
```

- [ ] **Step 2: Run — expect FAIL**

```bash
pnpm --filter @judging/web test src/components/ui/__tests__/Card.spec.tsx
```

- [ ] **Step 3: Create src/components/ui/Card.tsx**

```tsx
import type { ReactNode } from 'react'

interface CardProps {
  header?: ReactNode
  body: ReactNode
  footer?: ReactNode
  className?: string
}

export function Card({ header, body, footer, className = '' }: CardProps) {
  return (
    <div
      className={[
        'rounded-lg border border-secondary-200 bg-white shadow-sm',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {header && (
        <div
          data-card-header=""
          className="border-b border-secondary-200 px-6 py-4"
        >
          {header}
        </div>
      )}
      <div className="px-6 py-4">{body}</div>
      {footer && (
        <div
          data-card-footer=""
          className="border-t border-secondary-200 px-6 py-4"
        >
          {footer}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
pnpm --filter @judging/web test src/components/ui/__tests__/Card.spec.tsx
```

Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ui/Card.tsx \
        packages/web/src/components/ui/__tests__/Card.spec.tsx
git commit -m "feat(web): adiciona componentes UI base Button, Input e Card"
```

---

## Task 9: Shared components — Sidebar + PublicHeader

**Files:**
- Create: `packages/web/src/components/admin/Sidebar.tsx`
- Create: `packages/web/src/components/public/PublicHeader.tsx`

- [ ] **Step 1: Create src/components/admin/Sidebar.tsx**

```tsx
export function Sidebar() {
  return (
    <aside className="flex h-full w-64 flex-col border-r border-secondary-200 bg-white px-4 py-6">
      <div className="mb-8">
        <span className="text-lg font-bold text-primary-700">
          Sistema de Julgamento
        </span>
      </div>
      <nav aria-label="Menu principal">
        <ul className="flex flex-col gap-1">
          {/* TODO P03: adicionar links de navegação autenticados */}
          <li>
            <span className="block rounded px-3 py-2 text-sm text-secondary-500">
              Dashboard
            </span>
          </li>
        </ul>
      </nav>
    </aside>
  )
}
```

- [ ] **Step 2: Create src/components/public/PublicHeader.tsx**

```tsx
import Link from 'next/link'

export function PublicHeader() {
  return (
    <header className="border-b border-secondary-200 bg-white px-6 py-4">
      <nav className="flex items-center justify-between">
        <Link
          href="/"
          className="text-lg font-bold text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Sistema de Julgamento
        </Link>
        <Link
          href="/auth/login"
          className="rounded px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Entrar
        </Link>
      </nav>
    </header>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/web/src/components/admin/Sidebar.tsx \
        packages/web/src/components/public/PublicHeader.tsx
git commit -m "feat(web): adiciona Sidebar e PublicHeader stub"
```

---

## Task 10: Layouts + Root app

**Files:**
- Create: `packages/web/src/app/layout.tsx`
- Create: `packages/web/src/app/(public)/layout.tsx`
- Create: `packages/web/src/app/(admin)/layout.tsx`
- Create: `packages/web/public/.gitkeep`

- [ ] **Step 1: Create src/app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Sistema de Julgamento',
  description: 'Plataforma para gerenciamento e julgamento de eventos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-neutral-50 font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create src/app/(public)/layout.tsx**

```tsx
import { PublicHeader } from '@/components/public/PublicHeader'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create src/app/(admin)/layout.tsx**

```tsx
import { Sidebar } from '@/components/admin/Sidebar'

// TODO P03: redirecionar se não autenticado

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
```

- [ ] **Step 4: Create public/.gitkeep**

```bash
touch packages/web/public/.gitkeep
```

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/app/layout.tsx \
        packages/web/src/app/'(public)'/layout.tsx \
        packages/web/src/app/'(admin)'/layout.tsx \
        packages/web/public/.gitkeep
git commit -m "feat(web): cria layouts root, public e admin com route groups"
```

---

## Task 11: Pages — Home, Login, Dashboard

**Files:**
- Create: `packages/web/src/app/(public)/page.tsx`
- Create: `packages/web/src/app/auth/login/page.tsx`
- Create: `packages/web/src/app/(admin)/dashboard/page.tsx`

- [ ] **Step 1: Create src/app/(public)/page.tsx**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="mb-4 text-4xl font-bold text-secondary-900">
        Sistema de Julgamento
      </h1>
      <p className="mb-8 max-w-lg text-lg text-secondary-600">
        Gerencie eventos, jurados e participantes. Acompanhe o julgamento em
        tempo real.
      </p>
      <Link href="/auth/login">
        <Button size="lg">Acessar o sistema</Button>
      </Link>
    </div>
  )
}
```

- [ ] **Step 2: Create src/app/auth/login/page.tsx**

```tsx
'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const isEmpty = email.trim() === '' || senha.trim() === ''

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <Card
        className="w-full max-w-sm"
        header={
          <h1 className="text-xl font-semibold text-secondary-900">Entrar</h1>
        }
        body={
          <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
            <Input
              id="email"
              label="E-mail"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
            <Input
              id="senha"
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
            <Button
              type="submit"
              className="mt-2 w-full"
              disabled={isEmpty}
              onClick={() => {
                // TODO P03: implementar submit de login
              }}
            >
              Entrar
            </Button>
          </form>
        }
      />
    </div>
  )
}
```

- [ ] **Step 3: Create src/app/(admin)/dashboard/page.tsx**

```tsx
export default function DashboardPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-secondary-900">Dashboard</h1>
      <p className="text-secondary-600">
        Esta página será implementada em P14.
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/app/'(public)'/page.tsx \
        packages/web/src/app/auth/ \
        packages/web/src/app/'(admin)'/dashboard/
git commit -m "feat(web): implementa página inicial, login estático e dashboard placeholder"
```

---

## Task 12: Run full validation

- [ ] **Step 1: Run all tests with coverage**

```bash
pnpm --filter @judging/web test:ci
```

Expected: all tests pass, coverage ≥ 80% statements / ≥ 75% branches / ≥ 80% functions / ≥ 80% lines.

If any threshold fails:
- Check which file has low coverage
- Add missing test cases or adjust coverage exclude list in `vitest.config.ts` for files that cannot be tested without a browser (pages/layouts)

- [ ] **Step 2: Run lint**

```bash
pnpm --filter @judging/web lint
```

Expected: no warnings or errors.

If ESLint complains about `no-console` in a file, replace with `void` or remove the log entirely.

- [ ] **Step 3: Run type-check**

```bash
pnpm --filter @judging/web type-check
```

Expected: no errors.

If `next-env.d.ts` is missing, run `pnpm --filter @judging/web dev` briefly to generate it, then stop and re-run type-check.

- [ ] **Step 4: Run build**

```bash
pnpm --filter @judging/web build
```

Expected: `.next/` created, no errors.

- [ ] **Step 5: Start dev server and manually verify pages**

```bash
pnpm --filter @judging/web dev
```

Open a browser and visit:
- `http://localhost:3001` — should show home page with "Acessar o sistema" button
- `http://localhost:3001/auth/login` — should show login form with email + senha fields; button disabled when empty
- `http://localhost:3001/dashboard` — should show "Dashboard" heading

- [ ] **Step 6: Commit (if any fixes were needed in step 1-4)**

```bash
git add -p  # stage only relevant fixes
git commit -m "fix(web): corrige problemas de lint/type-check detectados na validação"
```

---

## Task 13: Update PROJECT_PROGRESS.md + final commit

**Files:**
- Modify: `PROJECT_PROGRESS.md`

- [ ] **Step 1: Update PROJECT_PROGRESS.md**

Replace the summary block at the top and update/add the P02 row. Example (fill in real coverage numbers):

```markdown
## Resumo

| Campo | Valor |
|---|---|
| **Prompts concluídos** | 3 de 20 |
| **Próximo prompt** | P03 — Autenticação JWT |
| **Última atualização** | 2026-04-27 |
```

In the prompt list, change:
```
- [ ] **P02** — Bootstrap do Frontend
```
to:
```
- [x] **P02** — Bootstrap do Frontend
```

Add a row to the Histórico de execução table:
```
| P02 | 2026-04-27 | feature/p02-bootstrap-web | statements X%, branches Y%, functions Z%, lines W% | Next.js 15 + React 19 + Tailwind 4; Geist font; jsdom/vitest |
```

- [ ] **Step 2: Commit progress update**

```bash
git add PROJECT_PROGRESS.md
git commit -m "docs(progress): conclui P02 — Bootstrap do Web"
```

---

## Task 14: Open Pull Request

- [ ] **Step 1: Push branch**

```bash
git push -u origin feature/p02-bootstrap-web
```

- [ ] **Step 2: Create PR via gh CLI**

```bash
gh pr create \
  --base develop \
  --title "P02: Bootstrap do Web" \
  --body "$(cat <<'EOF'
## Prompt
P02 — Bootstrap do Frontend (Next.js App Router + design system base)

## Resumo
- Next.js 15 com App Router, route groups (public) e (admin)
- Design system com Tailwind CSS 4 e tokens de cor/espaçamento
- Wrapper `lib/api.ts` tipado com `ApiError` genérico
- Componentes UI: Button, Input, Card com testes
- Tela de login estática visualmente completa

## Critérios de aceitação
- [ ] `pnpm --filter @judging/web dev` sobe em localhost:3001
- [ ] Página `/` carrega com link para `/auth/login`
- [ ] Página `/auth/login` mostra formulário visualmente completo
- [ ] Página `/dashboard` carrega
- [ ] lint / type-check / test:ci / build todos verdes

## Validações executadas
- [ ] `pnpm lint` — sem warnings
- [ ] `pnpm type-check` — sem erros
- [ ] `pnpm test:ci` — passou com cobertura X% statements, Y% branches, Z% functions, W% lines
- [ ] `pnpm build` — sucesso

## PROJECT_PROGRESS.md
- [ ] P02 marcado como concluído
- [ ] Cobertura final preenchida
- [ ] Decisões técnicas registradas

## Decisões técnicas
- Tailwind CSS 4 (nova API @import) em vez de 3 — postcss plugin via @tailwindcss/postcss
- Geist font via next/font/google
- Componentes exportados como named exports (não default)
- Testes de env usam vi.resetModules + dynamic import para isolar parseamento do Zod

## Observações
P02 é independente de P01 — ambos partem de develop.
EOF
)"
```

---

## Task 15: Release v0.0.0 — Fase 0 encerrada

> **Warning:** This merges develop into main and creates a permanent public tag. Confirm P00 and P01 are already merged into develop before proceeding.

- [ ] **Step 1: Confirm P00 and P01 in develop**

```bash
git log develop --oneline | head -20
```

Both P00 and P01 commit messages should appear.

- [ ] **Step 2: Merge develop into main**

```bash
git checkout main
git pull origin main
git merge --no-ff develop -m "release: Fase 0 — Fundação"
git push origin main
```

- [ ] **Step 3: Tag v0.0.0**

```bash
git tag -a v0.0.0 -m "Fim da Fase 0 — Fundação (P00, P01, P02)"
git push origin v0.0.0
```

- [ ] **Step 4: Create GitHub Release**

```bash
gh release create v0.0.0 \
  --title "v0.0.0 — Fase 0: Fundação" \
  --notes "$(cat <<'EOF'
## Fase 0 — Fundação

### P00 — Setup do Monorepo
pnpm workspaces + Turborepo + TypeScript strict + ESLint + Prettier + GitHub Actions CI

### P01 — Bootstrap da API
NestJS 11 + Fastify + Prisma + health check + testes de integração + cobertura 98%

### P02 — Bootstrap do Web
Next.js 15 App Router + Tailwind CSS 4 + design system base + componentes UI + wrapper API tipado + testes ≥80%
EOF
)"
```

- [ ] **Step 5: Add tag entry to PROJECT_PROGRESS.md**

Add to Histórico de execução:
```
### 2026-04-27 — Tag v0.0.0 — Fim da Fase 0
```

```bash
git add PROJECT_PROGRESS.md
git commit -m "docs(progress): registra tag v0.0.0 — fim da Fase 0"
git push origin main
```

---

## Self-Review Checklist

### Spec coverage
| Requirement | Task |
|---|---|
| `pnpm dev` on port 3001 | Task 2 (next.config.mjs port 3001) + Task 12 |
| Route groups (public) + (admin) | Task 10 |
| `lib/api.ts` typed wrapper | Task 5 |
| `lib/env.ts` Zod validation | Task 5 |
| Button component | Task 6 |
| Input component | Task 7 |
| Card component | Task 8 |
| Home page `/` | Task 11 |
| Login page `/auth/login` | Task 11 |
| Dashboard placeholder | Task 11 |
| Tailwind tokens | Task 3 |
| Vitest coverage ≥ 80% | Task 4 + Task 12 |
| .env.example | Task 5 |
| Button tests (all 5 cases) | Task 6 |
| Input tests (all 4 cases) | Task 7 |
| Card tests (header/body/footer) | Task 8 |
| API tests (GET, 4xx, 5xx, unwrap) | Task 5 |
| Env tests (missing, valid) | Task 5 |
| PROJECT_PROGRESS.md updated | Task 13 |
| PR opened | Task 14 |
| Tag v0.0.0 | Task 15 |

### Type consistency
- `ApiError` defined in Task 5 `api.ts`, referenced in same file's tests — consistent
- `Button` export named in Task 6, imported as `{ Button }` in pages Task 11 — consistent
- `Input` export named in Task 7, imported as `{ Input }` — consistent
- `Card` export named in Task 8, imported as `{ Card }` — consistent
- `Sidebar` named export in Task 9, imported in layout Task 10 — consistent
- `PublicHeader` named export in Task 9, imported in layout Task 10 — consistent
- `@/` alias configured in tsconfig Task 2 AND vitest.config Task 4 — both point to `./src/` — consistent
