import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  metadataBase: new URL('https://music.siv19.dev'),
  title: 'Unison — Your Listening, Unpacked',
  description:
    'Explore your Spotify, Apple Music, or YouTube Music history in 3D from a private, browser-processed export ZIP. No login and no music API.',
  applicationName: 'Unison',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'Unison — Your Listening, Unpacked',
    description:
      'A private, shareable lifetime recap from your Spotify, Apple Music, or YouTube Music export.',
    url: 'https://music.siv19.dev',
    siteName: 'Unison',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unison — Your Listening, Unpacked',
    description: 'Your music history in 3D, processed privately from your export ZIP.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
