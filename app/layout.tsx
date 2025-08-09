
// app/layout.tsx
import type { Metadata } from "next"
import { Providers } from "./providers"
import { MobileAppConfig } from "@/components/mobile-app-config"
import { AuthStatus } from "@/components/auth-status"
import "./globals.css"

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
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="format-detection" content="telephone=no" />
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