"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Bell, LogOut, Loader2, ArrowLeft, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DeleteAccountDialog } from "@/components/delete-account-dialog"
import { useToast } from "@/hooks/use-toast"

interface UserData {
  id: string
  username: string
  nickname?: string
  email: string
  metro_area: string
  image?: string
  profileImage?: string
}



export default function SettingsPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userData, setUserData] = useState<UserData | null>(null)
  const [notifications, setNotifications] = useState(true)
  const [scrollY, setScrollY] = useState(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    nickname: "",
    username: "",
  })


  // Handle scroll for transparency effect
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Fetch user data and tags
  useEffect(() => {
    if (status === "loading") return
    if (!session?.user?.id) {
      router.push("/auth/login")
      return
    }

    fetchUserData()
  }, [session, status, router])

  const fetchUserData = async () => {
    try {
      // Use the new settings endpoint
      const response = await fetch("/api/users/settings")
      if (!response.ok) throw new Error("Failed to fetch user data")

      const data = await response.json()

      if (data.success && data.user) {
        setUserData(data.user)

        // Set form data with proper defaults
        setFormData({
          nickname: data.user.nickname || "",
          username: data.user.username || "",
        })
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
      toast({
        title: "Error",
        description: "Failed to load user data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Use the new settings endpoint
      const response = await fetch("/api/users/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update profile")
      }

      const data = await response.json()
      if (data.success) {
        toast({
          title: "Success",
          description: "Settings updated successfully",
        })
        // Refresh user data
        await fetchUserData()
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/auth/login" })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="text-center">
        <p>Failed to load user data</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    )
  }

  // Calculate opacity based on scroll position
  const buttonOpacity = Math.max(0.7, 1 - scrollY / 300)

  return (
    <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="rounded-full hover:bg-gray-800 text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Account Settings</h1>
      </div>

      <div className="space-y-6 pb-40 md:pb-24">
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Profile Information</CardTitle>
            <CardDescription className="text-gray-300">Update your basic profile information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-white">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname" className="text-white">Nickname</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => handleInputChange("nickname", e.target.value)}
                placeholder="How you'd like to be called"
                className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>

          </CardContent>
        </Card>


        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Notifications</CardTitle>
            <CardDescription className="text-gray-300">Manage your notification preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-blue-500" />
                  <Label htmlFor="notifications" className="text-white">
                    Enable notifications
                  </Label>
                </div>
                <Switch
                  id="notifications"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                  className="premium-switch"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Account</CardTitle>
            <CardDescription className="text-gray-300">Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="destructive" className="w-full rounded-full" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log Out
            </Button>
            
            <div className="pt-4 border-t border-gray-700">
              <div className="space-y-3">
                <div>
                  <h4 className="text-white font-medium mb-1">Danger Zone</h4>
                  <p className="text-gray-400 text-sm mb-3">
                    Permanently delete your account and all of your data. This action cannot be undone.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full rounded-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-400"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Floating Save Button - Above Navigation */}
      <div className="fixed bottom-16 left-0 right-0 z-[60] pointer-events-none md:bottom-6 md:left-20 md:right-4">
        <div className="pointer-events-auto transition-all duration-300 ease-out" style={{ opacity: buttonOpacity }}>
          {/* Background blur overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent backdrop-blur-sm" />

          {/* Button container */}
          <div className="relative px-4 py-4 md:px-8 md:py-6">
            <div className="mx-auto max-w-sm">
              <Button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl border border-blue-100/20 transition-all duration-200 hover:shadow-2xl hover:scale-[1.02] disabled:hover:scale-100"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <span className="font-semibold">Save Changes</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Dialog */}
      <DeleteAccountDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}
