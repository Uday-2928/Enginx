import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    restoreMocks: true,
    // Full-workspace jsdom tests are memory-heavy. Run files serially so a
    // small development machine does not page several React/Three workers.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
