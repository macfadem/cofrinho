import { defineConfig } from "drizzle-kit";

// Gera as migrações em ./drizzle a partir do schema (npm run db:gerar).
// O app aplica as migrações sozinho ao iniciar.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: "data/app.db" },
});
