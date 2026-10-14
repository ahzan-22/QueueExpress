import type { Metadata, Viewport } from 'next';
import './globals.css';
import { MotionProvider } from '@/components/motion-provider';

export const metadata: Metadata = {
  title: 'QueueExpress - Antrean Digital UMKM',
  description:
    'Sistem antrean digital real-time untuk barbershop, bengkel, klinik, dan rumah makan. Tanpa perlu unduh aplikasi.',
};

export const viewport: Viewport = {
  themeColor: '#05060f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>): React.ReactElement {
  return (
    <html lang="id">
      <body className="min-h-dvh antialiased">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}