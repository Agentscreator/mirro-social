"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function LandingNav() {
  // For web users: always show Login/Sign Up buttons regardless of authentication status
  // The individual auth pages will handle session clearing
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