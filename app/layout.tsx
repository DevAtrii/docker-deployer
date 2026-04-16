import type { Metadata } from 'next';
import { Inter, Oxanium } from 'next/font/google';
import './globals.css';
import Providers from './providers';
import { cn } from "@/lib/utils";

import { Toaster } from "@/components/ui/sonner";

const oxanium = Oxanium({ subsets: ['latin'], variable: '--font-sans' });
const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Docker Deployer',
  description: 'Manage your docker containers with ease.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={oxanium.variable}>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </Providers>
      </body>
    </html>
  );
}
