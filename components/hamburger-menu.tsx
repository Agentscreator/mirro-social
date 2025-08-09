"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Menu, Settings, HelpCircle, LogOut, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface HamburgerMenuProps {
  className?: string
}

export function HamburgerMenu({ className }: HamburgerMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const handleAccountSettings = () => {
    router.push("/settings")
    setIsOpen(false)
  }

  const handleNotifications = () => {
    router.push("/notifications")
    setIsOpen(false)
  }

  const handleHelpSupport = () => {
    router.push("/help")
    setIsOpen(false)
  }

  const handleLogout = async () => {
    setIsOpen(false)
    await signOut({ callbackUrl: "/login" })
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 rounded-full hover:bg-gray-800 text-white transition-all duration-200", className)}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-gray-900/95 backdrop-blur-xl border-gray-700/50 shadow-xl rounded-xl"
        sideOffset={8}
      >
        <DropdownMenuItem
          onClick={handleNotifications}
          className="flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 cursor-pointer rounded-lg mx-1 my-1"
        >
          <Bell className="h-4 w-4 text-blue-400" />
          <span className="font-medium">Notifications</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleAccountSettings}
          className="flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 cursor-pointer rounded-lg mx-1 my-1"
        >
          <Settings className="h-4 w-4 text-blue-400" />
          <span className="font-medium">Account Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleHelpSupport}
          className="flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 cursor-pointer rounded-lg mx-1 my-1"
        >
          <HelpCircle className="h-4 w-4 text-blue-400" />
          <span className="font-medium">Help/Support</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-2 bg-gray-700/50" />

        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-900/50 cursor-pointer rounded-lg mx-1 my-1"
        >
          <LogOut className="h-4 w-4" />
          <span className="font-medium">Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}