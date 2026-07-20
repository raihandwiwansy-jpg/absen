import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Absensi Simphony',
  description: 'Sistem absensi otomatis berbasis pengenalan wajah untuk anggota simphony',
  keywords: ['absensi', 'simphony', 'face recognition', 'kehadiran'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
