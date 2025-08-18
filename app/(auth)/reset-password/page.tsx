//app/(auth)/reset-password/page.tsx

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { useSession } from "next-auth/react"

export default function ResetPasswordPage() {
  const { data: session } = useSession()
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Use the user's email from session if they're logged in
  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email)
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Trim the email to remove any whitespace
      const trimmedEmail = email.trim()
      
      // Basic email validation
      if (!trimmedEmail.includes("@")) {
        setError("Please enter a valid email address")
        setLoading(false)
        return
      }

      // Call your reset password API endpoint
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
        }),
      })

      if (response.ok) {
        setSuccess(true)
      } else {
        const data = await response.json()
        setError(data.error || "An error occurred while sending the reset email")
      }
    } catch (error) {
      console.error("Reset password error:", error)
      setError("An error occurred while sending the reset email")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-black via-gray-950 to-black">
        <Link href="/" className="absolute left-4 top-4 sm:left-6 sm:top-6 flex items-center gap-2 z-10 group">
          <div className="transition-all duration-300 group-hover:scale-105">
            <Logo size="sm" />
          </div>
        </Link>

        <Card className="w-full max-w-md bg-black/80 border border-gray-800/50 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 transition-all duration-300 hover:shadow-3xl hover:ring-white/10">
          <CardHeader className="space-y-4 px-8 pt-10 pb-8 relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-400" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-light text-center text-white tracking-wide">Check your email</CardTitle>
            <CardDescription className="text-center text-gray-400 text-lg leading-relaxed font-light">
              We've sent password reset instructions to <strong className="text-white">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-4">
            <div className="text-center text-sm text-gray-400">
              <p>Didn't receive the email? Check your spam folder or</p>
              <button
                onClick={() => {
                  setSuccess(false)
                  setEmail("")
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium underline underline-offset-2"
              >
                try again
              </button>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center px-8 pb-8 pt-6">
            <div className="relative w-full">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"></div>
              <div className="text-center pt-6">
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium underline underline-offset-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-black via-gray-950 to-black">
      <Link href="/" className="absolute left-4 top-4 sm:left-6 sm:top-6 flex items-center gap-2 z-10 group">
        <div className="transition-all duration-300 group-hover:scale-105">
          <Logo size="sm" />
        </div>
      </Link>

      {/* Mobile-optimized logo at top */}
      <div className="mb-8 sm:mb-12 transition-all duration-500 ease-out">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-xl rounded-full scale-150"></div>
          <div className="relative">
            <Logo size="lg" />
          </div>
        </div>
      </div>

      <Card className="w-full max-w-md bg-black/80 border border-gray-800/50 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 transition-all duration-300 hover:shadow-3xl hover:ring-white/10">
        <CardHeader className="space-y-4 px-8 pt-10 pb-8 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
          <div className="flex justify-center mb-4">
            <Mail className="h-16 w-16 text-blue-400" />
          </div>
          <CardTitle className="text-3xl sm:text-4xl font-light text-center text-white tracking-wide">Reset your password</CardTitle>
          <CardDescription className="text-center text-gray-400 text-lg leading-relaxed font-light">
            {session?.user?.email 
              ? "We'll send a password reset link to your account email" 
              : "Enter your email address and we'll send you a link to reset your password"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="rounded-xl bg-red-900/20 p-5 border border-red-700/30 backdrop-blur-sm ring-1 ring-red-500/20">
                <p className="text-sm text-red-300 text-center font-medium">{error}</p>
              </div>
            )}
            <div className="space-y-3">
              {session?.user?.email ? (
                <div className="bg-gray-900/40 border border-gray-700/50 text-white h-14 text-base rounded-xl flex items-center px-4 backdrop-blur-sm">
                  <span className="text-gray-300">Sending reset link to: </span>
                  <span className="ml-2 text-white font-medium">{session.user.email}</span>
                </div>
              ) : (
                <Input
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm"
                  disabled={loading}
                  onBlur={(e) => {
                    const trimmed = e.target.value.trim()
                    if (trimmed !== e.target.value) {
                      setEmail(trimmed)
                    }
                  }}
                />
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-14 text-base font-medium rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
              disabled={loading || (!session?.user?.email && !email.trim())}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Sending...
                </div>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center px-8 pb-8 pt-6">
          <div className="relative w-full">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"></div>
            <div className="text-center pt-6">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium underline underline-offset-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}