import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useOnlinePresence } from '@/hooks/useOnlinePresence';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  // Track this visitor in presence
  useOnlinePresence();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-14 sm:pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
};
