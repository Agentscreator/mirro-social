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
import { Search, MessageCircle, Plus, Users } from "lucide-react"
import { useMessages } from "@/hooks/use-messages"
import { useGroups } from "@/hooks/use-groups"
import { CommunityStories } from "@/components/messages/CommunityStories"
import { StoriesFeed } from "@/components/stories/StoriesFeed"
import { toast } from "@/hooks/use-toast"

export default function InboxPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [creatingGroup, setCreatingGroup] = useState(false)

  const { conversations, loading } = useMessages()
  const { groups, loading: groupsLoading, createGroup, refetch: refetchGroups } = useGroups()

  const handleGroupClick = (groupId: number) => {
    router.push(`/groups/${groupId}`)
  }

  const filteredConversations = conversations.filter(conv =>
    conv.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.nickname?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleConversationClick = (userId: string) => {
    router.push(`/inbox/${userId}`)
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

  return (
    <div className="min-h-screen bg-gray-950 -mx-4 -my-4 md:-mx-6 md:-my-8">

      {/* Stories Feed */}
      <StoriesFeed />

      {/* Search */}
      <div className="px-6 py-4 bg-gray-950">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search inbox..."
            className="pl-12 h-12 rounded-xl border border-gray-700 bg-gray-900/50 backdrop-blur-sm text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Personal Stories Section */}
      <div className="px-6 py-2">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Your Stories</h2>
        <StoriesFeed showPersonalOnly={true} />
      </div>

      {/* Conversations List */}
      <div className="flex-1">
        {loading || groupsLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (filteredConversations.length > 0 || groups.length > 0) ? (
          <div className="bg-gray-950">
            {/* Group Chats */}
            {groups.map((group) => (
              <div
                key={`group-${group.id}`}
                onClick={() => handleGroupClick(group.id)}
                className="mx-4 mb-2 px-4 py-4 hover:bg-gray-800/40 cursor-pointer transition-all duration-200 rounded-xl group"
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-14 w-14">
                      <AvatarImage
                        src={group.image}
                        alt={group.name}
                      />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-blue-600 text-white font-semibold">
                        {group.name[0]?.toUpperCase()}
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
              </div>
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
              {searchQuery ? 'No conversations found' : 'Your inbox is empty'}
            </h3>
            <p className="text-gray-400 text-center max-w-sm mb-6 leading-relaxed">
              {searchQuery
                ? 'Try searching for a different name or username.'
                : 'Start conversations with people you meet, respond to invitations, or create group chats with friends.'}
            </p>
            {!searchQuery && (
              <div className="flex gap-3">
                <Button
                  onClick={() => router.push('/discover')}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2.5 rounded-full font-medium"
                >
                  Discover People
                </Button>
                <Button
                  onClick={() => setShowCreateGroup(true)}
                  variant="outline"
                  className="px-6 py-2.5 rounded-full font-medium"
                >
                  Create Group
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