import { createHash, timingSafeEqual } from "crypto";
import type { AuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { clearAttempts, isLockedOut, recordFailedAttempt } from "./rateLimit";

// Fixed-length digest comparison avoids leaking input length via timing.
function safeCompare(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a).digest();
  const hashB = createHash("sha256").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

// TODO: replace with a real user store + hashed password verification (e.g. bcrypt).
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? "user";
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "admin";

const hasAzureAdConfig = Boolean(
  process.env.AZURE_AD_CLIENT_ID && process.env.AZURE_AD_CLIENT_SECRET && process.env.AZURE_AD_TENANT_ID
);

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim() ?? "";
        const password = credentials?.password ?? "";
        const throttleKey = email.toLowerCase() || "unknown";

        if (isLockedOut(throttleKey)) return null;

        const isValid = safeCompare(email, DEMO_EMAIL) && safeCompare(password, DEMO_PASSWORD);
        if (!isValid) {
          recordFailedAttempt(throttleKey);
          return null;
        }

        clearAttempts(throttleKey);
        return { id: "1", name: "Mina Patel", email: DEMO_EMAIL };
      },
    }),
    ...(hasAzureAdConfig
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/login", error: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
};
