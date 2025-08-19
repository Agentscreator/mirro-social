"use client"

import { useState, useEffect, useRef } from "react";
import VideoFeedItem from "@/components/VideoFeedItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Users, ChevronUp, ChevronDown, Loader2, Clock, Radio, Heart, UserPlus, MapPin } from "lucide-react";
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

interface LiveEvent {
  id: number;
  title: string;
  description?: string;
  scheduledStartTime: string;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  location?: string;
  user: {
    id: string;
    username: string;
    profileImage?: string;
    image?: string;
  };
}

interface LiveStream {
  id: number;
  title: string;
  description?: string;
  viewerCount: number;
  category?: string;
  thumbnailUrl?: string;
  user: {
    id: string;
    username: string;
    profileImage?: string;
    image?: string;
  };
}

export default function FeedPage() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("explore");
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  
  // Feed data states
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [followingPosts, setFollowingPosts] = useState<Post[]>([]);
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [liveStreams, setLiveStreams] = useState<LiveStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [excludeIds, setExcludeIds] = useState<number[]>([]);

  // Get current posts based on active tab
  const getCurrentPosts = () => {
    switch (activeTab) {
      case "following":
        return followingPosts;
      case "live":
        return []; // Live content handled separately
      default:
        return explorePosts;
    }
  };

  // Fetch feed posts
  const fetchPosts = async (cursor?: string, excludePostIds: number[] = [], searchTerm?: string, feedType: string = "explore") => {
    try {
      const params = new URLSearchParams();
      if (cursor) params.append('cursor', cursor);
      if (searchTerm) params.append('search', searchTerm);
      if (feedType) params.append('type', feedType);
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

  // Fetch live events
  const fetchLiveEvents = async () => {
    try {
      const response = await fetch('/api/live/events');
      if (!response.ok) throw new Error('Failed to fetch live events');
      const data = await response.json();
      setLiveEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching live events:', error);
    }
  };

  // Fetch live streams
  const fetchLiveStreams = async () => {
    try {
      const response = await fetch('/api/live/streams');
      if (!response.ok) throw new Error('Failed to fetch live streams');
      const data = await response.json();
      setLiveStreams(data.streams || []);
    } catch (error) {
      console.error('Error fetching live streams:', error);
    }
  };
  
  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load initial posts based on active tab
  useEffect(() => {
    const loadContent = async () => {
      if (!session?.user?.id) return;
      
      setLoading(true);
      setCurrentVideoIndex(0);

      if (activeTab === "live") {
        await Promise.all([fetchLiveEvents(), fetchLiveStreams()]);
      } else {
        const data = await fetchPosts(undefined, [], debouncedSearchQuery || undefined, activeTab);
        
        if (activeTab === "explore") {
          setExplorePosts(data.posts || []);
        } else if (activeTab === "following") {
          setFollowingPosts(data.posts || []);
        }
        
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
        setExcludeIds([]);
      }
      
      setLoading(false);
    };
    
    loadContent();
  }, [session?.user?.id, debouncedSearchQuery, activeTab]);

  // Trigger initial autoplay after posts load
  useEffect(() => {
    if (!loading && getCurrentPosts().length > 0 && currentVideoIndex === 0 && activeTab !== "live") {
      const triggerAutoplay = () => {
        window.dispatchEvent(new CustomEvent('initialAutoplayTrigger'));
      };

      triggerAutoplay();
      const timer1 = setTimeout(triggerAutoplay, 100);
      const timer2 = setTimeout(triggerAutoplay, 500);
      const timer3 = setTimeout(triggerAutoplay, 1000);
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [loading, getCurrentPosts().length, currentVideoIndex, activeTab]);

  // Listen for new posts
  useEffect(() => {
    const handleFeedRefresh = async () => {
      if (session?.user?.id && !loading) {
        const data = await fetchPosts(undefined, [], debouncedSearchQuery || undefined, activeTab);
        
        if (activeTab === "explore") {
          setExplorePosts(data.posts || []);
        } else if (activeTab === "following") {
          setFollowingPosts(data.posts || []);
        }
        
        setHasMore(data.hasMore || false);
        setNextCursor(data.nextCursor || null);
        setExcludeIds([]);
        setCurrentVideoIndex(0);
      }
    };

    window.addEventListener('postCreated', handleFeedRefresh);
    window.addEventListener('feedRefresh', handleFeedRefresh);
    
    return () => {
      window.removeEventListener('postCreated', handleFeedRefresh);
      window.removeEventListener('feedRefresh', handleFeedRefresh);
    };
  }, [session?.user?.id, loading, debouncedSearchQuery, activeTab]);
  
  // Load more posts when needed
  const loadMorePosts = async () => {
    if (!hasMore || !nextCursor || activeTab === "live") return;
    
    const data = await fetchPosts(nextCursor, excludeIds, debouncedSearchQuery || undefined, activeTab);
    
    if (activeTab === "explore") {
      setExplorePosts(prev => [...prev, ...(data.posts || [])]);
    } else if (activeTab === "following") {
      setFollowingPosts(prev => [...prev, ...(data.posts || [])]);
    }
    
    setHasMore(data.hasMore || false);
    setNextCursor(data.nextCursor || null);
  };

  const currentPosts = getCurrentPosts();

  // Navigation functions for desktop up/down buttons
  const goToNextVideo = async () => {
    if (currentVideoIndex < currentPosts.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      setCurrentVideoIndex(nextIndex);
      const container = containerRef.current;
      if (container) {
        container.scrollTo({
          top: nextIndex * window.innerHeight,
          behavior: 'smooth'
        });
      }
    } else if (hasMore && activeTab !== "live") {
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

  // Handle scroll for video navigation
  useEffect(() => {
    const container = containerRef.current;
    if (!container || activeTab === "live") return;

    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const { scrollTop, clientHeight } = container;
          const videoIndex = Math.round(scrollTop / clientHeight);
          
          if (videoIndex !== currentVideoIndex) {
            setCurrentVideoIndex(videoIndex);
          }
          
          if (videoIndex >= currentPosts.length - 2 && hasMore && !loading) {
            loadMorePosts();
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentPosts.length, hasMore, loading, currentVideoIndex, activeTab]);

  // Handle live event participation
  const handleJoinEvent = async (eventId: number) => {
    try {
      const response = await fetch(`/api/live/events/${eventId}/join`, {
        method: 'POST',
      });
      if (response.ok) {
        fetchLiveEvents(); // Refresh events
        toast({
          title: "Success",
          description: "Joined event successfully!",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join event",
        variant: "destructive",
      });
    }
  };

  // Handle live stream viewing
  const handleWatchStream = (streamId: number) => {
    router.push(`/live/stream/${streamId}`);
  };

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
  if (loading && currentPosts.length === 0 && activeTab !== "live") {
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

  return (
    <>
      <div className="fixed inset-0 md:relative md:h-screen bg-black overflow-hidden z-30 feed-container feed-page">
        
        {/* Feed Tabs */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/95 to-transparent">
          <div className="px-4 pt-8 pb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-black/50 backdrop-blur-md border border-white/10">
                <TabsTrigger 
                  value="explore" 
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  <Heart className="w-4 h-4 mr-1" />
                  For You
                </TabsTrigger>
                <TabsTrigger 
                  value="following" 
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Following
                </TabsTrigger>
                <TabsTrigger 
                  value="live" 
                  className="text-white data-[state=active]:bg-white/20 data-[state=active]:text-white"
                >
                  <Radio className="w-4 h-4 mr-1" />
                  Live
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Search Bar */}
        {activeTab !== "live" && (
          <div className="absolute top-20 right-4 z-40">
            {showSearchBar ? (
              <div className="relative w-80">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/60" />
                <Input
                  placeholder="Search..."
                  className="pl-12 pr-12 py-3 bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-full backdrop-blur-sm focus:bg-white/20 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus={true}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white rounded-full w-8 h-8"
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
                className="text-white hover:bg-white/10 rounded-full w-12 h-12"
                onClick={() => setShowSearchBar(true)}
              >
                <Search className="h-5 w-5" />
              </Button>
            )}
          </div>
        )}

        {/* Tab Content */}
        <Tabs value={activeTab} className="h-full">
          
          {/* Explore/For You Tab */}
          <TabsContent value="explore" className="h-full mt-0">
            {currentPosts.length === 0 && !loading ? (
              <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
                <div className="text-center text-white px-8 max-w-sm">
                  <div className="mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                      <Heart className="w-8 h-8 text-white/60" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-3">No posts yet</h2>
                  <p className="text-white/70 text-sm mb-6 leading-relaxed">
                    Your feed is empty right now. Check back later for new content from the community!
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Navigation Controls */}
                <div className="hidden md:flex fixed right-4 xl:right-12 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                    onClick={goToPreviousVideo}
                    disabled={currentVideoIndex === 0}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                    onClick={goToNextVideo}
                    disabled={currentVideoIndex >= currentPosts.length - 1 && !hasMore}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>

                {/* Video Feed */}
                <div 
                  ref={containerRef}
                  className="h-full overflow-y-scroll snap-y snap-mandatory absolute inset-0 pt-24"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    paddingBottom: 'env(safe-area-inset-bottom)'
                  }}
                >
                  <div className="w-full md:flex md:justify-center">
                    <div className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] md:max-w-md">
                      {currentPosts.map((post, index) => (
                        <div key={post.id} className="h-screen w-full snap-start snap-always relative">
                          <VideoFeedItem
                            post={post}
                            showInviteButton={true}
                            isActive={index === currentVideoIndex}
                          />
                        </div>
                      ))}
                      
                      {hasMore && (
                        <div className="h-screen flex items-center justify-center bg-black">
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                            <p className="text-white/70 text-base">Loading more videos...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Following Tab */}
          <TabsContent value="following" className="h-full mt-0">
            {currentPosts.length === 0 && !loading ? (
              <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center">
                <div className="text-center text-white px-8 max-w-sm">
                  <div className="mb-6">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                      <UserPlus className="w-8 h-8 text-white/60" />
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-3">No posts from following</h2>
                  <p className="text-white/70 text-sm mb-6 leading-relaxed">
                    Follow some users to see their content here!
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Navigation Controls */}
                <div className="hidden md:flex fixed right-4 xl:right-12 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                    onClick={goToPreviousVideo}
                    disabled={currentVideoIndex === 0}
                  >
                    <ChevronUp className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all"
                    onClick={goToNextVideo}
                    disabled={currentVideoIndex >= currentPosts.length - 1 && !hasMore}
                  >
                    <ChevronDown className="h-5 w-5" />
                  </Button>
                </div>

                {/* Video Feed */}
                <div 
                  ref={containerRef}
                  className="h-full overflow-y-scroll snap-y snap-mandatory absolute inset-0 pt-24"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    paddingBottom: 'env(safe-area-inset-bottom)'
                  }}
                >
                  <div className="w-full md:flex md:justify-center">
                    <div className="w-full md:w-[400px] lg:w-[450px] xl:w-[500px] md:max-w-md">
                      {currentPosts.map((post, index) => (
                        <div key={post.id} className="h-screen w-full snap-start snap-always relative">
                          <VideoFeedItem
                            post={post}
                            showInviteButton={true}
                            isActive={index === currentVideoIndex}
                          />
                        </div>
                      ))}
                      
                      {hasMore && (
                        <div className="h-screen flex items-center justify-center bg-black">
                          <div className="flex flex-col items-center gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                            <p className="text-white/70 text-base">Loading more videos...</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Live Tab */}
          <TabsContent value="live" className="h-full mt-0">
            <div className="h-full overflow-y-auto pt-24 pb-20">
              <div className="max-w-4xl mx-auto px-4 space-y-8">
                
                {/* Live Events Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-red-500" />
                    <h2 className="text-xl font-bold text-white">Live Events</h2>
                  </div>
                  
                  {liveEvents.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                        <Clock className="w-8 h-8 text-red-500" />
                      </div>
                      <p className="text-white/70">No live events at the moment</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liveEvents.map((event) => {
                        const eventDate = new Date(event.scheduledStartTime)
                        const now = new Date()
                        const isLive = event.status === 'live'
                        const isScheduled = event.status === 'scheduled'
                        const timeUntilStart = eventDate.getTime() - now.getTime()
                        const minutesUntilStart = Math.ceil(timeUntilStart / (1000 * 60))
                        
                        return (
                          <div key={event.id} className={`bg-gray-900/50 backdrop-blur-sm rounded-xl border p-6 transition-all ${
                            isLive 
                              ? 'border-red-500/50 bg-red-500/10' 
                              : 'border-gray-700/50'
                          }`}>
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                                  {isLive && (
                                    <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium animate-pulse">
                                      LIVE
                                    </div>
                                  )}
                                  {isScheduled && minutesUntilStart <= 60 && minutesUntilStart > 0 && (
                                    <div className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium">
                                      Starts in {minutesUntilStart}m
                                    </div>
                                  )}
                                </div>
                                {event.description && (
                                  <p className="text-gray-400 text-sm mb-2">{event.description}</p>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="w-4 h-4" />
                                  {isLive ? (
                                    <span className="text-red-400 font-medium">Live now</span>
                                  ) : (
                                    <span>
                                      {eventDate.toLocaleDateString()} at {eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>
                                {event.location && (
                                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{event.location}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {event.user.username[0]?.toUpperCase()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-gray-400">
                                {event.currentParticipants}/{event.maxParticipants} participants
                              </div>
                              <Button
                                size="sm"
                                className={isLive 
                                  ? "bg-red-600 hover:bg-red-700" 
                                  : "bg-gray-600 hover:bg-gray-700"
                                }
                                onClick={() => handleJoinEvent(event.id)}
                                disabled={!isLive}
                              >
                                {isLive ? 'Join Live Event' : 'Waiting to Start'}
                              </Button>
                            </div>
                            
                            {/* Auto-activation message for scheduled events */}
                            {isScheduled && (
                              <div className="mt-3 p-2 bg-blue-900/30 border border-blue-700/30 rounded-lg">
                                <p className="text-xs text-blue-200">
                                  ⏰ This event will automatically go live at the scheduled time
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Live Streams Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Radio className="w-5 h-5 text-blue-500" />
                    <h2 className="text-xl font-bold text-white">Live Streams</h2>
                  </div>
                  
                  {liveStreams.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Radio className="w-8 h-8 text-blue-500" />
                      </div>
                      <p className="text-white/70">No live streams at the moment</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {liveStreams.map((stream) => (
                        <div 
                          key={stream.id} 
                          className="bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden cursor-pointer hover:border-blue-500/50 transition-colors"
                          onClick={() => handleWatchStream(stream.id)}
                        >
                          <div className="aspect-video bg-gray-800 relative">
                            {stream.thumbnailUrl ? (
                              <img 
                                src={stream.thumbnailUrl} 
                                alt={stream.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Radio className="w-12 h-12 text-gray-600" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">
                              LIVE
                            </div>
                            <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                              {stream.viewerCount} viewers
                            </div>
                          </div>
                          <div className="p-4">
                            <h3 className="text-white font-medium mb-1 line-clamp-1">{stream.title}</h3>
                            <p className="text-gray-400 text-sm mb-2 line-clamp-2">{stream.description}</p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-semibold">
                                    {stream.user.username[0]?.toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-gray-400 text-sm">{stream.user.username}</span>
                              </div>
                              {stream.category && (
                                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                                  {stream.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}