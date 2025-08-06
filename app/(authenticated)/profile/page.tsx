"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

export default function ProfileRedirect() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading session
    
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (session?.user?.id) {
      // Redirect to the user-specific profile page
      router.push(`/profile/${session.user.id}`)
    }
  }, [session, status, router])

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return null // Component will redirect
}