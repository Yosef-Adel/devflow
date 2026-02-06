import type { Config } from "drizzle-kit";

export default {
  schema: "./src/main/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./devflow.db",
  },
} satisfies Config;
