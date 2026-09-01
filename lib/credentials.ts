import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "crypto";
import { getDatabase } from "./database";

const keyLength = 64;
const scryptOptions = { N: 32_768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function deriveKey(password: string, salt: Buffer, options = scryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, key) => error ? reject(error) : resolve(key));
  });
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = await deriveKey(password, salt);
  return `scrypt$32768$8$1$${salt.toString("base64url")}$${derivedKey.toString("base64url")}`;
}

async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  const [algorithm, workFactor, blockSize, parallelism, saltValue, keyValue] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltValue || !keyValue) return false;
  const derivedKey = await deriveKey(password, Buffer.from(saltValue, "base64url"), {
    N: Number(workFactor), r: Number(blockSize), p: Number(parallelism), maxmem: 64 * 1024 * 1024,
  });
  const expectedKey = Buffer.from(keyValue, "base64url");
  return expectedKey.length === derivedKey.length && timingSafeEqual(expectedKey, derivedKey);
}

export async function verifyUserPassword(email: string, password: string) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, email, display_name, password_hash FROM users
    WHERE email = ${email.trim().toLowerCase()} LIMIT 1
  ` as { id: string; email: string; display_name: string; password_hash: string | null }[];
  const user = rows[0];
  if (!user?.password_hash || !(await verifyPassword(user.password_hash, password))) return null;
  return { id: user.id, email: user.email, name: user.display_name };
}

export async function setUserPassword(email: string, password: string, displayName: string) {
  const passwordHash = await hashPassword(password);
  const sql = getDatabase();
  await sql`
    INSERT INTO users (email, display_name, password_hash, password_changed_at)
    VALUES (${email.trim().toLowerCase()}, ${displayName.trim()}, ${passwordHash}, NOW())
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, password_changed_at = NOW(), updated_at = NOW()
  `;
}

export async function changeUserPassword(email: string, currentPassword: string, nextPassword: string) {
  const user = await verifyUserPassword(email, currentPassword);
  if (!user) return false;
  await setUserPassword(email, nextPassword, user.name);
  return true;
}

export async function getUserProfile(email: string) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT email, display_name FROM users WHERE email = ${email.trim().toLowerCase()} LIMIT 1
  ` as { email: string; display_name: string }[];
  return rows[0] ?? null;
}

export async function updateUserProfile(email: string, displayName: string) {
  const sql = getDatabase();
  const rows = await sql`
    UPDATE users SET display_name = ${displayName.trim()}, updated_at = NOW()
    WHERE email = ${email.trim().toLowerCase()}
    RETURNING email, display_name
  ` as { email: string; display_name: string }[];
  return rows[0] ?? null;
}