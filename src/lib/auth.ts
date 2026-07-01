import type { NextAuthOptions } from 'next-auth';
import { getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { db } from './db';

type Role = 'user' | 'moderator' | 'admin';

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // Runs on sign-in (when `user` is present). We upsert into our own users
    // table and stamp the token with the DB id + role. No DB hit on later reqs.
    async jwt({ token, user }) {
      if (user?.email) {
        const wantAdmin = adminEmails().includes(user.email.toLowerCase());
        const desiredRole: Role = wantAdmin ? 'admin' : 'user';
        const sql = db();
        const [row] = await sql<{ id: string; role: Role }[]>`
          INSERT INTO users (email, name, image, provider, role, last_login_at)
          VALUES (${user.email}, ${user.name ?? null}, ${user.image ?? null}, 'google', ${desiredRole}, now())
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            image = EXCLUDED.image,
            last_login_at = now(),
            role = CASE
              WHEN users.role = 'admin' OR EXCLUDED.role = 'admin' THEN 'admin'
              ELSE users.role
            END
          RETURNING id::text AS id, role
        `;
        if (row) {
          token.uid = row.id;
          token.role = row.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.uid;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {},
};

// Server-side session helper for route handlers / server components.
export const getSession = () => getServerSession(authOptions);

export async function requireRole(roles: Role[]) {
  const session = await getSession();
  const role = session?.user?.role;
  if (!role || !roles.includes(role)) return null;
  return session;
}
