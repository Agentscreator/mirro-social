"use client"

import { useState, useEffect, useRef, useCallback, ReactNode } from 'react'
import { calculateVisibleItems } from '@/lib/performance-utils'

interface VirtualListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  buffer?: number
  onScroll?: (scrollTop: number) => void
}

export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className = '',
  buffer = 5,
  onScroll
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const { start, end } = calculateVisibleItems(
    containerHeight,
    itemHeight,
    scrollTop,
    buffer
  )

  const visibleItems = items.slice(start, Math.min(end, items.length))
  const totalHeight = items.length * itemHeight
  const offsetY = start * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [onScroll])

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={start + index}
              style={{ height: itemHeight }}
            >
              {renderItem(item, start + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Specialized virtual list for posts
interface VirtualPostListProps {
  posts: any[]
  onPostClick?: (post: any) => void
  className?: string
}

export function VirtualPostList({
  posts,
  onPostClick,
  className = ''
}: VirtualPostListProps) {
  const renderPost = useCallback((post: any, index: number) => (
    <div
      key={post.id}
      className="p-4 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 transition-colors"
      onClick={() => onPostClick?.(post)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
          {post.user?.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-white">
              {post.user?.nickname || post.user?.username}
            </span>
            <span className="text-sm text-gray-400">
              {new Date(post.createdAt).toLocaleDateString()}
            </span>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed line-clamp-3">
            {post.content}
          </p>
          {(post.image || post.video) && (
            <div className="mt-2 text-xs text-blue-400">
              📎 {post.image ? 'Image' : 'Video'} attached
            </div>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span>❤️ {post.likes || 0}</span>
            <span>💬 {post.comments || 0}</span>
          </div>
        </div>
      </div>
    </div>
  ), [onPostClick])

  return (
    <VirtualList
      items={posts}
      itemHeight={120} // Approximate height per post
      containerHeight={600} // Adjust based on your layout
      renderItem={renderPost}
      className={className}
    />
  )
}