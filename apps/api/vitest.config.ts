import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    // Keep tests hermetic – no Nest runtime booted here, just plain modules.
  },
});
