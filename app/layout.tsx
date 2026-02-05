import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
// import EmceePlayer from '@/components/emcee/EmceePlayer'; later may add below <QuestionBox />  // <EmceePlayer>
import QuestionBox from '@/components/interaction/QuestionBox';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Moltbot AI Summit',
  description: 'Simultaneous Multiplicity - AI agents react to live events',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        {children}
        <QuestionBox />
      
      </body>
    </html>
  );
}
