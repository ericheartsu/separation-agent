import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const ALLOWED_DOMAIN = process.env.ALLOWED_GOOGLE_DOMAIN || 'craft-mfg.com';

/**
 * Refresh an expired Google access token using the refresh token.
 * Returns the new access token + refreshed expiry, or throws.
 */
async function refreshGoogleAccessToken(refreshToken: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${data.error ?? res.status}`);
  }
  return {
    accessToken: data.access_token as string,
    // Google rotates refresh tokens occasionally; if absent, keep the old one.
    refreshToken: (data.refresh_token as string | undefined) ?? refreshToken,
    expiresAt: Date.now() + (data.expires_in as number) * 1000,
  };
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          scope: [
            'openid', 'email', 'profile',
            // Drive scope: read-only ONLY (see SAFETY.md)
            'https://www.googleapis.com/auth/drive.readonly',
          ].join(' '),
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, profile }) {
      const email = profile?.email ?? user?.email ?? null;
      if (!email) return false;
      if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`)) return false;
      return true;
    },
    async jwt({ token, account }) {
      // Initial sign-in: capture the OAuth tokens
      if (account?.access_token) {
        token.driveAccessToken = account.access_token;
        token.driveRefreshToken = account.refresh_token;
        token.driveAccessTokenExpiresAt =
          account.expires_at ? account.expires_at * 1000 : Date.now() + 3600_000;
        return token;
      }

      // Subsequent calls: refresh the access token if it's expired or expiring soon
      const expiresAt = token.driveAccessTokenExpiresAt as number | undefined;
      const refreshToken = token.driveRefreshToken as string | undefined;
      const expiringSoon = expiresAt && Date.now() > expiresAt - 60_000; // 1-min buffer

      if (expiringSoon && refreshToken) {
        try {
          const refreshed = await refreshGoogleAccessToken(refreshToken);
          token.driveAccessToken = refreshed.accessToken;
          token.driveRefreshToken = refreshed.refreshToken;
          token.driveAccessTokenExpiresAt = refreshed.expiresAt;
        } catch (err) {
          console.error('[auth] token refresh failed — user must re-login:', err);
          // Mark token as broken; session callback will surface this
          token.driveAccessToken = undefined;
          token.refreshError = String(err);
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Cache user ID on the session — avoids per-request DB lookup elsewhere
      if (session.user?.email && !(session.user as any).id) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, session.user.email),
        });
        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).role = dbUser.role;
        }
      }
      (session as any).driveAccessToken = token.driveAccessToken;
      (session as any).refreshError = token.refreshError;
      return session;
    },
  },
};
