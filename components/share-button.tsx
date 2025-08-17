"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Share2, 
  Link2, 
  Twitter, 
  Facebook, 
  MessageCircle,
  Copy,
  X,
  ExternalLink,
  Instagram,
  Linkedin
} from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface ShareButtonProps {
  postId: number
  content: string
  userDisplayName: string
  className?: string
  variant?: "ghost" | "outline" | "default"
  size?: "sm" | "default" | "lg" | "icon"
  showCount?: boolean
}

interface ShareData {
  url: string
  title: string
  text: string
  shareId: string
}

export function ShareButton({ 
  postId, 
  content, 
  userDisplayName, 
  className = "",
  variant = "ghost",
  size = "icon",
  showCount = false
}: ShareButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [shareData, setShareData] = useState<ShareData | null>(null)

  const createShareLink = async () => {
    if (shareData) return shareData

    setIsLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const data = await response.json()
      setShareData(data)
      return data
    } catch (error) {
      console.error('Error creating share link:', error)
      toast({
        title: "Error",
        description: "Failed to create share link. Please try again.",
        variant: "destructive",
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    const data = await createShareLink()
    if (!data) return

    // Try native share first (mobile devices)
    if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: data.title,
          text: data.text,
          url: data.url,
        })
        return
      } catch (shareError) {
        console.log("Native share failed, showing share menu")
      }
    }

    // Show share menu for desktop or if native share fails
    setShowShareMenu(true)
  }

  const copyToClipboard = async (url: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = url
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }
      
      toast({
        title: "Link Copied!",
        description: "Share link has been copied to your clipboard",
      })
      setShowShareMenu(false)
    } catch (err) {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the link",
        variant: "destructive",
      })
    }
  }

  const shareToTwitter = (data: ShareData) => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.text)}&url=${encodeURIComponent(data.url)}`
    window.open(twitterUrl, '_blank', 'width=550,height=420')
    setShowShareMenu(false)
  }

  const shareToFacebook = (data: ShareData) => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.url)}&quote=${encodeURIComponent(data.text)}`
    window.open(facebookUrl, '_blank', 'width=550,height=420')
    setShowShareMenu(false)
  }

  const shareToWhatsApp = (data: ShareData) => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${data.text} ${data.url}`)}`
    window.open(whatsappUrl, '_blank')
    setShowShareMenu(false)
  }

  const shareToTelegram = (data: ShareData) => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(data.url)}&text=${encodeURIComponent(data.text)}`
    window.open(telegramUrl, '_blank')
    setShowShareMenu(false)
  }

  const shareToLinkedIn = (data: ShareData) => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(data.url)}&title=${encodeURIComponent(data.title)}&summary=${encodeURIComponent(data.text)}`
    window.open(linkedinUrl, '_blank', 'width=550,height=420')
    setShowShareMenu(false)
  }

  const shareToInstagram = async (data: ShareData) => {
    // Instagram doesn't have direct web sharing, but we can use different approaches
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    
    // Copy the link silently
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(data.url)
      } else {
        // Fallback for older browsers
        const textArea = document.createElement("textarea")
        textArea.value = data.url
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand("copy")
        document.body.removeChild(textArea)
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
    
    if (isMobile) {
      // Try to open Instagram app on mobile devices
      const instagramUrl = 'instagram://camera'
      
      // Try to open Instagram app
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = instagramUrl
      document.body.appendChild(iframe)
      
      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(iframe)
      }, 1000)
      
      toast({
        title: "Ready for Instagram!",
        description: "Link copied! Instagram should open - paste the link in your story or post.",
        duration: 5000,
      })
    } else {
      // On desktop: copy link and show instructions
      toast({
        title: "Ready for Instagram!",
        description: "Link copied! Open Instagram on your phone and paste it in your story or post.",
        duration: 5000,
      })
    }
    setShowShareMenu(false)
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleShare}
        disabled={isLoading}
        className={`transition-all duration-200 ${className}`}
      >
        <Share2 className={`${size === 'icon' ? 'w-5 h-5' : 'w-4 h-4'}`} />
        {showCount && size !== 'icon' && <span className="ml-1">Share</span>}
      </Button>

      {/* Share Menu Overlay */}
      {showShareMenu && shareData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-semibold text-lg">Share Post</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowShareMenu(false)}
                className="text-white hover:bg-white/10 rounded-full w-8 h-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Share Options */}
            <div className="space-y-3">
              {/* Copy Link */}
              <button
                onClick={() => copyToClipboard(shareData.url)}
                className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                  <Copy className="w-5 h-5" />
                </div>
                <span className="font-medium">Copy Link</span>
              </button>

              {/* Twitter */}
              <button
                onClick={() => shareToTwitter(shareData)}
                className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Twitter className="w-5 h-5" />
                </div>
                <span className="font-medium">Share to Twitter</span>
              </button>

              {/* Facebook */}
              <button
                onClick={() => shareToFacebook(shareData)}
                className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                  <Facebook className="w-5 h-5" />
                </div>
                <span className="font-medium">Share to Facebook</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => shareToLinkedIn(shareData)}
                className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
                  <Linkedin className="w-5 h-5" />
                </div>
                <span className="font-medium">Share to LinkedIn</span>
              </button>

              {/* Instagram */}
              <button
                onClick={() => shareToInstagram(shareData)}
                className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Instagram className="w-5 h-5" />
                </div>
                <span className="font-medium">Share to Instagram</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={() => shareToWhatsApp(shareData)}
                className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <span className="font-medium">Share to WhatsApp</span>
              </button>

              {/* Telegram */}
              <button
                onClick={() => shareToTelegram(shareData)}
                className="w-full flex items-center gap-3 p-3 text-white hover:bg-white/10 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                  <ExternalLink className="w-5 h-5" />
                </div>
                <span className="font-medium">Share to Telegram</span>
              </button>
            </div>

            {/* Share URL Preview */}
            <div className="mt-6 p-3 bg-white/5 border border-white/10 rounded-xl">
              <p className="text-white/70 text-xs mb-1">Share URL:</p>
              <p className="text-white text-sm font-mono break-all">{shareData.url}</p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}