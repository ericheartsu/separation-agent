import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { db } from './db';
import { users } from './db/schema';
import { eq } from 'drizzle-orm';

/**
 * Returns the logged-in user's DB record + Drive access token.
 * Throws if no valid session.
 */
export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    throw new Error('Not authenticated');
  }

  let dbUser = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
  });

  // First-time login: auto-create the user record
  if (!dbUser) {
    const tenant = await db.query.tenants.findFirst();
    if (!tenant) throw new Error('No tenant configured. Run seed.');
    [dbUser] = await db.insert(users).values({
      tenantId: tenant.id,
      email: session.user.email,
      name: session.user.name ?? session.user.email,
      image: session.user.image ?? null,
      // First user becomes admin; everyone else starts as operator
      role: session.user.email === 'eric@craft-mfg.com' ? 'admin' : 'operator',
    }).returning();
  }

  const driveAccessToken = (session as any).driveAccessToken as string | undefined;

  return { user: dbUser, driveAccessToken, session };
}
