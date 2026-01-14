import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
// import { PrismaAdapter } from '@next-auth/prisma-adapter';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { sendLoginNotificationEmail } from '@/lib/email';

export const authOptions: NextAuthOptions = {
  // Note: PrismaAdapter removed to avoid issues with database schema mismatches
  // adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Bitte E-Mail und Passwort eingeben');
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user?.password) {
          throw new Error('Benutzer nicht gefunden');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Falsches Passwort');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  callbacks: {
    async jwt({ token, user, trigger, session: updateSession }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.picture = user.image;

        // Login-Benachrichtigung senden (nur bei neuem Login)
        try {
          await sendLoginNotificationEmail(
            user.email!,
            user.name || user.email!,
            new Date()
          );
        } catch (error) {
          console.error('Failed to send login notification email:', error);
          // Don't fail login if email fails
        }
      }
      // Update token when session is updated (e.g., after profile change)
      if (trigger === 'update' && updateSession) {
        token.name = updateSession.user?.name;
        token.picture = updateSession.user?.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        // Use token data directly - updated via JWT callback
        session.user.name = token.name as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
};
