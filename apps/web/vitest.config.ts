import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@cache/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
});
