"use client"

import Link from "next/link"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"

export function LandingNav() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="hidden md:flex items-center gap-4">
        <div className="w-16 h-8 bg-cyan-300/20 rounded-full animate-pulse" />
        <div className="w-20 h-8 bg-cyan-300/20 rounded-full animate-pulse" />
      </div>
    )
  }

  if (session) {
    return (
      <div className="hidden md:flex items-center gap-4">
        <Link href="/feed">
          <Button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full text-white font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all transform hover:translate-y-[-2px]">
            Go to App
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          className="px-6 py-2 text-cyan-300 border border-cyan-300/30 rounded-full hover:bg-cyan-900/20 transition-all"
          onClick={() => signOut()}
        >
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <div className="hidden md:flex items-center gap-4">
      <Link href="/login">
        <Button variant="ghost" className="px-6 py-2 text-cyan-300 border border-cyan-300/30 rounded-full hover:bg-cyan-900/20 transition-all">
          Login
        </Button>
      </Link>
      <Link href="/signup">
        <Button className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full text-white font-medium hover:shadow-lg hover:shadow-cyan-500/30 transition-all transform hover:translate-y-[-2px]">
          Sign Up
        </Button>
      </Link>
    </div>
  )
}