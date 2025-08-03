"use client"

import { useState, useEffect, useRef } from "react";
import VideoFeedItem from "@/components/VideoFeedItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";

interface Post {
  id: number;
  content: string;
  image?: string;
  video?: string;
  duration?: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    nickname?: string;
    profileImage?: string;
    image?: string;
  };
  likes: number;
  isLiked: boolean;
  comments: number;
}

export default function FeedPage() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  
  // Real feed data
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [excludeIds, setExcludeIds] = useState<number[]>([]);

  // Fetch feed posts
  const fetchPosts = async (cursor?: string, excludePostIds: number[] = []) => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      params.append('limit', '10');
      if (excludePostIds.length > 0) {
        params.append('excludeIds', excludePostIds.join(','));
      }
      
      const response = await fetch(`/api/feed?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching posts:', error);
      toast({
        title: "Error",
        description: "Failed to load posts",
        variant: "destructive",
      });
      return { posts: [], hasMore: false, nextCursor: null };
    }
  };
  
  // Load initial posts
  useEffect(() => {
    const loadInitialPosts = async () => {
      setLoading(true);
      const data = await fetchPosts();
      setPosts(data.posts || []);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
      setLoading(false);
    };
    
    if (session?.user?.id) {
      loadInitialPosts();
    }
  }, [session?.user?.id]);
  
  // Load more posts when needed
  const loadMorePosts = async () => {
    if (!hasMore || !nextCursor) return;
    
    const data = await fetchPosts(nextCursor, excludeIds);
    setPosts(prev => [...prev, ...(data.posts || [])]);
    setHasMore(data.hasMore || false);
    setNextCursor(data.nextCursor || null);
  };

  // Filter posts based on search query
  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchQuery === "" || 
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.user.nickname && post.user.nickname.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSearch;
  });

  // Navigation functions for desktop up/down buttons
  const goToNextVideo = async () => {
    if (currentVideoIndex < filteredPosts.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      setCurrentVideoIndex(nextIndex);
      const container = containerRef.current;
      if (container) {
        container.scrollTo({
          top: nextIndex * window.innerHeight,
          behavior: 'smooth'
        });
      }
    } else if (hasMore) {
      // Load more posts when reaching the end
      await loadMorePosts();
    }
  };

  const goToPreviousVideo = () => {
    if (currentVideoIndex > 0) {
      const prevIndex = currentVideoIndex - 1;
      setCurrentVideoIndex(prevIndex);
      const container = containerRef.current;
      if (container) {
        container.scrollTo({
          top: prevIndex * window.innerHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, clientHeight } = container;
      const videoIndex = Math.round(scrollTop / clientHeight);
      setCurrentVideoIndex(videoIndex);
      
      // Load more when near the end
      if (videoIndex >= filteredPosts.length - 2 && hasMore && !loading) {
        loadMorePosts();
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [filteredPosts.length, hasMore, loading]);

  // Show loading if no session
  if (!session) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }
  
  // Show loading for initial load
  if (loading && posts.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-white text-sm">Loading feed...</p>
        </div>
      </div>
    );
  }
  
  // Show empty state if no posts
  if (!loading && filteredPosts.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <p className="text-lg mb-2">No posts found</p>
          <p className="text-sm text-white/70">Check back later for new content!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative overflow-hidden">

      {/* Mobile Top Navigation */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/90 to-transparent">
        <div className="flex items-center justify-between p-4">
          {/* Mobile Search */}
          {showSearchBar ? (
            <div className="flex-1 relative mr-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              <Input
                placeholder="Search videos..."
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/70 rounded-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                onClick={() => {
                  setShowSearchBar(false);
                  setSearchQuery("");
                }}
              >
                ✕
              </Button>
            </div>
          ) : (
            <>
              <div className="text-white font-semibold">For You</div>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/10 rounded-full"
                onClick={() => setShowSearchBar(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* Desktop Search Icon - Top Right */}
      <div className="hidden md:block absolute top-6 right-6 z-50">
        {showSearchBar ? (
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            <Input
              placeholder="Search videos..."
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/70 rounded-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
              onClick={() => {
                setShowSearchBar(false);
                setSearchQuery("");
              }}
            >
              ✕
            </Button>
          </div>
        ) : (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 rounded-full bg-black/30 backdrop-blur-sm"
            onClick={() => setShowSearchBar(true)}
          >
            <Search className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Desktop Navigation Controls - Far Right */}
      <div className="hidden md:flex fixed right-4 top-1/2 -translate-y-1/2 z-50 flex-col gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
          onClick={goToPreviousVideo}
          disabled={currentVideoIndex === 0}
        >
          <ChevronUp className="h-6 w-6" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-12 h-12 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
          onClick={goToNextVideo}
          disabled={currentVideoIndex >= filteredPosts.length - 1 && !hasMore}
        >
          <ChevronDown className="h-6 w-6" />
        </Button>
      </div>

      {/* Video Feed */}
      <div 
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory flex justify-center items-start pt-16 md:pt-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .h-full::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        <div className="w-full md:w-[90vw] lg:w-[85vw] xl:w-[80vw] max-w-6xl">
          {filteredPosts.map((post, index) => (
            <div key={post.id} className="h-screen w-full snap-start relative">
              <VideoFeedItem
                post={post}
                showInviteButton={true}
              />
            </div>
          ))}
          
          {/* Loading indicator at bottom */}
          {hasMore && (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>
      </div>

    </div>
  );
}