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
import { Logo } from "@/components/logo"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { TagSelector } from "@/components/tag-selector"
import { AgeRangeSelector } from "@/components/age-range-selector"
import { TAGS, GENDERS, GENDER_PREFERENCES, PROXIMITY_OPTIONS } from "@/lib/constants"
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
  const [locationStatus, setLocationStatus] = useState("")
  
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
    gender: "",
    genderPreference: "no-preference",
    proximity: "local",
    preferredAgeMin: 18,
    preferredAgeMax: 40,
    interestTags: [] as string[],
    contextTags: [] as string[],
    intentionTags: [] as string[],
    // Location data
    metro_area: "",
    latitude: 0,
    longitude: 0,
    timezone: "",
  })

  // Get user's location and timezone on component mount
  useEffect(() => {
    // Set timezone
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setFormData(prev => ({ ...prev, timezone: userTimezone }))

    // Get user's location
    if (navigator.geolocation) {
      setLocationStatus("Getting your location...")
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords
          
          try {
            // Use reverse geocoding to get metro area
            const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`)
            const data = await response.json()
            
            const metro_area = data.city || data.locality || data.countryName || "Unknown"
            
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude,
              metro_area
            }))
            setLocationStatus(`Location detected: ${metro_area}`)
          } catch (error) {
            console.error("Error getting location details:", error)
            setFormData(prev => ({
              ...prev,
              latitude,
              longitude,
              metro_area: "Unknown"
            }))
            setLocationStatus("Location detected")
          }
        },
        (error) => {
          console.error("Error getting location:", error)
          setLocationStatus("Location access denied - using defaults")
          setFormData(prev => ({
            ...prev,
            latitude: 0,
            longitude: 0,
            metro_area: "Unknown"
          }))
        }
      )
    } else {
      setLocationStatus("Geolocation not supported - using defaults")
    }
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAgeRangeChange = (minAge: number, maxAge: number) => {
    setFormData((prev) => ({ ...prev, preferredAgeMin: minAge, preferredAgeMax: maxAge }))
  }

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validateDOB = (dob: string) => {
    // Check format DD/MM/YYYY
    const dobRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    const match = dob.match(dobRegex)
    
    if (!match) {
      return { valid: false, message: "Please enter date in DD/MM/YYYY format" }
    }

    const [, day, month, year] = match
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    
    // Check if the date is valid
    if (date.getDate() !== parseInt(day) || 
        date.getMonth() !== parseInt(month) - 1 || 
        date.getFullYear() !== parseInt(year)) {
      return { valid: false, message: "Please enter a valid date" }
    }

    // Check if user is at least 13 years old
    const today = new Date()
    let age = today.getFullYear() - date.getFullYear()
    const monthDiff = today.getMonth() - date.getMonth()
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--
    }

    if (age < 13) {
      return { valid: false, message: "You must be at least 13 years old" }
    }

    if (age > 100) {
      return { valid: false, message: "Please enter a valid birth year" }
    }

    return { valid: true, message: "" }
  }

  const formatDOBForAPI = (dob: string) => {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const [day, month, year] = dob.split('/')
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
    if (currentStep === 1) {
      // Validate first step
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

      setCurrentStep(2)
    } else if (currentStep === 2) {
      // Validate second step
      if (!formData.gender) {
        setError("Please select your gender")
        return
      }

      setCurrentStep(3)
    } else if (currentStep === 3) {
      // Validate third step
      if (formData.interestTags.length === 0) {
        setError("Please select at least one interest")
        return
      }

      setCurrentStep(4)
    } else if (currentStep === 4) {
      // Validate fourth step
      if (formData.contextTags.length === 0) {
        setError("Please select at least one context")
        return
      }

      setCurrentStep(5)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate final step
    if (formData.intentionTags.length === 0) {
      setError("Please select at least one intention")
      return
    }

    setLoading(true)
    setError("")

    try {
      // Prepare data to match API schema - ensure username and email are trimmed
      const registrationData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        password: formData.password,
        nickname: formData.nickname || formData.username.trim(),
        dob: formatDOBForAPI(formData.dob),
        gender: formData.gender,
        genderPreference: formData.genderPreference,
        preferredAgeMin: formData.preferredAgeMin,
        preferredAgeMax: formData.preferredAgeMax,
        proximity: formData.proximity,
        timezone: formData.timezone,
        metro_area: formData.metro_area,
        latitude: formData.latitude,
        longitude: formData.longitude,
        interestTags: formData.interestTags,
        contextTags: formData.contextTags,
        intentionTags: formData.intentionTags,
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

  // Convert readonly TAGS array to mutable array to fix TypeScript error
  const mutableTags = [...TAGS]

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

      <Card className="w-full max-w-2xl bg-black/80 border border-gray-800/50 backdrop-blur-xl shadow-2xl ring-1 ring-white/5 transition-all duration-300 hover:shadow-3xl hover:ring-white/10">
        <CardHeader className="space-y-4 px-8 pt-10 pb-8 relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent"></div>
          <CardTitle className="text-3xl sm:text-4xl font-light text-center text-white tracking-wide">
            Create your account
          </CardTitle>
          <CardDescription className="text-center text-gray-400 text-lg leading-relaxed font-light">
            Step {currentStep} of 5:{" "}
            <span className="text-white font-normal">
              {currentStep === 1
                ? "Basic Information"
                : currentStep === 2
                  ? "Preferences"
                  : currentStep === 3
                    ? "Your Interests"
                    : currentStep === 4
                      ? "Your Context"
                      : "Your Intentions"}
            </span>
          </CardDescription>
          {locationStatus && (
            <p className="text-sm text-center text-gray-500 italic">{locationStatus}</p>
          )}
        </CardHeader>
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-7">
            {error && (
              <div className="rounded-xl bg-red-900/20 p-5 border border-red-700/30 backdrop-blur-sm ring-1 ring-red-500/20">
                <p className="text-sm text-red-300 text-center font-medium">{error}</p>
              </div>
            )}
            
            {currentStep === 1 && (
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
                  <Label htmlFor="nickname" className="text-white font-medium text-sm tracking-wide">Nickname <span className="text-gray-500 font-normal">(optional)</span></Label>
                  <Input
                    id="nickname"
                    name="nickname"
                    placeholder="How you'd like to be called"
                    value={formData.nickname}
                    onChange={handleChange}
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
                    placeholder="DD/MM/YYYY"
                    value={formData.dob}
                    onChange={handleChange}
                    required
                    className={`bg-gray-900/60 border border-gray-700/50 text-white placeholder:text-gray-500 h-14 text-base rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 hover:border-gray-600/70 backdrop-blur-sm ${dobError ? "border-red-500/70 focus:ring-red-500/50" : ""}`}
                    maxLength={10}
                  />
                  {dobError && <p className="text-sm text-red-400 font-medium">{dobError}</p>}
                  <p className="text-sm text-gray-500">You must be at least 13 years old to join</p>
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
                <div className="space-y-4">
                  <Label className="text-white font-medium text-sm tracking-wide">Gender</Label>
                  <RadioGroup
                    value={formData.gender}
                    onValueChange={(value) => handleSelectChange("gender", value)}
                    className="grid grid-cols-2 gap-3 sm:grid-cols-3"
                  >
                    {GENDERS.map((gender) => (
                      <div key={gender.id} className="flex items-center space-x-3 bg-gray-900/40 rounded-lg p-3 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-200">
                        <RadioGroupItem value={gender.id} id={`gender-${gender.id}`} className="border-gray-600 text-blue-500" />
                        <Label htmlFor={`gender-${gender.id}`} className="text-white font-medium cursor-pointer flex-1">{gender.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-white">I'd like to connect with</Label>
                  <RadioGroup
                    value={formData.genderPreference}
                    onValueChange={(value) => handleSelectChange("genderPreference", value)}
                    className="grid grid-cols-3 gap-2"
                  >
                    {GENDER_PREFERENCES.map((pref) => (
                      <div key={pref.id} className="flex items-center space-x-2">
                        <RadioGroupItem value={pref.id} id={`pref-${pref.id}`} />
                        <Label htmlFor={`pref-${pref.id}`} className="text-white">{pref.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                <AgeRangeSelector 
                  minAge={formData.preferredAgeMin} 
                  maxAge={formData.preferredAgeMax} 
                  onChange={handleAgeRangeChange} 
                />

                <div className="space-y-2">
                  <Label className="text-white">Proximity of recommendations</Label>
                  <Select value={formData.proximity} onValueChange={(value) => handleSelectChange("proximity", value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Select proximity" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROXIMITY_OPTIONS.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-medium text-white">Select your interests</h3>
                  <p className="mb-4 text-sm text-gray-400">Choose up to 5 topics that interest you the most</p>
                  <TagSelector
                    tags={mutableTags}
                    selectedTags={formData.interestTags}
                    onChange={(tags) => setFormData((prev) => ({ ...prev, interestTags: tags }))}
                    maxSelections={5}
                    category="interest"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-medium text-white">What's your context?</h3>
                  <p className="mb-4 text-sm text-gray-400">
                    Select up to 3 situations that describe where you are in life right now
                  </p>
                  <TagSelector
                    tags={mutableTags}
                    selectedTags={formData.contextTags}
                    onChange={(tags) => setFormData((prev) => ({ ...prev, contextTags: tags }))}
                    maxSelections={3}
                    category="context"
                  />
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-medium text-white">
                    What are your intentions?
                  </h3>
                  <p className="mb-4 text-sm text-gray-400">Select up to 3 intentions for using Mirro</p>
                  <TagSelector
                    tags={mutableTags}
                    selectedTags={formData.intentionTags}
                    onChange={(tags) => setFormData((prev) => ({ ...prev, intentionTags: tags }))}
                    maxSelections={3}
                    category="intention"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-8">
              {currentStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevStep}
                  className="rounded-xl bg-gray-900/60 border border-gray-700/50 text-white hover:bg-gray-800/80 hover:border-gray-600/70 px-8 py-3 h-12 font-medium transition-all duration-300 backdrop-blur-sm"
                >
                  Back
                </Button>
              ) : (
                <div></div>
              )}

              {currentStep < 5 ? (
                <Button
                  type="button"
                  onClick={handleNextStep}
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 h-12 font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                  disabled={loading}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 h-12 font-medium transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-blue-500/25"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              )}
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