import type { Metadata } from 'next'
import { Providers } from '@/components/Providers'
import StatsTicker from '@/components/StatsTicker'
import ErrorBoundary from '@/components/ErrorBoundary'
import './globals.css'

export const metadata: Metadata = {
  title: 'Documentation Consistency Analyzer',
  description: 'Analyze documentation quality and consistency',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <StatsTicker />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  )
}
