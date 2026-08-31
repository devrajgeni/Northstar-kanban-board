// In-memory, per-server-instance login throttle. Resets on restart and does not
// share state across multiple instances — swap for a shared store (e.g. Redis)
// before running this behind more than one server process.
type Attempt = { count: number; firstAttemptAt: number; lockedUntil: number };

const WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, Attempt>();

export function isLockedOut(key: string): boolean {
  const record = attempts.get(key);
  if (!record) return false;
  if (record.lockedUntil > Date.now()) return true;
  if (record.lockedUntil !== 0) attempts.delete(key);
  return false;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  const record = attempts.get(key);
  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAttemptAt: now, lockedUntil: 0 });
    return;
  }
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) record.lockedUntil = now + LOCKOUT_MS;
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}
