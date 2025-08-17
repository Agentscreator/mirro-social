//app/(auth)/login/page.tsx

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { isMobileApp, mobileLogin, setMobileAuthToken } from "@/src/lib/mobile-auth"

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    identifier: "", // Can be either email or username
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = async () => {
      const mobile = await isMobileApp()
      setIsMobile(mobile)
      console.log('📱 Mobile app detected on login page:', mobile)
    }
    checkMobile()
    
    // Check for error parameters from middleware
    const urlParams = new URLSearchParams(window.location.search)
    const errorParam = urlParams.get('error')
    if (errorParam) {
      switch (errorParam) {
        case 'config':
          setError('Configuration error. Please contact support.')
          break
        case 'middleware':
          setError('Authentication service temporarily unavailable. Please try again.')
          break
        default:
          setError('An authentication error occurred.')
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const trimmedIdentifier = formData.identifier.trim()
      const isEmail = trimmedIdentifier.includes("@")
      
      console.log('🔐 Login attempt:', { 
        identifier: trimmedIdentifier, 
        isEmail, 
        isMobile,
        timestamp: new Date().toISOString()
      })
      
      // Use NextAuth for both web and mobile for consistency
      const result = await signIn("credentials", {
        email: isEmail ? trimmedIdentifier : "",
        username: isEmail ? "" : trimmedIdentifier,
        password: formData.password,
        redirect: false,
      })

      console.log('🔐 Login result:', { 
        ok: result?.ok, 
        error: result?.error,
        url: result?.url
      })

      if (result?.error) {
        console.error('❌ Login failed:', result.error)
        // Provide more specific error messages
        switch (result.error) {
          case 'CredentialsSignin':
            setError("Invalid email/username or password")
            break
          case 'Configuration':
            setError("Authentication service configuration error. Please try again later.")
            break
          default:
            setError("Invalid email/username or password")
        }
      } else if (result?.ok) {
        console.log('✅ Login successful')
        
        // Store session info for mobile apps if needed
        if (isMobile) {
          setMobileAuthToken('authenticated')
          console.log('📱 Mobile auth token stored')
        }
        
        // Check for callback URL
        const urlParams = new URLSearchParams(window.location.search)
        const callbackUrl = urlParams.get('callbackUrl')
        const redirectUrl = callbackUrl || "/feed"
        
        console.log('🔄 Redirecting to:', redirectUrl)
        router.push(redirectUrl)
        router.refresh()
      } else {
        console.error('❌ Login failed: Unknown error')
        setError("Login failed. Please try again.")
      }
    } catch (error) {
      console.error("❌ Login error:", error)
      setError("An error occurred during login. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-black via-gray-950 to-black">
      {/* Only show the home link in web mode */}
      {!isMobile && (
        <Link href="/" className="absolute left-4 top-4 sm:left-6 sm:top-6 flex items-center gap-2 z-10 group">
          <div className="transition-all duration-300 group-hover:scale-105">
            <Logo size="sm" />
          </div>
        </Link>
      )}

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
          <CardTitle className="text-3xl sm:text-4xl font-light text-center text-white tracking-wide">Welcome back</CardTitle>
          <CardDescription className="text-center text-gray-400 text-lg leading-relaxed font-light">
            Enter your credentials to access your account
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
              <Input
                name="identifier"
                type="text"
                placeholder="Username or Email"
                value={formData.identifier}
                onChange={handleChange}
                required
                className="bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm"
                disabled={loading}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim()
                  if (trimmed !== e.target.value) {
                    setFormData(prev => ({ ...prev, identifier: trimmed }))
                  }
                }}
              />
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-white transition-colors duration-200"
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <Link
                  href="/reset-password"
                  className="text-sm text-gray-500 hover:text-blue-400 transition-colors duration-200 underline underline-offset-2"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-14 text-base font-medium rounded-xl shadow-lg hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Logging in...
                </div>
              ) : (
                "Log in"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center px-8 pb-8 pt-6">
          <div className="relative w-full">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"></div>
            <div className="text-center text-sm text-gray-400 pt-6">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium underline underline-offset-2">
                Sign up here
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}