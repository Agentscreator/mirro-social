"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

interface NewMessageIndicatorProps {
  messageCount: number
  onScrollToBottom: () => void
}

export function NewMessageIndicator({ messageCount, onScrollToBottom }: NewMessageIndicatorProps) {
  const [previousCount, setPreviousCount] = useState(messageCount)
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    if (messageCount > previousCount) {
      setShowIndicator(true)
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => setShowIndicator(false), 5000)
      return () => clearTimeout(timer)
    }
    setPreviousCount(messageCount)
  }, [messageCount, previousCount])

  const handleClick = () => {
    onScrollToBottom()
    setShowIndicator(false)
  }

  if (!showIndicator) return null

  return (
    <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10">
      <Button
        onClick={handleClick}
        className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2 animate-bounce"
      >
        <ChevronDown className="h-4 w-4" />
        New message
      </Button>
    </div>
  )
}