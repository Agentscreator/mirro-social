"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Trash2, X, Eye, EyeOff } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { signOut } from "next-auth/react"

interface DeleteAccountDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const [step, setStep] = useState<'warning' | 'confirm' | 'deleting'>('warning')
  const [confirmText, setConfirmText] = useState('')
  const [showRequiredText, setShowRequiredText] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const requiredText = "DELETE MY ACCOUNT"
  const isConfirmTextValid = confirmText === requiredText

  const handleClose = () => {
    if (isDeleting) return // Prevent closing during deletion
    setStep('warning')
    setConfirmText('')
    setShowRequiredText(false)
    onClose()
  }

  const handleDeleteAccount = async () => {
    if (!isConfirmTextValid) {
      toast({
        title: "Confirmation Required",
        description: `Please type "${requiredText}" exactly to confirm.`,
        variant: "destructive",
      })
      return
    }

    setIsDeleting(true)
    setStep('deleting')

    try {
      const response = await fetch('/api/users/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmText }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Account Deleted",
          description: "Your account and all associated data have been permanently deleted.",
        })
        
        // Sign out and redirect to home page
        await signOut({ callbackUrl: '/' })
      } else {
        throw new Error(data.error || 'Failed to delete account')
      }
    } catch (error) {
      console.error('Account deletion error:', error)
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete account. Please try again.",
        variant: "destructive",
      })
      setStep('confirm')
      setIsDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-500/20 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-white font-semibold text-lg">Delete Account</h3>
          </div>
          {step !== 'deleting' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-white hover:bg-white/10 rounded-full w-8 h-8"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Warning Step */}
        {step === 'warning' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h4 className="text-white font-semibold text-xl mb-2">
                This action cannot be undone
              </h4>
              <p className="text-gray-300 text-sm leading-relaxed">
                Deleting your account will permanently remove all of your data from our servers.
              </p>
            </div>

            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <h5 className="text-red-400 font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                What will be deleted:
              </h5>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>• Your profile and personal information</li>
                <li>• All your posts, videos, and images</li>
                <li>• All your messages and conversations</li>
                <li>• All your albums and shared content</li>
                <li>• Your groups and community memberships</li>
                <li>• All your likes, comments, and interactions</li>
                <li>• Your followers and following connections</li>
                <li>• All notification and activity history</li>
              </ul>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => setStep('confirm')}
                variant="destructive"
                className="w-full rounded-full bg-red-600 hover:bg-red-700"
              >
                I understand, continue
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full rounded-full border-gray-600 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {step === 'confirm' && (
          <div className="space-y-6">
            <div className="text-center">
              <h4 className="text-white font-semibold text-xl mb-2">
                Confirm Account Deletion
              </h4>
              <p className="text-gray-300 text-sm">
                Type the text below exactly to confirm you want to delete your account.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Required confirmation text:</Label>
                <div className="relative">
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 font-mono text-red-400 text-center">
                    {showRequiredText ? requiredText : '••••••••••••••••'}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowRequiredText(!showRequiredText)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 text-gray-400 hover:text-white"
                  >
                    {showRequiredText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-white">Type the confirmation text:</Label>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type the exact text above"
                  className={`bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 font-mono ${
                    confirmText && !isConfirmTextValid ? 'border-red-500' : ''
                  } ${isConfirmTextValid ? 'border-green-500' : ''}`}
                  autoComplete="off"
                />
                {confirmText && !isConfirmTextValid && (
                  <p className="text-red-400 text-xs">Text doesn't match. Please type exactly as shown.</p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleDeleteAccount}
                disabled={!isConfirmTextValid}
                variant="destructive"
                className="w-full rounded-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account Forever
              </Button>
              <Button
                onClick={() => setStep('warning')}
                variant="outline"
                className="w-full rounded-full border-gray-600 text-white hover:bg-gray-800"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Deleting Step */}
        {step === 'deleting' && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <div className="w-8 h-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-xl mb-2">
                Deleting Account...
              </h4>
              <p className="text-gray-300 text-sm">
                Please wait while we permanently delete your account and all associated data.
                This may take a few moments.
              </p>
            </div>
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4">
              <p className="text-yellow-400 text-sm">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                Do not close this window until the process is complete.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}