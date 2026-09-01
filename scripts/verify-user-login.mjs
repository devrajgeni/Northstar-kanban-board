import { createInterface } from "node:readline/promises";
import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { stdin as input, stdout as output } from "node:process";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured.");

const prompts = createInterface({ input, output });
const email = (await prompts.question("Email: ")).trim().toLowerCase();
const password = await prompts.question("Password: ", { hideEchoBack: true });
prompts.close();

const sql = neon(process.env.DATABASE_URL);
const rows = await sql`
  SELECT password_hash FROM users WHERE email = ${email} LIMIT 1
`;
const storedHash = rows[0]?.password_hash;
if (!storedHash) throw new Error("No password-backed account was found for this email.");

const [algorithm, workFactor, blockSize, parallelism, saltValue, keyValue] = storedHash.split("$");
if (algorithm !== "scrypt" || !saltValue || !keyValue) throw new Error("The account uses an unsupported legacy password hash. Run npm run user:create to reset it.");

const derivedKey = await promisify(scryptCallback)(password, Buffer.from(saltValue, "base64url"), 64, {
  N: Number(workFactor), r: Number(blockSize), p: Number(parallelism), maxmem: 64 * 1024 * 1024,
});
const expectedKey = Buffer.from(keyValue, "base64url");
const matches = expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
console.log(matches ? "Credentials verified." : "Credentials do not match.");