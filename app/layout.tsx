import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kezkam Homes Limited — Property Management',
  description: 'Internal rent and property management system — Kezkam Homes Limited, Nairobi Kenya.',
  icons: {
    icon: 'https://kezkamhomes.com/wp-content/uploads/2026/03/cropped-kez-removebg-preview-2-2-1-270x270.webp',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
