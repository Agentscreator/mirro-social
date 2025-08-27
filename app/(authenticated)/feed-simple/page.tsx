"use client"

import { useSession } from "next-auth/react"

export default function SimpleFeedPage() {
  const { data: session } = useSession()

  if (!session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Simple Feed Page</h1>
        <p>This is a simplified feed page to test if the route works.</p>
        <p>User: {session.user?.email}</p>
      </div>
    </div>
  )
}