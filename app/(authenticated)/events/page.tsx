"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar, MapPin, Users, Clock, Search, Plus, Filter } from 'lucide-react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { format, isToday, isTomorrow, isThisWeek } from 'date-fns'
import { useSession } from 'next-auth/react'

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

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const router = useRouter()
  const { data: session } = useSession()

  useEffect(() => {
    fetchEvents()
  }, [activeTab])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/events?type=${activeTab}`)
      if (response.ok) {
        const data = await response.json()
        setEvents(data.events || [])
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

  const handleEventClick = (eventId: string) => {
    router.push(`/events/${eventId}`)
  }

  const handleCreateEvent = () => {
    router.push('/create-invite')
  }

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-400" />
              Events
            </h1>
            <p className="text-gray-400">Discover and join exciting events in your community</p>
          </div>
          <Button
            onClick={handleCreateEvent}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search events..."
              className="pl-10 bg-gray-800/50 border-gray-700 text-white placeholder:text-gray-400"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-gray-800/50">
              <TabsTrigger value="all" className="text-white data-[state=active]:bg-blue-600">
                All Events
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-white data-[state=active]:bg-blue-600">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="attending" className="text-white data-[state=active]:bg-blue-600">
                Attending
              </TabsTrigger>
              <TabsTrigger value="hosting" className="text-white data-[state=active]:bg-blue-600">
                Hosting
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Events Content */}
        <Tabs value={activeTab}>
          <TabsContent value="all" className="mt-0">
            <EventsList 
              events={filteredEvents} 
              loading={loading} 
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>
          <TabsContent value="upcoming" className="mt-0">
            <EventsList 
              events={filteredEvents} 
              loading={loading} 
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>
          <TabsContent value="attending" className="mt-0">
            <EventsList 
              events={filteredEvents.filter(e => e.isAttending)} 
              loading={loading} 
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>
          <TabsContent value="hosting" className="mt-0">
            <EventsList 
              events={filteredEvents.filter(e => e.host.id === session?.user?.id)} 
              loading={loading} 
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

interface EventsListProps {
  events: Event[]
  loading: boolean
  onEventClick: (eventId: string) => void
  onCreateEvent: () => void
}

function EventsList({ events, loading, onEventClick, onCreateEvent }: EventsListProps) {
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return null
    
    const date = new Date(dateStr)
    
    if (isToday(date)) return 'Today'
    if (isTomorrow(date)) return 'Tomorrow'
    if (isThisWeek(date)) return format(date, 'EEEE')
    return format(date, 'MMM d')
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="bg-gray-800/50 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-800/50 rounded-full flex items-center justify-center">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No events found</h3>
        <p className="text-gray-400 mb-6">Be the first to create an event in your community!</p>
        <Button
          onClick={onCreateEvent}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Your First Event
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card 
            className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 border-gray-700/50 backdrop-blur-sm hover:from-gray-800/60 hover:to-gray-800/40 transition-all duration-200 cursor-pointer group h-full"
            onClick={() => onEventClick(event.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                  {event.title}
                </h3>
                {event.isAttending && (
                  <Badge variant="secondary" className="bg-green-600/20 text-green-400 text-xs ml-2">
                    Going
                  </Badge>
                )}
              </div>

              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {event.description}
              </p>

              <div className="space-y-2 text-sm text-gray-400 mb-4">
                {event.date && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {formatEventDate(event.date)}
                      {event.time && ` at ${event.time}`}
                    </span>
                  </div>
                )}
                
                {event.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>
                    {event.attendees} attending
                    {event.maxAttendees && event.maxAttendees < 999999 && ` / ${event.maxAttendees}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={event.host.profileImage || event.host.image} />
                    <AvatarFallback className="text-xs">
                      {event.host.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-400">
                    @{event.host.username}
                  </span>
                </div>

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
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}