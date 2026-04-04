import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sathyabama Canteen — Online Vending System',
  description: 'Order food online from Sathyabama University canteen. Skip the queue, get your receipt, collect faster.',
  keywords: ['canteen', 'sathyabama', 'food order', 'university', 'online ordering'],
  openGraph: {
    title: 'Sathyabama Canteen',
    description: 'Order food online from Sathyabama University canteen.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-[family-name:var(--font-poppins)] antialiased bg-slate-50 min-h-screen">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{
            style: { fontFamily: 'Poppins, sans-serif' },
          }}
        />
      </body>
    </html>
  );
}
