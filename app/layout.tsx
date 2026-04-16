import type { Metadata } from 'next';
import { Montserrat } from 'next/font/google';
import { getServerSession } from 'next-auth';
import './globals.css';
import { Nav } from '@/components/nav';
import { AuthSessionProvider } from '@/components/session-provider';
import { authOptions } from '@/lib/auth';
import { isMockMode } from '@/lib/utils';

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Separation Agent · Craft MFG',
  description: 'Expert artwork separator for screen printing.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const mock = isMockMode();
  return (
    <html lang="en" className={montserrat.className}>
      <body className="font-sans antialiased">
        <AuthSessionProvider session={session}>
          {mock && (
            <div className="bg-craft-orange/10 border-b border-craft-orange/30 text-craft-orange text-xs py-1.5 px-4 text-center">
              ⚠️ MOCK MODE — Drive reads, Claude calls, and Google login are stubbed. Add real env vars in <code>.env</code> to go live.
            </div>
          )}
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 min-w-0">{children}</main>
          </div>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
