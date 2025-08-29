"use client"

import { useState, useEffect } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Calendar as CalendarIcon, MapPin, Users, Clock, Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow, isThisWeek, isSameDay, parseISO } from 'date-fns'

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

interface CalendarEvent {
  id: string
  title: string
  content: string
  publishTime: string
  expiryTime?: string | null
  location?: string | null
  participantCount: number
  isCreator: boolean
  isParticipant: boolean
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedEvent, setSelectedEvent] = useState<Event | CalendarEvent | null>(null)
  const [showEventDetails, setShowEventDetails] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      // Fetch upcoming events (the ones that were on feed page)
      const upcomingResponse = await fetch('/api/events/upcoming')
      if (upcomingResponse.ok) {
        const upcomingData = await upcomingResponse.json()
        setEvents(upcomingData.events || [])
      }

      // Fetch calendar events (scheduled posts)
      const calendarResponse = await fetch('/api/events/calendar')
      if (calendarResponse.ok) {
        const calendarData = await calendarResponse.json()
        setCalendarEvents(calendarData.events || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
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

  const handleEventClick = (event: Event | CalendarEvent) => {
    if ('publishTime' in event) {
      // This is a calendar event (scheduled post)
      router.push(`/post/${event.id}`)
    } else {
      // This is a regular event
      setSelectedEvent(event)
      setShowEventDetails(true)
    }
  }

  const handleCreateEvent = () => {
    router.push('/create-invite')
  }

  // Get events for selected date
  const getEventsForDate = (date: Date) => {
    const dateEvents: (Event | CalendarEvent)[] = []
    
    // Add upcoming events that match the date
    events.forEach(event => {
      if (event.date && isSameDay(new Date(event.date), date)) {
        dateEvents.push(event)
      }
    })

    // Add calendar events that match the date
    calendarEvents.forEach(event => {
      if (event.publishTime && isSameDay(parseISO(event.publishTime), date)) {
        dateEvents.push(event)
      }
    })

    return dateEvents
  }

  // Get dates that have events for calendar highlighting
  const getDatesWithEvents = () => {
    const datesWithEvents: Date[] = []
    
    events.forEach(event => {
      if (event.date) {
        datesWithEvents.push(new Date(event.date))
      }
    })

    calendarEvents.forEach(event => {
      if (event.publishTime) {
        datesWithEvents.push(parseISO(event.publishTime))
      }
    })

    return datesWithEvents
  }

  const selectedDateEvents = getEventsForDate(selectedDate)
  const datesWithEvents = getDatesWithEvents()

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-blue-400" />
              Events Calendar
            </h1>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Calendar skeleton */}
            <div className="bg-gray-800/30 rounded-xl p-6 animate-pulse">
              <div className="h-64 bg-gray-700/50 rounded"></div>
            </div>
            {/* Events skeleton */}
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-800/50 rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-400" />
            Events Calendar
          </h1>
          <Button
            onClick={handleCreateEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar */}
          <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="w-full"
                modifiers={{
                  hasEvents: datesWithEvents
                }}
                modifiersStyles={{
                  hasEvents: {
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    borderRadius: '50%'
                  }
                }}
              />
            </CardContent>
          </Card>

          {/* Events for selected date */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              Events for {format(selectedDate, 'EEEE, MMM d')}
            </h2>
            
            {selectedDateEvents.length === 0 ? (
              <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 bg-gray-700/50 rounded-full flex items-center justify-center">
                    <CalendarIcon className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-400 text-sm mb-4">No events on this date</p>
                  <Button
                    onClick={handleCreateEvent}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Event
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {selectedDateEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card 
                      className="bg-gradient-to-r from-gray-800/40 to-gray-800/20 border-gray-700/50 backdrop-blur-sm hover:from-gray-800/60 hover:to-gray-800/40 transition-all duration-200 cursor-pointer group"
                      onClick={() => handleEventClick(event)}
                    >
                      <CardContent className="p-4">
                        {'publishTime' in event ? (
                          // Calendar event (scheduled post)
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                                  {event.title}
                                </h3>
                                <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 text-xs">
                                  {event.isCreator ? 'Created' : 'Invited'}
                                </Badge>
                              </div>
                              <div className="space-y-1 text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3" />
                                  <span>{format(parseISO(event.publishTime), 'h:mm a')}</span>
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Users className="w-3 h-3" />
                                  <span>{event.participantCount} participants</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Regular event
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
                                {event.time && (
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    <span>{event.time}</span>
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
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All upcoming events section */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            All Upcoming Events
          </h2>
          
          {events.length === 0 && calendarEvents.length === 0 ? (
            <Card className="bg-gray-800/30 border-gray-700/50 backdrop-blur-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-700/50 rounded-full flex items-center justify-center">
                  <CalendarIcon className="w-6 h-6 text-gray-400" />
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Regular events */}
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card 
                    className="bg-gradient-to-r from-gray-800/40 to-gray-800/20 border-gray-700/50 backdrop-blur-sm hover:from-gray-800/60 hover:to-gray-800/40 transition-all duration-200 cursor-pointer group"
                    onClick={() => handleEventClick(event)}
                  >
                    <CardContent className="p-4">
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
                      <div className="space-y-1 text-sm text-gray-400 mb-3">
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
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={event.host.profileImage || event.host.image} />
                            <AvatarFallback className="text-xs">
                              {event.host.username[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-gray-400">
                            @{event.host.username}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {event.attendees} going
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}

              {/* Calendar events */}
              {calendarEvents.map((event, index) => (
                <motion.div
                  key={`calendar-${event.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (events.length + index) * 0.1 }}
                >
                  <Card 
                    className="bg-gradient-to-r from-blue-800/40 to-blue-800/20 border-blue-700/50 backdrop-blur-sm hover:from-blue-800/60 hover:to-blue-800/40 transition-all duration-200 cursor-pointer group"
                    onClick={() => handleEventClick(event)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-medium text-white truncate group-hover:text-blue-300 transition-colors">
                          {event.title}
                        </h3>
                        <Badge variant="secondary" className="bg-blue-600/20 text-blue-400 text-xs">
                          {event.isCreator ? 'Created' : 'Invited'}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-gray-400 mb-3">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span>
                            {format(parseISO(event.publishTime), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-400">Scheduled Post</span>
                        <span className="text-xs text-gray-400">
                          {event.participantCount} participants
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={showEventDetails} onOpenChange={setShowEventDetails}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>{selectedEvent && 'title' in selectedEvent ? selectedEvent.title : ''}</DialogTitle>
          </DialogHeader>
          {selectedEvent && 'description' in selectedEvent && (
            <div className="space-y-4">
              <p className="text-gray-300">{selectedEvent.description}</p>
              <div className="space-y-2 text-sm">
                {selectedEvent.date && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span>
                      {formatEventDate(selectedEvent.date)}
                      {selectedEvent.time && ` at ${selectedEvent.time}`}
                    </span>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span>
                    {selectedEvent.attendees} attending
                    {selectedEvent.maxAttendees && selectedEvent.maxAttendees < 999999 && 
                      ` / ${selectedEvent.maxAttendees}`}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={selectedEvent.host.profileImage || selectedEvent.host.image} />
                  <AvatarFallback>
                    {selectedEvent.host.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">@{selectedEvent.host.username}</p>
                  <p className="text-xs text-gray-400">Event Host</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}