import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Documentation Consistency Analyzer',
  description: 'Analyze documentation for broken links and inconsistencies',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
