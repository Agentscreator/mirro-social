"use client"

import { useState, useEffect, useRef } from "react";
import VideoFeedItem from "@/components/VideoFeedItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Users, ChevronUp, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function FeedPage() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();

  const mockVideos = [
    {
      video: {
        id: "1",
        thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=800&h=1200&fit=crop",
        duration: "0:45",
        title: "Amazing React Animation Tutorial 🚀"
      },
      author: {
        name: "Alex Chen",
        username: "alexchen",
        avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
      },
      description: "Learn how to create smooth animations in React with Framer Motion! This technique will make your apps feel more engaging and professional. Perfect for beginners! #ReactJS #Animation #WebDev",
      likes: 12400,
      comments: 234,
      shares: 89,
      isLiked: true,
      showInviteButton: true
    },
    {
      video: {
        id: "2", 
        thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=1200&fit=crop",
        duration: "1:20",
        title: "Join Our Startup Team! 💼"
      },
      author: {
        name: "Sarah Martinez",
        username: "sarahmartinez",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612c4c0?w=100&h=100&fit=crop&crop=face"
      },
      description: "We're hiring talented developers and designers! Come build the future of collaborative software with us. Remote-first company with amazing benefits. Apply now! 🌟",
      likes: 8900,
      comments: 156,
      shares: 245,
      isLiked: false,
      showInviteButton: true
    },
    {
      video: {
        id: "3",
        thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&h=1200&fit=crop",
        duration: "2:15",
        title: "Epic Code Review Session 👨‍💻"
      },
      author: {
        name: "Mike Johnson",
        username: "mikejohnson",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
      },
      description: "Breaking down complex algorithms step by step! Today we're optimizing a React component that was causing performance issues. Watch how small changes make huge impacts!",
      likes: 15600,
      comments: 312,
      shares: 178,
      isLiked: false,
      showInviteButton: true
    },
    {
      video: {
        id: "4",
        thumbnail: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=1200&fit=crop",
        duration: "0:58",
        title: "Design System Magic ✨"
      },
      author: {
        name: "Emma Davis",
        username: "emmadavis",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
      },
      description: "Showing how a consistent design system transforms your entire product experience. From buttons to layouts, everything just works together perfectly! 🎨",
      likes: 9800,
      comments: 189,
      shares: 134,
      isLiked: true,
      showInviteButton: true
    }
  ];

  // Filter videos based on search query only
  const filteredVideos = mockVideos.filter(video => {
    const matchesSearch = searchQuery === "" || 
      video.video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.author.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  // Navigation functions for desktop up/down buttons
  const goToNextVideo = () => {
    if (currentVideoIndex < filteredVideos.length - 1) {
      const nextIndex = currentVideoIndex + 1;
      setCurrentVideoIndex(nextIndex);
      const container = containerRef.current;
      if (container) {
        container.scrollTo({
          top: nextIndex * window.innerHeight,
          behavior: 'smooth'
        });
      }
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
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Show loading if no session
  if (!session) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
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
          disabled={currentVideoIndex >= filteredVideos.length - 1}
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
          {filteredVideos.map((item, index) => (
            <div key={item.video.id} className="h-screen w-full snap-start relative">
              <VideoFeedItem
                video={item.video}
                author={item.author}
                description={item.description}
                likes={item.likes}
                comments={item.comments}
                shares={item.shares}
                isLiked={item.isLiked}
                showInviteButton={item.showInviteButton}
              />
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}