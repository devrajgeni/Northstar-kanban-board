import { neon } from "@neondatabase/serverless";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured.");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationDirectory = path.join(scriptDirectory, "..", "db", "migrations");
const migrationFiles = (await readdir(migrationDirectory))
  .filter((fileName) => fileName.endsWith(".sql"))
  .sort();
const sql = neon(process.env.DATABASE_URL);

for (const fileName of migrationFiles) {
  const contents = await readFile(path.join(migrationDirectory, fileName), "utf8");
  const statements = contents
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await sql.query(statement);
  }

  console.log(`Applied ${fileName}`);
}