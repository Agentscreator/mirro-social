"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

export function AuthStatus() {
  const { data: session, status } = useSession()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white border border-gray-200 rounded-lg p-3 shadow-lg text-xs z-50 max-w-xs">
      <div className="font-semibold mb-1">Auth Status (Dev Only)</div>
      <div>Status: <span className="font-mono">{status}</span></div>
      <div>Session: <span className="font-mono">{session ? '✓' : '✗'}</span></div>
      {session && (
        <div>User: <span className="font-mono">{session.user?.email || session.user?.name}</span></div>
      )}
      <div>Environment: <span className="font-mono">{typeof window !== 'undefined' ? 'Client' : 'Server'}</span></div>
    </div>
  )
}