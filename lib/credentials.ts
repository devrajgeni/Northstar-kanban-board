import argon2 from "argon2";
import { getDatabase } from "./database";

const hashingOptions = {
  type: argon2.argon2id as 2,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export async function verifyUserPassword(email: string, password: string) {
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, email, display_name, password_hash FROM users
    WHERE email = ${email.trim().toLowerCase()} LIMIT 1
  ` as { id: string; email: string; display_name: string; password_hash: string | null }[];
  const user = rows[0];
  if (!user?.password_hash || !(await argon2.verify(user.password_hash, password))) return null;
  return { id: user.id, email: user.email, name: user.display_name };
}

export async function setUserPassword(email: string, password: string, displayName: string) {
  const passwordHash = await argon2.hash(password, hashingOptions);
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