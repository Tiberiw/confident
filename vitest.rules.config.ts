import { defineConfig } from "vitest/config";

// Firestore security rules tests. Run through `npm run test:rules`, which starts the emulator.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["tests/rules/**/*.test.ts"],
    testTimeout: 20_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
