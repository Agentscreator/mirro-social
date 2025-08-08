"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export function WebAuthRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    // If user is authenticated, redirect them directly to the feed
    if (status === 'authenticated' && session) {
      console.log('✅ User authenticated, redirecting to feed')
      router.replace('/feed')
    }
  }, [session, status, router])

  // Don't render anything, this is just for redirection
  return null
}