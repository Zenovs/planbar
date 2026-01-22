import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LoginPage } from '@/components/login-page';
import prisma from '@/lib/db';

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      // Get user role from database to ensure accuracy
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      // Only admin goes to dashboard, all others go to tasks
      if (user?.role === 'admin') {
        redirect('/dashboard');
      } else {
        redirect('/tasks');
      }
    }
  } catch (error) {
    console.error('Session check failed:', error);
    // Continue to show login page even if session check fails
  }

  return <LoginPage />;
}
