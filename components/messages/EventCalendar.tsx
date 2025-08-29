'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Event {
  id: number
  title: string
  content: string
  publishTime: string
  expiryTime?: string
  location?: string
  participantCount?: number
  isCreator: boolean
  isParticipant: boolean
}

export function EventCalendar() {
  const { data: session } = useSession()
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  const today = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // Get days in current month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  
  // Generate calendar days
  const calendarDays = []
  
  // Add empty cells for days before month starts
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Fetch user's events
  const fetchEvents = async () => {
    if (!session?.user?.id) return
    
    try {
      setLoading(true)
      const response = await fetch('/api/events/calendar')
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [session])

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const dayDate = new Date(currentYear, currentMonth, day)
    return events.filter(event => {
      const eventDate = new Date(event.publishTime)
      return eventDate.toDateString() === dayDate.toDateString()
    })
  }

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleCreateEvent = () => {
    router.push('/create-invite')
  }

  const formatTime = (timeStr: string) => {
    return new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (!session) return null

  return (
    <Card className="bg-gray-900/50 border-gray-700/50 backdrop-blur-sm">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-white">Events</h3>
            <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
              {events.length}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCreateEvent}
              className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              <Plus className="h-3 w-3 mr-1" />
              Create
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-gray-400 hover:text-white"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          </div>
        </div>

        {/* Mini Calendar (always visible) */}
        {!isExpanded && (
          <div className="space-y-2">
            {/* Today's events */}
            <div className="text-xs text-gray-400 mb-2">Today</div>
            {loading ? (
              <div className="text-xs text-gray-500">Loading...</div>
            ) : (
              <div className="space-y-1">
                {getEventsForDay(today.getDate()).slice(0, 2).map(event => (
                  <div key={event.id} className="flex items-center gap-2 p-2 bg-gray-800/50 rounded-md">
                    <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{event.content}</div>
                      <div className="text-xs text-gray-400">
                        {formatTime(event.publishTime)}
                      </div>
                    </div>
                  </div>
                ))}
                {getEventsForDay(today.getDate()).length === 0 && (
                  <div className="text-xs text-gray-500">No events today</div>
                )}
                {getEventsForDay(today.getDate()).length > 2 && (
                  <div className="text-xs text-gray-400">
                    +{getEventsForDay(today.getDate()).length - 2} more
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Full Calendar (when expanded) */}
        {isExpanded && (
          <div className="space-y-4">
            {/* Month Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={previousMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h4 className="text-sm font-medium text-white min-w-[120px] text-center">
                  {monthNames[currentMonth]} {currentYear}
                </h4>
                <Button variant="ghost" size="sm" onClick={nextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={goToToday}
                className="text-xs text-gray-400 hover:text-white"
              >
                Today
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-xs text-gray-400 text-center p-1">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="p-1" />
                }
                
                const dayEvents = getEventsForDay(day)
                const isToday = 
                  day === today.getDate() && 
                  currentMonth === today.getMonth() && 
                  currentYear === today.getFullYear()
                
                return (
                  <div
                    key={day}
                    className={cn(
                      "p-1 text-center relative group cursor-pointer rounded-md transition-colors",
                      isToday ? "bg-blue-500/20 text-blue-400" : "text-gray-300 hover:bg-gray-800/50"
                    )}
                  >
                    <div className="text-xs">{day}</div>
                    {dayEvents.length > 0 && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2">
                        <div className="flex gap-0.5">
                          {dayEvents.slice(0, 3).map((_, i) => (
                            <div
                              key={i}
                              className="w-1 h-1 rounded-full bg-blue-500"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Tooltip on hover */}
                    {dayEvents.length > 0 && (
                      <div className="absolute top-6 left-0 z-10 hidden group-hover:block">
                        <div className="bg-gray-800 border border-gray-700 rounded-md p-2 text-xs whitespace-nowrap">
                          {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Upcoming Events List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <div className="text-xs text-gray-400">Upcoming Events</div>
              {loading ? (
                <div className="text-xs text-gray-500">Loading...</div>
              ) : (
                <div className="space-y-2">
                  {events
                    .filter(event => new Date(event.publishTime) >= today)
                    .slice(0, 5)
                    .map(event => (
                      <div key={event.id} className="p-2 bg-gray-800/50 rounded-md">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-white font-medium truncate">
                              {event.content}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                              <Clock className="h-3 w-3" />
                              {new Date(event.publishTime).toLocaleDateString([], { 
                                month: 'short', 
                                day: 'numeric' 
                              })} at {formatTime(event.publishTime)}
                            </div>
                            {event.location && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {event.isCreator && (
                              <Badge variant="outline" className="text-xs border-blue-500 text-blue-400">
                                Host
                              </Badge>
                            )}
                            {event.isParticipant && !event.isCreator && (
                              <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                                Joined
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  {events.filter(event => new Date(event.publishTime) >= today).length === 0 && (
                    <div className="text-xs text-gray-500">No upcoming events</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}