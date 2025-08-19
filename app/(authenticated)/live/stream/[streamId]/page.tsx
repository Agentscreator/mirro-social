"use client"

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Send, Users, Heart, Share, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface LiveStream {
  id: number;
  title: string;
  description?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  viewerCount: number;
  category?: string;
  startedAt: string;
  user: {
    id: string;
    username: string;
    profileImage?: string;
    image?: string;
  };
}

interface ChatMessage {
  id: number;
  message: string;
  messageType: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    profileImage?: string;
    image?: string;
  };
}

export default function LiveStreamPage({ params }: { params: { streamId: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [stream, setStream] = useState<LiveStream | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamId = parseInt(params.streamId);

  // Fetch stream details
  const fetchStream = async () => {
    try {
      const response = await fetch(`/api/live/streams/${streamId}`);
      if (!response.ok) throw new Error('Failed to fetch stream');
      const data = await response.json();
      setStream(data.stream);
    } catch (error) {
      console.error('Error fetching stream:', error);
      toast({
        title: "Error",
        description: "Failed to load stream",
        variant: "destructive",
      });
      router.push('/feed');
    } finally {
      setLoading(false);
    }
  };

  // Fetch chat messages
  const fetchChatMessages = async () => {
    try {
      const response = await fetch(`/api/live/streams/${streamId}/chat`);
      if (!response.ok) throw new Error('Failed to fetch chat');
      const data = await response.json();
      setChatMessages(data.messages || []);
    } catch (error) {
      console.error('Error fetching chat:', error);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`/api/live/streams/${streamId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (response.ok) {
        setNewMessage("");
        fetchChatMessages(); // Refresh chat
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  // Join stream as viewer
  const joinStream = async () => {
    try {
      await fetch(`/api/live/streams/${streamId}/join`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error joining stream:', error);
    }
  };

  // Leave stream
  const leaveStream = async () => {
    try {
      await fetch(`/api/live/streams/${streamId}/leave`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error leaving stream:', error);
    }
  };

  // Handle like
  const handleLike = async () => {
    try {
      const response = await fetch(`/api/live/streams/${streamId}/like`, {
        method: 'POST',
      });
      if (response.ok) {
        setIsLiked(!isLiked);
      }
    } catch (error) {
      console.error('Error liking stream:', error);
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Fetch initial data
  useEffect(() => {
    if (streamId && session?.user?.id) {
      fetchStream();
      fetchChatMessages();
      joinStream();
    }

    // Cleanup on unmount
    return () => {
      if (streamId && session?.user?.id) {
        leaveStream();
      }
    };
  }, [streamId, session?.user?.id]);

  // Refresh chat periodically
  useEffect(() => {
    const interval = setInterval(fetchChatMessages, 3000);
    return () => clearInterval(interval);
  }, [streamId]);

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading stream...</div>
      </div>
    );
  }

  if (!stream) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Stream not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col md:flex-row overflow-hidden">
      
      {/* Video Player Section */}
      <div className="flex-1 relative">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-white font-semibold text-lg">{stream.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <span>{stream.user.username}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{stream.viewerCount}</span>
                  </div>
                  <span>•</span>
                  <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                    LIVE
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
                onClick={handleLike}
              >
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10"
              >
                <Share className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
          {stream.streamUrl ? (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              controls
              autoPlay
              playsInline
            >
              <source src={stream.streamUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          ) : (
            <div className="text-center text-white">
              <div className="w-32 h-32 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                <Users className="w-16 h-16 text-gray-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Stream Loading</h3>
              <p className="text-gray-400">The stream will start shortly...</p>
            </div>
          )}
        </div>

        {/* Mobile Chat Toggle */}
        <div className="md:hidden absolute bottom-4 right-4">
          <Button
            onClick={() => setShowChat(!showChat)}
            className="bg-black/50 text-white border border-white/20"
          >
            Chat {showChat ? '✕' : '💬'}
          </Button>
        </div>
      </div>

      {/* Chat Section */}
      <div className={`${showChat ? 'block' : 'hidden'} md:block w-full md:w-80 bg-gray-900 border-l border-gray-800 flex flex-col`}>
        
        {/* Chat Header */}
        <div className="p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold">Live Chat</h3>
          <p className="text-gray-400 text-sm">{chatMessages.length} messages</p>
        </div>

        {/* Chat Messages */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
        >
          {chatMessages.map((message) => (
            <div key={message.id} className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold">
                  {message.user.username[0]?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">
                    {message.user.username}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-gray-300 text-sm break-words">{message.message}</p>
              </div>
            </div>
          ))}
          
          {chatMessages.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <p>No messages yet. Be the first to say hello!</p>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Say something..."
              className="flex-1 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  sendMessage();
                }
              }}
              maxLength={500}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}