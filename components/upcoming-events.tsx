"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, MapPin, Users, Clock, ChevronRight, Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'

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
}

export function UpcomingEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetchUpcomingEvents()
  }, [])

  const fetchUpcomingEvents = async () => {
    try {
      const response = await fetch('/api/events/upcoming')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Error fetching upcoming events:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null
    
    const date = new Date(dateStr)
    
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isThisWeek(date)) return format(date, 'EEEE')
    return format(date, 'MMM d')
  }

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`)
  }

  const handleCreateEvent = () => {
    router.push('/create-invite')
  }

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Upcoming Events</h2>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-400" />
          Upcoming Events
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCreateEvent}
          className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
        >
          <Plus className="w-4 h-4 mr-1" />
          Create
        </Button>
      </div>

      {events.length === 0 ? (
        <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
          <CardContent className="p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 bg-gray-700/50 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-400 text-sm mb-4">No upcoming events</p>
            <Button
              onClick={handleCreateEvent}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create Your First Event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {events.slice(0, 3).map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card 
                className="bg-gradient-to-r from-gray-800/40 to-gray-800/20 border-gray-700/50 backdrop-blur-sm hover:from-gray-800/60 hover:to-gray-800/40 transition-all duration-200 cursor-pointer group"
                onClick={() => handleEventClick(event.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                          {event.title}
                        </h3>
                        {event.isAttending && (
                          <Badge variant="secondary" className="bg-green-600/20 text-green-400 text-xs">
                            Going
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1 text-sm text-gray-400">
                        {event.date && (
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>
                              {formatEventDate(event.date)}
                              {event.time && ` at ${event.time}`}
                            </span>
                          </div>
                        )}
                        
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          <span>
                            {event.attendees} attending
                            {event.maxAttendees && event.maxAttendees < 999999 && ` / ${event.maxAttendees}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={event.host.profileImage || event.host.image} />
                          <AvatarFallback className="text-xs">
                            {event.host.username[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-400">
                          by @{event.host.username}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
                      
                      {event.invitedUsers && event.invitedUsers.length > 0 && (
                        <div className="flex -space-x-1">
                          {event.invitedUsers.slice(0, 3).map((user) => (
                            <Avatar key={user.id} className="w-5 h-5 border border-gray-700">
                              <AvatarImage src={user.profileImage || user.image} />
                              <AvatarFallback className="text-xs">
                                {user.username[0].toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {event.invitedUsers.length > 3 && (
                            <div className="w-5 h-5 bg-gray-700 rounded-full border border-gray-600 flex items-center justify-center">
                              <span className="text-xs text-gray-300">
                                +{event.invitedUsers.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {events.length > 3 && (
            <Button
              variant="ghost"
              className="w-full text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
              onClick={() => router.push('/events')}
            >
              View All Events ({events.length})
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}