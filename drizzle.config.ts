import { defineConfig } from "drizzle-kit";

// DATABASE_URL wins so `drizzle-kit push` can target Supabase, Neon or any
// remote Postgres; local Postgres remains the default for `npm run dev`.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db",
  },
});
