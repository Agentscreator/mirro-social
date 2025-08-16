"use client"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Share, MoreHorizontal } from "lucide-react"
import { 
  WatchLayout, 
  WatchCard, 
  WatchButton, 
  WatchTitle, 
  WatchSubtitle,
  WatchAvatar,
  WatchStatusDot 
} from "./watch-layout"
import { cn } from "@/lib/utils"

interface WatchFeedProps {
  posts?: any[]
}

export function WatchFeed({ posts = [] }: WatchFeedProps) {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set())

  const handleLike = (postId: string) => {
    setLikedPosts(prev => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  // Mock data for demonstration
  const mockPosts = posts.length > 0 ? posts : [
    {
      id: "1",
      user: {
        name: "Alice",
        avatar: "/api/placeholder/32/32",
        status: "online"
      },
      content: "Just had an amazing coffee! ☕",
      timestamp: "2m ago",
      likes: 12,
      comments: 3
    },
    {
      id: "2",
      user: {
        name: "Bob",
        avatar: "/api/placeholder/32/32",
        status: "busy"
      },
      content: "Working on something exciting 🚀",
      timestamp: "5m ago",
      likes: 8,
      comments: 1
    },
    {
      id: "3",
      user: {
        name: "Carol",
        avatar: "/api/placeholder/32/32",
        status: "online"
      },
      content: "Beautiful sunset today 🌅",
      timestamp: "10m ago",
      likes: 24,
      comments: 7
    }
  ]

  return (
    <WatchLayout className="watch:block hidden">
      <div className="watch-flex-col">
        <WatchTitle>Feed</WatchTitle>
        
        <div className="watch-flex-col">
          {mockPosts.map((post) => (
            <WatchCard key={post.id} className="watch-fade-in">
              {/* User Info */}
              <div className="watch-flex-row mb-2">
                <div className="relative">
                  <WatchAvatar 
                    src={post.user.avatar} 
                    alt={post.user.name}
                  />
                  <WatchStatusDot 
                    status={post.user.status}
                    className="absolute -bottom-1 -right-1"
                  />
                </div>
                <div className="flex-1 ml-2">
                  <div className="watch-text-sm font-medium text-white">
                    {post.user.name}
                  </div>
                  <div className="watch-text-xs text-gray-400">
                    {post.timestamp}
                  </div>
                </div>
                <button className="watch-text-xs text-gray-400 p-1">
                  <MoreHorizontal className="w-3 h-3" />
                </button>
              </div>
              
              {/* Content */}
              <div className="watch-text-sm text-white mb-3 leading-relaxed">
                {post.content}
              </div>
              
              {/* Actions */}
              <div className="watch-flex-row justify-between">
                <button
                  onClick={() => handleLike(post.id)}
                  className={cn(
                    "watch-flex-row items-center gap-1 p-1 rounded",
                    likedPosts.has(post.id) 
                      ? "text-red-400" 
                      : "text-gray-400 hover:text-red-400"
                  )}
                >
                  <Heart 
                    className={cn(
                      "w-3 h-3",
                      likedPosts.has(post.id) && "fill-current"
                    )} 
                  />
                  <span className="watch-text-xs">
                    {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                  </span>
                </button>
                
                <button className="watch-flex-row items-center gap-1 p-1 rounded text-gray-400 hover:text-blue-400">
                  <MessageCircle className="w-3 h-3" />
                  <span className="watch-text-xs">{post.comments}</span>
                </button>
                
                <button className="p-1 rounded text-gray-400 hover:text-green-400">
                  <Share className="w-3 h-3" />
                </button>
              </div>
            </WatchCard>
          ))}
        </div>
        
        {mockPosts.length === 0 && (
          <WatchCard>
            <div className="text-center py-4">
              <WatchSubtitle>No posts yet</WatchSubtitle>
              <WatchButton 
                variant="primary" 
                className="mt-2"
                onClick={() => {/* Handle create post */}}
              >
                Create First Post
              </WatchButton>
            </div>
          </WatchCard>
        )}
      </div>
    </WatchLayout>
  )
}