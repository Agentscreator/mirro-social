"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Calendar, MapPin, Users, Clock, ArrowLeft, Share2, Heart, MessageCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { useSession } from 'next-auth/react'
import { toast } from '@/hooks/use-toast'

interface Event {
  id: string
  title: string
  description: string
  date?: string
  time?: string
  location?: string
  attendees: number
  maxAttendees?: number
  isAttending: boolean
  host: {
    id: string
    username: string
    profileImage?: string
    image?: string
  }
  invitedUsers?: Array<{
    id: string
    username: string
    profileImage?: string
    image?: string
  }>
  attendeesList?: Array<{
    id: string
    username: string
    profileImage?: string
    image?: string
  }>
}

interface EventPageProps {
  params: {
    eventId: string
  }
}

export default function EventPage({ params }: EventPageProps) {
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [attending, setAttending] = useState(false)
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    fetchEvent()
  }, [params.eventId])

  const fetchEvent = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events/${params.eventId}`)
      if (response.ok) {
        const data = await response.json()
        setEvent(data.event)
        setAttending(data.event?.isAttending || false)
      } else if (response.status === 404) {
        router.push('/events')
        toast({
          title: "Event not found",
          description: "The event you're looking for doesn't exist.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error fetching event:', error)
      toast({
        title: "Error",
        description: "Failed to load event details.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAttendanceToggle = async () => {
    if (!event || !session) return

    try {
      const response = await fetch(`/api/events/${event.id}/attendance`, {
        method: attending ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        setAttending(!attending)
        setEvent(prev => prev ? {
          ...prev,
          attendees: attending ? prev.attendees - 1 : prev.attendees + 1,
          isAttending: !attending
        } : null)
        
        toast({
          title: attending ? "Left event" : "Joined event",
          description: attending ? "You're no longer attending this event." : "You're now attending this event!",
        })
      } else {
        throw new Error('Failed to update attendance')
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast({
        title: "Error",
        description: "Failed to update attendance. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleShare = async () => {
    if (!event) return

    try {
      await navigator.share({
        title: event.title,
        text: event.description,
        url: window.location.href,
      })
    } catch (error) {
      // Fallback to copying to clipboard
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "Link copied",
        description: "Event link copied to clipboard!",
      })
    }
  }

  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null
    
    const date = new Date(dateStr)
    
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isThisWeek(date)) return format(date, 'EEEE, MMMM d')
    return format(date, 'MMMM d, yyyy')
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white/70 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-1/4 mb-8"></div>
            <div className="bg-gray-800/50 rounded-xl p-8">
              <div className="h-8 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-6"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-700 rounded w-full"></div>
                <div className="h-4 bg-gray-700 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Event not found</h2>
          <Button onClick={() => router.push('/events')} variant="outline">
            Back to Events
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Event Details</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="text-white hover:bg-white/10"
          >
            <Share2 className="w-5 h-5" />
          </Button>
        </div>

        {/* Event Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-8">
              {/* Title and Status */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2">{event.title}</h2>
                  <div className="flex items-center gap-2">
                    {attending && (
                      <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                        You're attending
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Event Details */}
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-4">
                  {event.date && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Date</p>
                        <p className="font-medium">
                          {formatEventDate(event.date)}
                          {event.time && ` at ${event.time}`}
                        </p>
                      </div>
                    </div>
                  )}

                  {event.location && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Location</p>
                        <p className="font-medium">{event.location}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600/20 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Attendees</p>
                      <p className="font-medium">
                        {event.attendees} attending
                        {event.maxAttendees && event.maxAttendees < 999999 && ` / ${event.maxAttendees}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={event.host.profileImage || event.host.image} />
                      <AvatarFallback>
                        {event.host.username[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-gray-400">Hosted by</p>
                      <p className="font-medium">@{event.host.username}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-3">About this event</h3>
                <p className="text-gray-300 leading-relaxed">{event.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={handleAttendanceToggle}
                  className={attending 
                    ? "bg-red-600 hover:bg-red-700 text-white flex-1" 
                    : "bg-blue-600 hover:bg-blue-700 text-white flex-1"
                  }
                >
                  {attending ? "Leave Event" : "Join Event"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/messages?user=${event.host.id}`)}
                  className="border-gray-600 text-white hover:bg-white/10"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Message Host
                </Button>
              </div>

              {/* Attendees List */}
              {event.attendeesList && event.attendeesList.length > 0 && (
                <>
                  <Separator className="my-8 bg-gray-700" />
                  <div>
                    <h3 className="text-lg font-semibold mb-4">
                      Attendees ({event.attendeesList.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {event.attendeesList.map((attendee) => (
                        <div key={attendee.id} className="flex items-center gap-2">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={attendee.profileImage || attendee.image} />
                            <AvatarFallback className="text-xs">
                              {attendee.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">@{attendee.username}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}