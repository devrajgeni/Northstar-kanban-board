import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
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

const salt = randomBytes(16);
const derivedKey = await promisify(scryptCallback)(password, salt, 64, { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const passwordHash = `scrypt$32768$8$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
const sql = neon(process.env.DATABASE_URL);
await sql`
  INSERT INTO users (email, display_name, password_hash, password_changed_at)
  VALUES (${email}, ${displayName}, ${passwordHash}, NOW())
  ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash, password_changed_at = NOW(), updated_at = NOW()
`;
console.log("User account created or updated.");