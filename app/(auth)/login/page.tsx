//app/(auth)/login/page.tsx

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn, signOut, useSession } from "next-auth/react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import { isMobileApp, mobileLogin, setMobileAuthToken } from "@/src/lib/mobile-auth"

export default function LoginPage() {
  const router = useRouter()
  const { data: session } = useSession()
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
      
      // For web users: clear any existing session to force fresh login
      if (!mobile && session) {
        console.log('🌐 Web user with existing session on login page, clearing session')
        try {
          await signOut({ 
            redirect: false,
            callbackUrl: '/login' 
          })
          // Clear local storage tokens
          localStorage.removeItem('mirro_auth_token')
          localStorage.removeItem('next-auth.session-token')
          localStorage.removeItem('__Secure-next-auth.session-token')
          console.log('✅ Web session cleared on login page')
        } catch (error) {
          console.error('❌ Error clearing web session on login page:', error)
        }
      }
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
  }, [session])

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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 silver-pattern">
      {/* Only show the home link in web mode */}
      {!isMobile && (
        <Link href="/" className="absolute left-4 top-4 flex items-center gap-2">
          <Logo size="sm" />
          <span className="text-lg font-bold blue-text">Mirro</span>
        </Link>
      )}

      <Card className="w-full max-w-md premium-card">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center blue-text">Welcome back</CardTitle>
          <CardDescription className="text-center premium-subheading">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 border border-red-200">
                <p className="text-sm text-red-600 text-center">{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Input
                name="identifier"
                type="text"
                placeholder="Username or Email"
                value={formData.identifier}
                onChange={handleChange}
                required
                className="premium-input"
                disabled={loading}
                onBlur={(e) => {
                  const trimmed = e.target.value.trim()
                  if (trimmed !== e.target.value) {
                    setFormData(prev => ({ ...prev, identifier: trimmed }))
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="premium-input pr-10"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  disabled={loading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <div className="text-right">
                <Link
                  href="/reset-password"
                  className="text-xs premium-text-muted hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
            <Button type="submit" className="w-full premium-button" disabled={loading}>
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <div className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="premium-link">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}