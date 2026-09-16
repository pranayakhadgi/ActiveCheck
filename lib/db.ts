import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set (put it in .env.local)");
}

// One pooled client per process. Next dev reloads modules, so cache it on
// globalThis to avoid opening a new pool on every hot reload.
const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql: postgres.Sql =
  globalForDb.sql ??
  postgres(connectionString, {
    // Neon requires TLS; keep the pool small for serverless.
    ssl: "require",
    max: 5,
    // Return DATE columns as plain YYYY-MM-DD strings, not local-timezone Dates,
    // so a report period never shifts a day when rendered.
    types: {
      date: {
        to: 1082,
        from: [1082],
        serialize: (v: string) => v,
        parse: (v: string) => v,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
