"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter, useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ArrowLeft, Send, MoreVertical, Info, Users, Settings, Camera } from "lucide-react"
import { ImageUpload } from "@/components/image-upload"
import { SimpleMessageComposer } from "@/components/messages/SimpleMessageComposer"
import { MessageBubble } from "@/components/messages/MessageBubble"
import { toast } from "@/hooks/use-toast"

interface GroupMessage {
  id: number
  content?: string
  messageType: string
  attachmentUrl?: string
  attachmentType?: string
  attachmentName?: string
  attachmentSize?: number
  createdAt: string
  sender: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
}

interface GroupMember {
  id: number
  role: string
  joinedAt: string
  user: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
}

interface Group {
  id: number
  name: string
  description?: string
  image?: string
  createdBy: string
  maxMembers: number
  createdAt: string
  memberCount: number
  userRole: string
  members: GroupMember[]
  creator: {
    id: string
    username: string
    nickname?: string
    profileImage?: string
  }
}

export default function GroupChatPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const params = useParams()
  const groupId = params?.groupId as string
  
  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showGroupInfo, setShowGroupInfo] = useState(false)
  const [editingGroupImage, setEditingGroupImage] = useState(false)
  const [newGroupImage, setNewGroupImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchGroup = async () => {
    if (!groupId) return

    try {
      const response = await fetch(`/api/groups/${groupId}`)
      if (response.ok) {
        const data = await response.json()
        setGroup(data.group)
      } else if (response.status === 403) {
        toast({
          title: "Access Denied",
          description: "You don't have access to this group",
          variant: "destructive",
        })
        router.push('/messages')
      } else {
        throw new Error('Failed to fetch group')
      }
    } catch (error) {
      console.error('Error fetching group:', error)
      toast({
        title: "Error",
        description: "Failed to load group",
        variant: "destructive",
      })
    }
  }

  const fetchMessages = async (silent = false) => {
    if (!groupId) return

    try {
      if (!silent) setLoading(true)
      
      const response = await fetch(`/api/groups/${groupId}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const sendMessage = async (content: string, attachment?: { url: string; name: string; type: string; size: number }) => {
    if (!groupId || (!content.trim() && !attachment) || sending) return false

    setSending(true)
    try {
      const response = await fetch(`/api/groups/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim() || null,
          messageType: attachment ? (attachment.type.startsWith('image/') ? 'image' : 'file') : 'text',
          attachmentUrl: attachment?.url,
          attachmentName: attachment?.name,
          attachmentType: attachment?.type,
          attachmentSize: attachment?.size,
        }),
      })

      if (response.ok) {
        await fetchMessages(true) // Refresh messages
        return true
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to send message",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
      return false
    } finally {
      setSending(false)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleImageChange = (file: File | null) => {
    setNewGroupImage(file)
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setImagePreview(null)
    }
  }

  const uploadGroupImage = async () => {
    if (!newGroupImage || !group) return

    setUpdating(true)
    try {
      const formData = new FormData()
      formData.append('file', newGroupImage)

      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image')
      }

      const uploadData = await uploadResponse.json()
      
      // Update group with new image
      const updateResponse = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: group.name,
          description: group.description,
          image: uploadData.url,
        }),
      })

      if (updateResponse.ok) {
        await fetchGroup() // Refresh group data
        setEditingGroupImage(false)
        setNewGroupImage(null)
        setImagePreview(null)
        toast({
          title: "Success",
          description: "Group image updated successfully",
        })
      } else {
        throw new Error('Failed to update group')
      }
    } catch (error) {
      console.error('Error updating group image:', error)
      toast({
        title: "Error",
        description: "Failed to update group image",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const isUserAdmin = group?.userRole === 'admin'

  const formatMessageTime = (date: Date) => {
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // Less than a week
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  useEffect(() => {
    if (groupId) {
      fetchGroup()
      fetchMessages()
    }
  }, [groupId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Auto-refresh messages every 3 seconds
  useEffect(() => {
    if (!groupId) return

    const interval = setInterval(() => fetchMessages(true), 3000)
    return () => clearInterval(interval)
  }, [groupId])

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col h-screen bg-black">
        <div className="flex items-center justify-center flex-1">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    )
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <h2 className="text-xl font-semibold text-white mb-2">Group not found</h2>
        <p className="text-gray-400 mb-4">This group doesn't exist or you don't have access.</p>
        <Button onClick={() => router.push('/messages')}>
          Back to Messages
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-black -mx-4 -my-4 md:-mx-6 md:-my-8">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="-ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-800 rounded-lg p-2 -m-2 transition-colors"
            onClick={() => setShowGroupInfo(true)}
          >
            <Avatar className="h-10 w-10">
              <AvatarImage src={group.image} alt={group.name} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {group.name[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">
                {group.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {group.memberCount} members
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full text-white hover:bg-gray-800">
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Welcome to {group.name}!</h3>
            <p className="text-gray-400 text-center max-w-sm">
              Start the conversation by sending the first message to the group.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1]
              const showAvatar = !prevMessage || prevMessage.sender.id !== message.sender.id
              const showTimestamp = index === 0 || 
                (new Date(message.createdAt).getTime() - new Date(prevMessage?.createdAt || 0).getTime()) > 5 * 60 * 1000 // 5 minutes
              
              const isMe = message.sender.id === session?.user?.id
              
              return (
                <div key={message.id}>
                  {showTimestamp && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full shadow-sm">
                        {formatMessageTime(new Date(message.createdAt))}
                      </span>
                    </div>
                  )}
                  
                  <MessageBubble
                    message={{
                      id: message.id.toString(),
                      content: message.content || '',
                      senderId: message.sender.id,
                      receiverId: '', // Not applicable for group messages
                      timestamp: new Date(message.createdAt),
                      isRead: true,
                      messageType: message.messageType,
                      attachmentUrl: message.attachmentUrl,
                      attachmentName: message.attachmentName,
                      attachmentType: message.attachmentType,
                      attachmentSize: message.attachmentSize,
                    }}
                    isMe={isMe}
                    showAvatar={showAvatar}
                    senderInfo={{
                      username: message.sender.username,
                      nickname: message.sender.nickname,
                      profileImage: message.sender.profileImage
                    }}
                  />
                </div>
              )
            })}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <SimpleMessageComposer 
        onSendMessage={sendMessage}
        placeholder={`Message ${group.name}...`}
        disabled={sending}
      />

      {/* Group Info Modal */}
      <Dialog open={showGroupInfo} onOpenChange={setShowGroupInfo}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-center">Group Info</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex flex-col items-center">
              <div className="relative group">
                <Avatar className="w-20 h-20 mb-3">
                  <AvatarImage src={group.image} alt={group.name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold">
                    {group.name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {isUserAdmin && !editingGroupImage && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute -bottom-2 -right-2 bg-gray-700 hover:bg-gray-600 rounded-full p-1 h-8 w-8"
                    onClick={() => setEditingGroupImage(true)}
                  >
                    <Camera className="h-4 w-4 text-white" />
                  </Button>
                )}
              </div>
              
              {editingGroupImage && isUserAdmin ? (
                <div className="w-full space-y-3">
                  <ImageUpload
                    onImageChange={handleImageChange}
                    imagePreview={imagePreview}
                  />
                  <div className="flex gap-2 justify-center">
                    <Button
                      size="sm"
                      onClick={uploadGroupImage}
                      disabled={!newGroupImage || updating}
                    >
                      {updating ? "Updating..." : "Update"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingGroupImage(false)
                        setNewGroupImage(null)
                        setImagePreview(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-white">{group.name}</h3>
                  {group.description && (
                    <p className="text-gray-400 text-center mt-2">{group.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    Created by {group.creator.nickname || group.creator.username}
                  </p>
                </>
              )}
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-2">
                Members ({group.memberCount})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {group.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.user.profileImage} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        {(member.user.nickname || member.user.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        {member.user.nickname || member.user.username}
                      </p>
                      {member.role === 'admin' && (
                        <p className="text-xs text-blue-400">Admin</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}