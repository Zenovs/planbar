import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { SharedTimelineView } from './shared-timeline-view';

interface PageProps {
  params: { token: string };
}

export default async function SharedTimelinePage({ params }: PageProps) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      shareToken: params.token,
      shareEnabled: true,
    },
    include: {
      milestones: {
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  if (!ticket) {
    notFound();
  }

  return (
    <SharedTimelineView
      projectTitle={ticket.title}
      projectDescription={ticket.description}
      milestones={ticket.milestones}
    />
  );
}
