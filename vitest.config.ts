import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  // React Native defines `__DEV__`; node does not, so a bare `if (__DEV__)` in
  // app code would throw a ReferenceError here rather than in the app. Declared
  // false so dev-only logging stays out of the test output.
  define: { __DEV__: "false" },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
  },
});
