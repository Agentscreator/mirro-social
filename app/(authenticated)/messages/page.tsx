"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Search, MessageCircle, Plus, Users, FileImage } from "lucide-react"
import { useMessages } from "@/hooks/use-messages"
import { useGroups } from "@/hooks/use-groups"
import { useOptimizedFetch } from "@/hooks/use-optimized-fetch"
import { CommunityStories } from "@/components/messages/CommunityStories"
import { StoriesFeed } from "@/components/stories/StoriesFeed"
import { EventCalendar } from "@/components/messages/EventCalendar"
import { ErrorBoundary } from "@/components/error-boundary"
import { toast } from "@/hooks/use-toast"
import { isMobileDevice, isNativeApp, hideAddressBar, forceNavigation } from "@/lib/mobile-utils"

function MessagesPageContent() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [showAddStory, setShowAddStory] = useState(false)

  const { conversations, loading } = useMessages()
  const { groups, loading: groupsLoading, createGroup, refetch: refetchGroups } = useGroups()
  
  // Add optimized fetch for conversations as backup
  const { data: conversationsBackup, loading: conversationsBackupLoading } = useOptimizedFetch<{conversations: any[]}>(
    session?.user?.id ? '/api/messages' : null,
    {
      cache: true,
      cacheTTL: 30 * 1000, // 30 seconds cache
      retries: 2
    }
  )

  // Debug groups data
  useEffect(() => {
    console.log('Groups data:', groups)
    console.log('Groups loading:', groupsLoading)
  }, [groups, groupsLoading])

  // Mobile-specific setup
  useEffect(() => {
    // Hide address bar on mobile web (not native apps)
    if (isMobileDevice() && !isNativeApp()) {
      hideAddressBar()
    }
    
    // Remove any navigation blocking
    const removeNavigationBlocks = () => {
      // Remove any event listeners that might block navigation
      document.removeEventListener('beforeunload', () => {})
      
      // Ensure body can scroll normally
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
    }
    
    removeNavigationBlocks()
    
    return () => {
      // Cleanup
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  const handleGroupClick = (groupId: number) => {
    console.log('Group clicked:', groupId, typeof groupId)
    console.log('Navigating to:', `/groups/${groupId}`)
    
    // Force navigation to ensure it works
    const path = `/groups/${groupId}`
    
    try {
      router.push(path)
      
      // Fallback for stubborn cases
      setTimeout(() => {
        if (window.location.pathname === '/messages') {
          console.log('Router failed, using force navigation')
          forceNavigation(path)
        }
      }, 500)
    } catch (error) {
      console.error('Navigation error:', error)
      forceNavigation(path)
    }
  }

  // Use backup conversations if main hook fails
  const activeConversations = conversations.length > 0 ? conversations : (conversationsBackup?.conversations || [])
  
  const filteredConversations = activeConversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConversationClick = (userId: string) => {
    const path = `/messages/${userId}`
    
    try {
      router.push(path)
      
      // Fallback for stubborn cases
      setTimeout(() => {
        if (window.location.pathname === '/messages') {
          console.log('Router failed, using force navigation')
          forceNavigation(path)
        }
      }, 500)
    } catch (error) {
      console.error('Navigation error:', error)
      forceNavigation(path)
    }
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      })
      return
    }

    setCreatingGroup(true)
    try {
      const result = await createGroup({
        name: groupName.trim(),
        description: groupDescription.trim() || undefined,
        maxMembers: 10,
      })

      toast({
        title: "Success",
        description: "Group created successfully!",
      })

      setShowCreateGroup(false)
      setGroupName("")
      setGroupDescription("")

      // Navigate to the new group chat
      if (result && result.id) {
        router.push(`/groups/${result.id}`)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create group",
        variant: "destructive",
      })
    } finally {
      setCreatingGroup(false)
    }
  }

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
    }
  }

  const truncateMessage = (message: string, maxLength: number = 50) => {
    if (message.length <= maxLength) return message
    return message.substring(0, maxLength) + '...'
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Error boundary for failed API calls
  if (!loading && !conversationsBackupLoading && activeConversations.length === 0 && groups.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
            <MessageCircle className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
            Unable to load messages. Please check your connection and try again.
          </p>
          <Button
            onClick={() => {
              setLoading(true)
              window.location.reload()
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium"
          >
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950">

      {/* Stories Feed */}
      <StoriesFeed />

      {/* Search */}
      <div className="px-6 py-4 bg-gray-950">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <Input
              placeholder="Search conversations..."
              className="pl-12 h-12 rounded-xl border border-gray-700 bg-gray-900/50 backdrop-blur-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {/* Add Story Button */}
          {!groupsLoading && groups.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className={`px-3 py-2 h-12 rounded-xl transition-all duration-200 flex-shrink-0 ${
                showAddStory 
                  ? 'bg-blue-500 text-white hover:bg-blue-600' 
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
              }`}
              onClick={() => setShowAddStory(!showAddStory)}
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Story</span>
            </Button>
          )}
        </div>
      </div>

      {/* Community Stories */}
      {!groupsLoading && groups.length > 0 && (
        <CommunityStories 
          groups={groups} 
          onRefresh={refetchGroups}
          showGroupSelection={showAddStory}
          onToggleAddStory={() => setShowAddStory(!showAddStory)}
        />
      )}

      {/* Event Calendar - Subtle placement */}
      <div className="px-4 py-2">
        <EventCalendar />
      </div>

      {/* Conversations List */}
      <div className="flex-1">
        {(loading && conversationsBackupLoading) || groupsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (filteredConversations.length > 0 || groups.length > 0) ? (
          <div className="bg-gray-950">
            {/* Group Chats */}
            {groups.map((group) => (
              <button
                key={`group-${group.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  console.log('Group button clicked:', group.id, group.name)
                  handleGroupClick(group.id)
                }}
                className="w-full mx-4 mb-2 px-4 py-4 hover:bg-gray-800/40 cursor-pointer transition-all duration-200 rounded-xl group relative z-10 text-left"
                type="button"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-14 w-14">
                      <AvatarImage
                        src={group.image}
                        alt={group.name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-700 text-gray-200">
                        <Users className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                      <Users className="h-2 w-2 text-white" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate">
                          {group.name}
                        </h3>
                        <span className="text-xs text-green-400 bg-green-400/20 px-2 py-0.5 rounded-full">
                          GROUP
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {group.memberCount} members
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 truncate leading-tight">
                      {group.description || "Group chat"}
                    </p>
                  </div>
                </div>
              </button>
            ))}

            {/* Individual Conversations */}
            {filteredConversations.map((conversation, index) => (
              <div
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.userId)}
                className="px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors active:bg-gray-700"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-14 w-14">
                      <AvatarImage
                        src={conversation.profileImage}
                        alt={conversation.username}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {(conversation.nickname || conversation.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="font-semibold text-white truncate">
                          {conversation.nickname || conversation.username}
                        </h3>
                        {/* Add pinned indicator if needed */}
                        {/* <Pin className="h-3 w-3 text-gray-400 flex-shrink-0" /> */}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {formatTime(conversation.lastMessageTime)}
                        </span>
                        {conversation.unreadCount > 0 && (
                          <Badge className="bg-blue-500 hover:bg-blue-600 text-white min-w-[20px] h-5 text-xs px-1.5 rounded-full">
                            {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 truncate leading-tight">
                      {truncateMessage(conversation.lastMessage)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {searchQuery ? 'No chats found' : 'No messages yet'}
            </h3>
            <p className="text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
              {searchQuery
                ? 'Try searching for a different name or username.'
                : 'Start a conversation by discovering new people, messaging someone from your feed, or creating a group.'}
            </p>
            {!searchQuery && (
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    console.log('Navigating to discover...')
                    try {
                      router.push('/discover')
                      setTimeout(() => {
                        if (window.location.pathname === '/messages') {
                          forceNavigation('/discover')
                        }
                      }, 500)
                    } catch (error) {
                      forceNavigation('/discover')
                    }
                  }}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium"
                >
                  Start Chatting
                </Button>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  variant="outline"
                  className="px-6 py-2.5 rounded-full font-medium"
                >
                  Create Group
                </Button>
                {/* Debug buttons for testing navigation */}
                <Button
                  onClick={() => {
                    console.log('Testing navigation to feed...')
                    try {
                      router.push('/feed')
                      setTimeout(() => {
                        if (window.location.pathname === '/messages') {
                          forceNavigation('/feed')
                        }
                      }, 500)
                    } catch (error) {
                      forceNavigation('/feed')
                    }
                  }}
                  variant="outline"
                  className="px-6 py-2.5 rounded-full font-medium"
                >
                  Test Feed Nav
                </Button>
                <Button
                  onClick={() => {
                    console.log('Testing navigation to profile...')
                    try {
                      router.push('/profile')
                      setTimeout(() => {
                        if (window.location.pathname === '/messages') {
                          forceNavigation('/profile')
                        }
                      }, 500)
                    } catch (error) {
                      forceNavigation('/profile')
                    }
                  }}
                  variant="outline"
                  className="px-6 py-2.5 rounded-full font-medium"
                >
                  Test Profile Nav
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Group Dialog */}
      <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-center">Create New Group</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Group Name *
              </label>
              <Input
                placeholder="Enter group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Description (Optional)
              </label>
              <Textarea
                placeholder="What's this group about?"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateGroup(false)}
                disabled={creatingGroup}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-blue-500 hover:bg-blue-600"
                onClick={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim()}
              >
                {creatingGroup ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function MessagesPage() {
  return (
    <ErrorBoundary>
      <MessagesPageContent />
    </ErrorBoundary>
  )
}