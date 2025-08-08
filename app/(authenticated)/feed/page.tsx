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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
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
  const fetchPosts = async (cursor?: string, excludePostIds: number[] = [], searchTerm?: string) => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      if (searchTerm) params.append('search', searchTerm);
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
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load initial posts or search results
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      setCurrentVideoIndex(0); // Reset video index when searching
      const data = await fetchPosts(undefined, [], debouncedSearchQuery || undefined);
      setPosts(data.posts || []);
      setHasMore(data.hasMore || false);
      setNextCursor(data.nextCursor || null);
      setExcludeIds([]); // Reset exclude IDs
      setLoading(false);
    };
    
    if (session?.user?.id) {
      loadPosts();
    }
  }, [session?.user?.id, debouncedSearchQuery]);

  // Listen for new posts (refresh feed when posts are created)
  useEffect(() => {
    const handleFeedRefresh = async () => {
      console.log('🔄 Refreshing feed due to new post');
      // Reload posts from the beginning
      if (session?.user?.id && !loading) {
        const data = await fetchPosts(undefined, [], debouncedSearchQuery || undefined);
        setPosts(data.posts || []);
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
        setExcludeIds([]);
        setCurrentVideoIndex(0);
      }
    };

    // Listen for focus events to refresh feed when returning to the page
    const handleFocus = () => {
      handleFeedRefresh();
    };

    window.addEventListener('focus', handleFocus);
    
    // Custom event for post creation
    window.addEventListener('postCreated', handleFeedRefresh);
    window.addEventListener('feedRefresh', handleFeedRefresh);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('postCreated', handleFeedRefresh);
      window.removeEventListener('feedRefresh', handleFeedRefresh);
    };
  }, [session?.user?.id, loading, debouncedSearchQuery]);
  
  // Load more posts when needed
  const loadMorePosts = async () => {
    if (!hasMore || !nextCursor) return;
    
    const data = await fetchPosts(nextCursor, excludeIds, debouncedSearchQuery || undefined);
    setPosts(prev => [...prev, ...(data.posts || [])]);
    setHasMore(data.hasMore || false);
    setNextCursor(data.nextCursor || null);
  };



  // Use posts directly since we're doing server-side search
  const filteredPosts = posts;

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

    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const { scrollTop, clientHeight } = container;
          const videoIndex = Math.round(scrollTop / clientHeight);
          
          // Only update if index actually changed
          if (videoIndex !== currentVideoIndex) {
            setCurrentVideoIndex(videoIndex);
            console.log('📱 Current video index:', videoIndex);
          }
          
          // Load more when near the end
          if (videoIndex >= filteredPosts.length - 2 && hasMore && !loading) {
            console.log('🔄 Loading more posts...');
            loadMorePosts();
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [filteredPosts.length, hasMore, loading, currentVideoIndex]);

  // Show loading if no session
  if (!session) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          <p className="text-white/70 text-sm">Connecting...</p>
        </div>
      </div>
    );
  }
  
  // Show loading for initial load
  if (loading && posts.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 px-8">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-white" />
            <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-white/20"></div>
          </div>
          <div className="text-center">
            <p className="text-white text-lg font-medium mb-2">Loading your feed</p>
            <p className="text-white/60 text-sm">Discovering amazing content...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show empty state if no posts
  if (!loading && filteredPosts.length === 0) {
    return (
      <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center text-white px-8 max-w-sm">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <Search className="w-8 h-8 text-white/60" />
            </div>
          </div>
          <h2 className="text-xl font-bold mb-3">
            {searchQuery ? "No results found" : "No posts yet"}
          </h2>
          <p className="text-white/70 text-sm mb-6 leading-relaxed">
            {searchQuery 
              ? `We couldn't find any posts matching "${searchQuery}". Try a different search term.`
              : "Your feed is empty right now. Check back later for new content from the community!"
            }
          </p>
          {searchQuery && (
            <Button
              variant="outline"
              className="text-white border-white/30 hover:bg-white/10 rounded-full px-6 py-2"
              onClick={() => {
                setSearchQuery("");
                setShowSearchBar(false);
              }}
            >
              Clear Search
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black relative overflow-hidden">

      {/* Mobile Top Navigation */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/95 via-black/80 to-transparent">
        <div className="flex items-center justify-between p-4 pt-6">
          {/* Mobile Search */}
          {showSearchBar ? (
            <div className="flex-1 relative mr-3">
              {loading && searchQuery ? (
                <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70 animate-spin" />
              ) : (
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
              )}
              <Input
                placeholder="Search videos..."
                className="pl-12 pr-12 py-3 bg-white/15 border-white/30 text-white placeholder:text-white/70 rounded-full backdrop-blur-sm text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white rounded-full w-8 h-8"
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
              <div className="text-white font-bold text-xl tracking-wide">For You</div>
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-white hover:bg-white/20 rounded-full w-10 h-10 backdrop-blur-sm"
                  onClick={() => setShowSearchBar(true)}
                >
                  <Search className="h-5 w-5" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Desktop Search Icon - Top Right */}
      <div className="hidden md:block absolute top-6 right-6 z-50">
        {showSearchBar ? (
          <div className="relative w-96">
            {loading && searchQuery ? (
              <Loader2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70 animate-spin" />
            ) : (
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/70" />
            )}
            <Input
              placeholder="Search videos..."
              className="pl-12 pr-12 py-3 bg-white/15 border-white/30 text-white placeholder:text-white/70 rounded-full backdrop-blur-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white rounded-full w-8 h-8"
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
            className="text-white hover:bg-white/20 rounded-full bg-black/40 backdrop-blur-sm w-12 h-12"
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
            <div key={post.id} className="h-screen w-full snap-start snap-always relative flex items-center justify-center">
              <div className="w-full h-full relative">
                <VideoFeedItem
                  post={post}
                  showInviteButton={true}
                  isActive={index === currentVideoIndex}
                />
              </div>
            </div>
          ))}
          
          {/* Loading indicator at bottom */}
          {hasMore && (
            <div className="h-32 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
                <p className="text-white/70 text-sm">Loading more...</p>
              </div>
            </div>
          )}
        </div>
      </div>



    </div>
  );
}