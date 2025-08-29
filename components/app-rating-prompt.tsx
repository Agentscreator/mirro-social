"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Star, X, Heart } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface AppRatingPromptProps {
  onRate?: () => void
  onRemindLater?: () => void
  onDismiss?: () => void
}

export function AppRatingPrompt({ onRate, onRemindLater, onDismiss }: AppRatingPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false)
  const [hasRated, setHasRated] = useState(false)

  useEffect(() => {
    // Check if user has already rated or dismissed
    const hasRatedBefore = localStorage.getItem('app-rated') === 'true'
    const lastDismissed = localStorage.getItem('rating-dismissed')
    const lastReminded = localStorage.getItem('rating-reminded')
    
    if (hasRatedBefore) {
      setHasRated(true)
      return
    }

    // Show prompt after some app usage (simulate with timeout)
    const shouldShow = () => {
      // Don't show if dismissed recently (within 7 days)
      if (lastDismissed) {
        const dismissedDate = new Date(lastDismissed)
        const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceDismissed < 7) return false
      }

      // Don't show if reminded recently (within 3 days)
      if (lastReminded) {
        const remindedDate = new Date(lastReminded)
        const daysSinceReminded = (Date.now() - remindedDate.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceReminded < 3) return false
      }

      return true
    }

    if (shouldShow()) {
      // Show after 5 seconds of app usage
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [])

  const handleRate = () => {
    localStorage.setItem('app-rated', 'true')
    setHasRated(true)
    setShowPrompt(false)
    
    // Open app store for rating
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isAndroid = /Android/.test(navigator.userAgent)
    
    if (isIOS) {
      // Open iOS App Store
      window.open('https://apps.apple.com/app/mirro-social/id123456789', '_blank')
    } else if (isAndroid) {
      // Open Google Play Store
      window.open('https://play.google.com/store/apps/details?id=com.mirro.social', '_blank')
    } else {
      // Web version - could open a feedback form
      window.open('mailto:feedback@mirro.app?subject=App Feedback', '_blank')
    }
    
    onRate?.()
  }

  const handleRemindLater = () => {
    localStorage.setItem('rating-reminded', new Date().toISOString())
    setShowPrompt(false)
    onRemindLater?.()
  }

  const handleDismiss = () => {
    localStorage.setItem('rating-dismissed', new Date().toISOString())
    setShowPrompt(false)
    onDismiss?.()
  }

  if (hasRated || !showPrompt) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 max-w-sm w-full">
            <CardContent className="p-6 text-center">
              <div className="flex justify-end mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="text-gray-400 hover:text-white w-6 h-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mb-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Loving Mirro?
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Your feedback helps us improve and reach more people who would love connecting on Mirro!
                </p>
              </div>

              <div className="flex justify-center mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-6 h-6 text-yellow-400 fill-current mx-1"
                  />
                ))}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleRate}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium"
                >
                  Rate App
                </Button>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRemindLater}
                    className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 text-sm"
                  >
                    Remind Me Later
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleDismiss}
                    className="flex-1 text-gray-400 hover:text-white text-sm"
                  >
                    No Thanks
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}