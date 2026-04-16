/**
 * Middleware: redirect unauthenticated users to sign-in for protected routes.
 *
 * Public routes (no auth needed):
 *   /api/auth/*           NextAuth handlers
 *   /api/synthetic-template, /api/mock-preview   image generators
 *   _next/*               Next.js static
 *   favicon.ico
 */
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/api/auth/signin',
  },
});

export const config = {
  matcher: [
    '/((?!api/auth|api/mock-preview|api/synthetic-template|api/debug-session|_next/static|_next/image|favicon.ico).*)',
  ],
};
