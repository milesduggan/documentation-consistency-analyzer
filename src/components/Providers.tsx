'use client'

import { ReactNode } from 'react';
import { TickerProvider } from '@/context/TickerContext';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TickerProvider>
      {children}
    </TickerProvider>
  );
}
