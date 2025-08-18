"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, ArrowLeft, Shield, Phone, Mail } from "lucide-react"
import { toast } from "@/hooks/use-toast"

export default function ReportPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [reportType, setReportType] = useState("")
  const [description, setDescription] = useState("")
  const [contactInfo, setContactInfo] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!reportType || !description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a report type and provide a description.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // In a real app, this would send to your backend/support system
      await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API call
      
      toast({
        title: "Report Submitted",
        description: "Your report has been submitted successfully. Our team will review it promptly.",
      })
      
      // Clear form
      setReportType("")
      setDescription("")
      setContactInfo("")
      
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit report. Please try again or contact support directly.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 -mx-4 -my-4 md:-mx-6 md:-my-8">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-500/20 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Report Issue</h1>
              <p className="text-gray-400">Help us keep the community safe</p>
            </div>
          </div>
        </div>

        {/* Emergency Notice */}
        <Card className="bg-red-500/10 border-red-500/20 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-red-400 font-semibold mb-2">Emergency Situations</h3>
                <p className="text-red-300/90 text-sm mb-3">
                  If you or someone you know is in immediate danger, please contact local emergency services immediately.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 text-sm">
                  <div className="flex items-center gap-2 text-red-300">
                    <Phone className="h-4 w-4" />
                    <span>Emergency: 911</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-300">
                    <Phone className="h-4 w-4" />
                    <span>Child Abuse Hotline: 1-800-4-A-CHILD</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Report Form */}
        <Card className="bg-gray-900/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Submit a Report</CardTitle>
            <CardDescription className="text-gray-400">
              All reports are taken seriously and reviewed by our safety team. Your identity will be kept confidential.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Report Type */}
              <div>
                <Label htmlFor="report-type" className="text-white font-medium">
                  Report Type *
                </Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-2">
                    <SelectValue placeholder="Select the type of issue" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="child-abuse">Child Abuse or Exploitation</SelectItem>
                    <SelectItem value="harassment">Harassment or Bullying</SelectItem>
                    <SelectItem value="inappropriate-content">Inappropriate Content</SelectItem>
                    <SelectItem value="spam">Spam or Scam</SelectItem>
                    <SelectItem value="hate-speech">Hate Speech</SelectItem>
                    <SelectItem value="privacy-violation">Privacy Violation</SelectItem>
                    <SelectItem value="impersonation">Impersonation</SelectItem>
                    <SelectItem value="other">Other Safety Concern</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-white font-medium">
                  Description *
                </Label>
                <Textarea
                  id="description"
                  placeholder="Please provide detailed information about the issue. Include usernames, links, or any other relevant details that can help us investigate."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white mt-2 min-h-[120px]"
                  required
                />
              </div>

              {/* Contact Information */}
              <div>
                <Label htmlFor="contact" className="text-white font-medium">
                  Contact Information (Optional)
                </Label>
                <Input
                  id="contact"
                  type="text"
                  placeholder="Email or phone number if you'd like us to follow up with you"
                  value={contactInfo}
                  onChange={(e) => setContactInfo(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white mt-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Providing contact information is optional but helps us follow up if needed.
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-blue-400 font-medium text-sm">Privacy & Confidentiality</h4>
                    <p className="text-gray-300 text-xs mt-1">
                      Your report will be handled confidentially by our safety team. We may contact you for additional information if provided.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  disabled={isSubmitting || !reportType || !description.trim()}
                >
                  {isSubmitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Resources */}
        <Card className="bg-gray-900/30 border-gray-700/50 mt-6">
          <CardContent className="pt-6">
            <h3 className="text-white font-semibold mb-3">Additional Resources</h3>
            <div className="space-y-2 text-sm">
              <p className="text-gray-300">
                • <strong>National Child Abuse Hotline:</strong> 1-800-4-A-CHILD (1-800-422-4453)
              </p>
              <p className="text-gray-300">
                • <strong>National Suicide Prevention Lifeline:</strong> 988
              </p>
              <p className="text-gray-300">
                • <strong>Crisis Text Line:</strong> Text HOME to 741741
              </p>
              <p className="text-gray-300">
                • <strong>National Domestic Violence Hotline:</strong> 1-800-799-7233
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}