import { defineConfig, loadEnv } from "vitest/config";

export default defineConfig(({ mode }) => {
  // Load .env.test (and not the dev .env) when running tests so we never
  // accidentally hit the dev/prod Supabase project from a test run.
  const env = loadEnv("test", process.cwd(), "");

  // Mirror the loaded env into import.meta.env so src/lib/supabase.js
  // (which reads import.meta.env.VITE_*) connects to the test project.
  const define = Object.fromEntries(
    Object.entries(env)
      .filter(([k]) => k.startsWith("VITE_"))
      .map(([k, v]) => [`import.meta.env.${k}`, JSON.stringify(v)]),
  );

  return {
    define,
    test: {
      include: ["tests/**/*.spec.{js,ts}"],
      exclude: ["tests/contract/**", "node_modules/**", "dist/**"],
      setupFiles: ["./tests/setup.js"],
      environment: "node",
      // PayMongo sandbox + Supabase Edge Functions can be slow.
      testTimeout: 30_000,
      hookTimeout: 30_000,
      // Tests share a single seed fixture; run files sequentially within
      // each file but don't parallelise files either, since they all hit
      // the same rows.
      fileParallelism: false,
      sequence: { concurrent: false },
      reporters: ["verbose"],
    },
  };
});
