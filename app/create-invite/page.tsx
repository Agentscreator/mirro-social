'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MapPin, Calendar, Clock, Users, Bell, X, Search, Plus } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface User {
  id: string
  username: string
  profileImage?: string
  image?: string
}

export default function CreateInvitePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address: string} | null>(null)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [hasDateTime, setHasDateTime] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [followingUsers, setFollowingUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [reminders, setReminders] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showUserSearch, setShowUserSearch] = useState(false)

  // Fetch following users
  useEffect(() => {
    const fetchFollowing = async () => {
      try {
        const response = await fetch('/api/users/following')
        if (response.ok) {
          const data = await response.json()
          setFollowingUsers(data.users || [])
        }
      } catch (error) {
        console.error('Error fetching following users:', error)
      }
    }
    fetchFollowing()
  }, [])

  const filteredUsers = followingUsers.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) &&
    !selectedUsers.some(selected => selected.id === user.id)
  )

  const handleAddUser = (user: User) => {
    setSelectedUsers(prev => [...prev, user])
    setSearchQuery('')
  }

  const handleRemoveUser = (userId: string) => {
    setSelectedUsers(prev => prev.filter(user => user.id !== userId))
  }

  const handleLocationSelect = () => {
    if (location) {
      // Open Google Maps for location selection
      const encodedLocation = encodeURIComponent(location)
      const mapsUrl = `https://www.google.com/maps/search/${encodedLocation}`
      window.open(mapsUrl, '_blank')
      
      // For demo purposes, simulate location selection
      setSelectedLocation({
        lat: 40.7128,
        lng: -74.0060,
        address: location
      })
    }
  }

  const handleReminderToggle = (reminder: string) => {
    setReminders(prev => 
      prev.includes(reminder) 
        ? prev.filter(r => r !== reminder)
        : [...prev, reminder]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const inviteData = {
        title,
        description,
        location: selectedLocation?.address || location,
        coordinates: selectedLocation ? { lat: selectedLocation.lat, lng: selectedLocation.lng } : null,
        date: hasDateTime && date ? date : null,
        time: hasDateTime && time ? time : null,
        invitedUsers: selectedUsers.map(user => user.id),
        reminders,
        maxParticipants: 999999,
      }

      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteData),
      })

      if (response.ok) {
        toast({
          title: "Invite created!",
          description: "Your invite has been sent to selected users.",
        })
        router.push('/feed')
      } else {
        throw new Error('Failed to create invite')
      }
    } catch (error) {
      console.error('Error creating invite:', error)
      toast({
        title: "Error",
        description: "Failed to create invite. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white">
      <div className="container mx-auto p-4 max-w-2xl">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
              <Plus className="w-6 h-6 text-blue-400" />
              Create New Invite
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium text-gray-300">Event Title</Label>
                <Input
                  id="title"
                  placeholder="What's the occasion?"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-400"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-300">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell people what to expect..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-400 min-h-[100px]"
                />
              </div>

              {/* Invite People */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Invite People You Follow
                </Label>
                
                {/* Selected Users */}
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-gray-700/30 rounded-lg">
                    {selectedUsers.map(user => (
                      <Badge key={user.id} variant="secondary" className="bg-blue-600 text-white flex items-center gap-2">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={user.profileImage || user.image} />
                          <AvatarFallback className="text-xs">{user.username[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        @{user.username}
                        <X 
                          className="w-3 h-3 cursor-pointer hover:text-red-300" 
                          onClick={() => handleRemoveUser(user.id)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}

                {/* User Search */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search people to invite..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setShowUserSearch(true)}
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-400"
                    />
                  </div>
                  
                  {showUserSearch && searchQuery && (
                    <div className="max-h-40 overflow-y-auto bg-gray-700 rounded-lg border border-gray-600">
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map(user => (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 hover:bg-gray-600 cursor-pointer"
                            onClick={() => handleAddUser(user)}
                          >
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={user.profileImage || user.image} />
                              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="text-white">@{user.username}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-gray-400 text-center">No users found</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Date & Time Toggle */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Set Date & Time
                  </Label>
                  <Switch
                    checked={hasDateTime}
                    onCheckedChange={setHasDateTime}
                  />
                </div>

                {hasDateTime && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-sm text-gray-400">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="bg-gray-700/50 border-gray-600 text-white focus:border-blue-400"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time" className="text-sm text-gray-400">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="bg-gray-700/50 border-gray-600 text-white focus:border-blue-400"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="space-y-3">
                <Label htmlFor="location" className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="location"
                    placeholder="Where will this happen?"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-blue-400"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLocationSelect}
                    disabled={!location}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <MapPin className="w-4 h-4" />
                  </Button>
                </div>
                {selectedLocation && (
                  <div className="text-sm text-green-400 flex items-center gap-2">
                    <MapPin className="w-3 h-3" />
                    Location selected: {selectedLocation.address}
                  </div>
                )}
              </div>

              {/* Reminders */}
              {hasDateTime && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Reminders
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {['1 hour before', '1 day before', '1 week before', 'Custom'].map(reminder => (
                      <div key={reminder} className="flex items-center space-x-2">
                        <Switch
                          id={reminder}
                          checked={reminders.includes(reminder)}
                          onCheckedChange={() => handleReminderToggle(reminder)}
                        />
                        <Label htmlFor={reminder} className="text-sm text-gray-400">{reminder}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all duration-200"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Creating Invite...
                  </div>
                ) : (
                  'Create Invite'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}