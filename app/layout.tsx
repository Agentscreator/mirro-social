
// app/layout.tsx
import type { Metadata } from "next"
import { Providers } from "./providers"
import { MobileAppConfig } from "@/components/mobile-app-config"
import { AuthStatus } from "@/components/auth-status"
import "./globals.css"
import "../styles/watch.css"

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
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Mirro" />
        <meta name="apple-mobile-web-app-title" content="Mirro" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body>
        <MobileAppConfig />
        <Providers>
          {children}
          <AuthStatus />
        </Providers>
      </body>
    </html>
  )
}