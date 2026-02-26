'use client'

import { createContext, useContext, useState, ReactNode } from 'react';

export interface TickerMetrics {
  totalFiles: number;
  markdownFiles: number;
  linksChecked: number;
  issuesFound: number;
  coverage: number;
}

export interface TickerData {
  mode: 'idle' | 'dashboard' | 'history' | 'project' | 'results';
  projectName?: string;
  metrics?: TickerMetrics;
}

interface TickerContextType {
  tickerData: TickerData;
  setTickerData: (data: TickerData) => void;
}

const TickerContext = createContext<TickerContextType | undefined>(undefined);

export function TickerProvider({ children }: { children: ReactNode }) {
  const [tickerData, setTickerData] = useState<TickerData>({ mode: 'idle' });

  return (
    <TickerContext.Provider value={{ tickerData, setTickerData }}>
      {children}
    </TickerContext.Provider>
  );
}

export function useTickerContext() {
  const context = useContext(TickerContext);
  if (context === undefined) {
    throw new Error('useTickerContext must be used within a TickerProvider');
  }
  return context;
}
