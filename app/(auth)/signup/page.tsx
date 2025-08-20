//app/(auth)/signup/page.tsx

"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo, MirroIcon } from "@/components/logo"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff } from "lucide-react"
import { isMobileApp } from "@/src/lib/mobile-auth"

export default function SignupPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [emailError, setEmailError] = useState("")
  const [usernameError, setUsernameError] = useState("")
  const [dobError, setDobError] = useState("")
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    username: "",
    nickname: "",
    email: "",
    password: "",
    confirmPassword: "",
    dob: "",
    timezone: "",
  })

  // Get user's timezone on component mount
  useEffect(() => {
    // Set timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setFormData(prev => ({ ...prev, timezone: userTimezone }))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    
    // Apply automatic trimming for username and email fields
    let processedValue = value
    if (name === "username" || name === "email") {
      processedValue = value.trim()
    }
    
    setFormData((prev) => ({ ...prev, [name]: processedValue }))

    // Clear errors when typing
    if (name === "email") {
      setEmailError("")
    }
    if (name === "username") {
      setUsernameError("")
    }
    if (name === "dob") {
      setDobError("")
    }
    setError("")
  }


  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateDOB = (dob: string) => {
    // Check format MM/DD/YYYY
    const dobRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const match = dob.match(dobRegex)
    
    if (!match) {
      return { valid: false, message: "Please enter date in MM/DD/YYYY format" }
    }

    const [, month, day, year] = match
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    // Check if the date is valid
    if (date.getDate() !== parseInt(day) || 
        date.getMonth() !== parseInt(month) - 1 || 
        date.getFullYear() !== parseInt(year)) {
      return { valid: false, message: "Please enter a valid date" }
    }

    // Check if user is at least 16 years old
    const today = new Date()
    let age = today.getFullYear() - date.getFullYear()
    const monthDiff = today.getMonth() - date.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--
    }

    if (age < 16) {
      return { valid: false, message: "You must be at least 16 years old" }
    }

    if (age > 100) {
      return { valid: false, message: "Please enter a valid birth year" }
    }

    return { valid: true, message: "" }
  }

  const formatDOBForAPI = (dob: string) => {
    // Convert MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = dob.split('/')
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  }

  const checkUsernameUnique = async (username: string) => {
    try {
      const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`)
      const data = await response.json()
      return data.available
    } catch (error) {
      console.error("Error checking username:", error)
      return true
    }
  }

  const handleNextStep = async () => {
    // Validate the single step
    if (!formData.nickname.trim()) {
      setError("Please enter a nickname")
      return
    }

    if (!validateEmail(formData.email)) {
      setEmailError("Please enter a valid email address")
      return
    }

    // Check username uniqueness
    if (formData.username) {
      const isUsernameAvailable = await checkUsernameUnique(formData.username)
      if (!isUsernameAvailable) {
        setUsernameError("This username is already taken")
        return
      }
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    const dobValidation = validateDOB(formData.dob)
    if (!dobValidation.valid) {
      setDobError(dobValidation.message)
      return
    }

    // Submit the form directly since we only have one step
    handleSubmit(new Event('submit') as any)
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError("")

    try {
      // Prepare data to match API schema - ensure username and email are trimmed
      const registrationData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        nickname: formData.nickname.trim(),
        dob: formatDOBForAPI(formData.dob),
        timezone: formData.timezone,
      }

      console.log('Sending registration data:', registrationData)

      // Register user
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      })

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('Failed to parse response as JSON:', jsonError)
        throw new Error('Server returned invalid response')
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to register")
      }

      // Auto-login after successful registration
      const result = await signIn("credentials", {
        email: formData.email.trim(),
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error("Failed to login after registration")
      }

      // Redirect to feed page
      router.push("/feed")
      router.refresh()
    } catch (error) {
      console.error("Registration error:", error)
      setError(error instanceof Error ? error.message : "An error occurred during registration")
      setLoading(false)
    }
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
            <MirroIcon size="lg" />
          </div>
        </div>
      </div>

      <Card className="w-full max-w-2xl bg-black/80 border border-gray-800/50 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 transition-all duration-300 hover:shadow-3xl hover:ring-white/10">
        <CardHeader className="space-y-4 px-8 pt-10 pb-8 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
          <CardTitle className="text-3xl sm:text-4xl font-light text-center text-white tracking-wide">
            Create your account
          </CardTitle>
          <CardDescription className="text-center text-gray-400 text-lg leading-relaxed font-light">
            Get started with your basic information
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="rounded-xl bg-red-900/20 p-5 border border-red-700/30 backdrop-blur-sm ring-1 ring-red-500/20">
                <p className="text-sm text-red-300 text-center font-medium">{error}</p>
              </div>
            )}
            
            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="username" className="text-white font-medium text-sm tracking-wide">Username</Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="Choose your unique username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  className={`bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm ${usernameError ? "border-red-500/70 focus:ring-red-500/50" : ""}`}
                />
                {usernameError && <p className="text-sm text-red-400 font-medium">{usernameError}</p>}
              </div>
              <div className="space-y-3">
                <Label htmlFor="nickname" className="text-white font-medium text-sm tracking-wide">Nickname</Label>
                <Input
                  id="nickname"
                  name="nickname"
                  placeholder="How you'd like to be called"
                  value={formData.nickname}
                  onChange={handleChange}
                  required
                  className="bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-white font-medium text-sm tracking-wide">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className={`bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm ${emailError ? "border-red-500/70 focus:ring-red-500/50" : ""}`}
                />
                {emailError && <p className="text-sm text-red-400 font-medium">{emailError}</p>}
              </div>
              <div className="space-y-3">
                <Label htmlFor="dob" className="text-white font-medium text-sm tracking-wide">Date of Birth</Label>
                <Input
                  id="dob"
                  name="dob"
                  placeholder="MM/DD/YYYY"
                  value={formData.dob}
                  onChange={handleChange}
                  required
                  className={`bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm ${dobError ? "border-red-500/70 focus:ring-red-500/50" : ""}`}
                  maxLength={10}
                />
                {dobError && <p className="text-sm text-red-400 font-medium">{dobError}</p>}
                <p className="text-sm text-gray-500">You must be at least 16 years old to join</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-white font-medium text-sm tracking-wide">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password (min 6 characters)"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm pr-12"
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-white transition-colors duration-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-white font-medium text-sm tracking-wide">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm pr-12"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-white transition-colors duration-200"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <Button
                type="button"
                onClick={handleNextStep}
                className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-12 py-3 h-12 font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25 w-full"
                disabled={loading}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-6 px-8 pb-8 pt-6">
          <div className="relative">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-700/30 to-transparent"></div>
          </div>
          <div className="text-center text-sm text-gray-500 leading-relaxed">
            By creating an account, you agree to our{" "}
            <Link href="/terms" className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline underline-offset-2">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors duration-200 underline underline-offset-2">
              Privacy Policy
            </Link>
          </div>
          <div className="text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-400 hover:text-blue-300 transition-colors duration-200 font-medium underline underline-offset-2">
              Sign in here
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}