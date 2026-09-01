import type { AuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import { clearAttempts, isLockedOut, recordFailedAttempt } from "./rateLimit";
import { verifyUserPassword } from "./credentials";

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

        const user = await verifyUserPassword(email, password);
        if (!user) {
          recordFailedAttempt(throttleKey);
          return null;
        }

        clearAttempts(throttleKey);
        return user;
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
