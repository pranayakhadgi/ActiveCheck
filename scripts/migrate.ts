/**
 * Applies every db/migrations/NNN_name.sql file that has not been applied yet,
 * in filename order, each in its own transaction. Safe to re-run.
 *
 * Usage: npm run db:migrate
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const MIGRATIONS_DIR = join(process.cwd(), "db", "migrations");

async function main() {
  // DDL goes to the direct endpoint when there is one: Neon's pooled endpoint is
  // pgbouncer in transaction mode, which is a poor fit for multi-statement DDL.
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (put it in .env.local)");
  }

  // A dedicated short-lived client, not lib/db.ts: migrations run once and exit.
  const sql = postgres(connectionString, { ssl: "require", max: 1 });

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const applied = new Set(
      (await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map(
        (r) => r.name,
      ),
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let count = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`skip    ${file}`);
        continue;
      }
      const statements = readFileSync(join(MIGRATIONS_DIR, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(statements);
        await tx`INSERT INTO schema_migrations ${tx({ name: file })}`;
      });
      console.log(`applied ${file}`);
      count += 1;
    }

    console.log(
      count === 0 ? "Database already up to date." : `Applied ${count} migration(s).`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
