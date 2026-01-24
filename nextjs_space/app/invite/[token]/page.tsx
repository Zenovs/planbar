import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import InviteClient from './invite-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: { token: string };
}

export default async function InvitePage({ params }: Props) {
  const { token } = params;

  // Einladung prüfen
  const invite = await prisma.orgInvite.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Einladung nicht gefunden</h1>
          <p className="text-gray-500">Diese Einladung existiert nicht oder wurde bereits verwendet.</p>
        </div>
      </div>
    );
  }

  if (invite.accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="text-green-500 text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Bereits angenommen</h1>
          <p className="text-gray-500">Diese Einladung wurde bereits angenommen.</p>
          <a href="/" className="mt-4 inline-block px-6 py-2 bg-blue-500 text-white rounded-lg">Zur Anmeldung</a>
        </div>
      </div>
    );
  }

  if (new Date(invite.expiresAt) < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <div className="text-yellow-500 text-5xl mb-4">⏰</div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Einladung abgelaufen</h1>
          <p className="text-gray-500">Diese Einladung ist leider abgelaufen. Bitte fordern Sie eine neue Einladung an.</p>
        </div>
      </div>
    );
  }

  return (
    <InviteClient
      token={token}
      invite={{
        email: invite.email,
        role: invite.role,
        organization: invite.organization,
        invitedBy: invite.invitedBy,
      }}
    />
  );
}
