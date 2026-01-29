import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { ToasterWrapper } from '@/components/toaster-wrapper';

const inter = Inter({ subsets: ['latin'] });

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://planbar-one.vercel.app')),
  title: 'planbar - Modernes Projektmanagement-Tool',
  description: 'Projektmanagement-Tool für Teams: Projektplanung, Task-Management, Ressourcenplanung und Meilenstein-Tracking. Mit rollenbasierten Zugriffsrechten, Kalenderintegration und teilbaren Timeline-Links. Optimiert für Desktop, Tablet und Smartphone.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'planbar - Modernes Projektmanagement-Tool',
    description: 'Projektmanagement-Tool für Teams: Projektplanung, Task-Management, Ressourcenplanung und Meilenstein-Tracking. Mit rollenbasierten Zugriffsrechten und teilbaren Timeline-Links.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script src="https://apps.abacus.ai/chatllm/appllm-lib.js"></script>
      </head>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <ToasterWrapper />
      </body>
    </html>
  );
}
