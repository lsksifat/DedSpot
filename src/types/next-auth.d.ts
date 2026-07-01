import 'next-auth';
import 'next-auth/jwt';

// Extend the session/token with our own user id + role.
declare module 'next-auth' {
  interface Session {
    user: {
      id?: string;
      role?: 'user' | 'moderator' | 'admin';
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string;
    role?: 'user' | 'moderator' | 'admin';
  }
}
