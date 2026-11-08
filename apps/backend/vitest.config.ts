import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Scoped to the pure-logic files these unit/integration tests actually
      // target. Thresholds from PKG-054; widen `include` as coverage grows.
      include: [
        'src/lib/case-mapping.ts',
        'src/lib/encryption.ts',
        'src/config/wati-templates.ts',
        'src/modules/voice/trial-gate.ts',
        'src/middleware/subscription-guard.ts',
        'src/middleware/authorize.ts',
      ],
      thresholds: { branches: 75, functions: 80, lines: 80, statements: 80 },
    },
  },
});
