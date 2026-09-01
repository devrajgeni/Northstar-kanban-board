import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import argon2 from "argon2";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");

const prompts = createInterface({ input, output });
const email = (await prompts.question("Email: ")).trim().toLowerCase();
const displayName = (await prompts.question("Display name: ")).trim();
const password = await prompts.question("Password: ", { hideEchoBack: true });
prompts.close();

if (!/^\S+@\S+\.\S+$/.test(email) || !displayName || password.length < 12) {
  throw new Error("Use a valid email and display name; password must be at least 12 characters.");
}

const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
const sql = neon(process.env.DATABASE_URL);
await sql`
  INSERT INTO users (email, display_name, password_hash, password_changed_at)
  VALUES (${email}, ${displayName}, ${passwordHash}, NOW())
  ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash, password_changed_at = NOW(), updated_at = NOW()
`;
console.log("User account created or updated.");