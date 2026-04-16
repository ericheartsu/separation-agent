/**
 * NextAuth scaffold — wired but not active until OAuth creds exist.
 *
 * In mock mode, every request is treated as the seeded admin user
 * (eric@craft-mfg.com) so the UI is fully usable for local dev.
 */
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

const ALLOWED_DOMAIN = process.env.ALLOWED_GOOGLE_DOMAIN || 'craft-mfg.com';

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
          // Note: removed `hd` param — NextAuth's signIn callback enforces
          // domain check below, and `hd` can over-filter when the user's
          // Google account isn't part of a Workspace org with the same name.
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async signIn({ user, profile, account }) {
      // Try multiple sources for the email, log everything
      const email = profile?.email ?? user?.email ?? null;
      console.log('[signIn callback]', {
        email,
        profileEmail: profile?.email,
        userEmail: user?.email,
        allowedDomain: ALLOWED_DOMAIN,
        provider: account?.provider,
      });
      if (!email) {
        console.log('[signIn callback] REJECTED — no email');
        return false;
      }
      if (!email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN.toLowerCase()}`)) {
        console.log('[signIn callback] REJECTED — domain mismatch');
        return false;
      }
      return true;
    },
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.driveAccessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user?.email) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.email, session.user.email),
        });
        if (dbUser) {
          (session.user as any).id = dbUser.id;
          (session.user as any).role = dbUser.role;
        }
      }
      (session as any).driveAccessToken = token.driveAccessToken;
      return session;
    },
  },
};

/**
 * In mock mode, this returns the seeded admin user. In live mode,
 * pulls from the NextAuth session.
 */
export async function getCurrentUser() {
  // Phase 1: mock-only. Live wiring lands once OAuth creds exist.
  const [admin] = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  return admin;
}
