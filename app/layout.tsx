import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Extract workflows and tests',
  description: 'A tool within a tool',
  generator: 'A certified QAW banger',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
