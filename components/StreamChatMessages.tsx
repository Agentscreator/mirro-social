"use client"

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { 
  ChannelList, 
  ChannelPreview,
  Chat,
  Channel,
  MessageList,
  MessageInput,
  Thread,
  Window,
  ChannelHeader,
  useChatContext
} from 'stream-chat-react'
import { useStreamContext } from '@/components/providers/StreamProvider'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import 'stream-chat-react/dist/css/v2/index.css'

interface StreamChatMessagesProps {
  selectedUserId?: string
}

export function StreamChatMessages({ selectedUserId }: StreamChatMessagesProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { client, isReady } = useStreamContext()
  const [selectedChannel, setSelectedChannel] = useState<any>(null)

  useEffect(() => {
    if (!client || !isReady || !selectedUserId) return

    const initializeChannel = async () => {
      try {
        // Create or get direct message channel
        const channelId = [session?.user?.id, selectedUserId].sort().join('-')
        const channel = client.channel('messaging', channelId, {
          members: [session?.user?.id, selectedUserId],
          name: `DM between users`,
        })

        await channel.watch()
        setSelectedChannel(channel)
      } catch (error) {
        console.error('Error initializing channel:', error)
      }
    }

    initializeChannel()
  }, [client, isReady, selectedUserId, session?.user?.id])

  if (!client || !isReady) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  const filters = { 
    type: 'messaging', 
    members: { $in: [session?.user?.id] } 
  }
  const sort = { last_message_at: -1 }

  if (selectedUserId && selectedChannel) {
    // Show individual chat
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center gap-3 p-4 bg-white border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/messages')}
            className="-ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        
        <div className="flex-1">
          <Channel channel={selectedChannel}>
            <Window>
              <ChannelHeader />
              <MessageList />
              <MessageInput />
            </Window>
            <Thread />
          </Channel>
        </div>
      </div>
    )
  }

  // Show channel list
  return (
    <div className="h-screen flex flex-col">
      <div className="flex items-center justify-between p-4 bg-white border-b">
        <h1 className="text-lg font-semibold">Messages</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/discover')}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
      
      <div className="flex-1">
        <ChannelList
          filters={filters}
          sort={sort}
          options={{ limit: 20 }}
          Preview={(props) => (
            <div 
              className="p-4 hover:bg-gray-50 cursor-pointer border-b"
              onClick={() => {
                const otherMember = props.channel.state.members 
                  ? Object.values(props.channel.state.members).find(
                      member => member.user?.id !== session?.user?.id
                    )
                  : null
                
                if (otherMember?.user?.id) {
                  router.push(`/messages/${otherMember.user.id}`)
                }
              }}
            >
              <ChannelPreview {...props} />
            </div>
          )}
        />
      </div>
    </div>
  )
}