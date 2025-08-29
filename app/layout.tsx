
// app/layout.tsx
import type { Metadata } from "next"
import { Providers } from "./providers"
import { MobileAppConfig } from "@/components/mobile-app-config"
import { AuthStatus } from "@/components/auth-status"
import "./globals.css"
import "../styles/watch.css"

// Import mobile performance optimizer
import "@/lib/mobile-performance"

export const metadata: Metadata = {
  title: "Mirro",
  description: "Connect with others who share your interests",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" style={{backgroundColor: '#000000', color: '#ffffff'}}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Mirro" />
        <meta name="apple-mobile-web-app-title" content="Mirro" />
        <meta name="theme-color" content="#000000" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="320" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="msapplication-tap-highlight" content="no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{backgroundColor: '#000000', color: '#ffffff'}}>
        <MobileAppConfig />
        <Providers>
          {children}
          <AuthStatus />
        </Providers>
      </body>
    </html>
  )
}