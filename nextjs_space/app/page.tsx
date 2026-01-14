import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { LoginPage } from '@/components/login-page';

export default async function Home() {
  try {
    const session = await getServerSession(authOptions);

    if (session?.user) {
      redirect('/dashboard');
    }
  } catch (error) {
    console.error('Session check failed:', error);
    // Continue to show login page even if session check fails
  }

  return <LoginPage />;
}
