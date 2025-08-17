"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { 
  Menu, 
  X, 
  Settings, 
  LogOut, 
  Bell,
  User
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfileHamburgerMenuProps {
  className?: string
}

export function ProfileHamburgerMenu({ className }: ProfileHamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  const menuItems = [
    {
      icon: Settings,
      label: "Settings",
      href: "/settings",
      description: "Account settings"
    },
    {
      icon: Bell,
      label: "Notifications",
      href: "/notifications",
      description: "Notification preferences"
    }
  ]

  const handleNavigation = (href: string) => {
    setIsOpen(false)
    router.push(href)
  }


  const handleLogout = async () => {
    setIsOpen(false)
    await signOut({ callbackUrl: "/auth/login" })
  }

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed top-4 right-4 z-40 h-10 w-10 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 hover:bg-black/30 text-white transition-all duration-200",
          className
        )}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Menu Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          {/* Menu Container */}
          <div className="bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">Profile Menu</h3>
                  <p className="text-gray-400 text-sm">{session?.user?.name || "User"}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="text-white hover:bg-white/10 rounded-full w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Menu Content */}
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Menu Items */}
              <div className="p-4">
                <div className="space-y-1">
                  {menuItems.map((item) => (
                    <button
                      key={item.href}
                      onClick={() => handleNavigation(item.href)}
                      className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors group"
                    >
                      <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center group-hover:bg-white/10 transition-colors">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{item.label}</div>
                        <div className="text-xs text-gray-400">{item.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Logout */}
              <div className="p-4 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors group"
                >
                  <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="font-medium">Log Out</div>
                    <div className="text-xs text-red-300/70">Sign out of your account</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}