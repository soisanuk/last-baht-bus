// Playwright config for the browser E2E smoke test (tests/e2e/). This is the
// ONLY part of the project that needs `npm install` + a browser download; the
// app itself is still plain static files with no build. Kept separate from the
// node:vm suite (`node --test`), which stays install-free and gates deploys.
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  use: { ...devices["Desktop Chrome"] },
  // No webServer: the app is designed to run from file://, so the spec loads
  // web/index.html directly — that's the property we want to prove.
});
