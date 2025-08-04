import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share, UserPlus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteButton } from "@/components/invite-button";
import { useState, useRef, useEffect } from "react";

interface VideoFeedItemProps {
  post: {
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
  };
  showInviteButton?: boolean;
  isActive?: boolean; // New prop to control autoplay
}

const VideoFeedItem = ({ 
  post,
  showInviteButton = false,
  isActive = false
}: VideoFeedItemProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentLikes, setCurrentLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Autoplay effect when component becomes active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo()) return;

    const handleAutoplay = async () => {
      try {
        if (isActive) {
          // Start playing when active
          await video.play();
          setIsPlaying(true);
          console.log('🎥 Video autoplay started for post:', post.id);
        } else {
          // Pause when not active
          video.pause();
          setIsPlaying(false);
          console.log('⏸️ Video paused for post:', post.id);
        }
      } catch (error) {
        console.error('Error handling video autoplay:', error);
        // Fallback: if autoplay fails, just set playing state
        setIsPlaying(false);
      }
    };

    handleAutoplay();
  }, [isActive, post.id]);

  // Intersection Observer for better autoplay control and performance
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const ratio = entry.intersectionRatio;
            
            if (ratio > 0.7) {
              // Video is mostly visible - play if active
              if (isActive && video.paused) {
                video.play().then(() => {
                  setIsPlaying(true);
                  console.log('🎥 Video started playing (intersection):', post.id);
                }).catch(console.error);
              }
            } else if (ratio > 0.3) {
              // Video is partially visible - preload but don't play
              if (video.readyState < 2) {
                video.load(); // Preload video
                console.log('📱 Video preloading:', post.id);
              }
            } else {
              // Video is barely visible - pause if playing
              if (!video.paused) {
                video.pause();
                setIsPlaying(false);
                console.log('⏸️ Video paused (not visible enough):', post.id);
              }
            }
          } else {
            // Video is not visible - pause and reset
            if (!video.paused) {
              video.pause();
              setIsPlaying(false);
              console.log('⏸️ Video paused (not intersecting):', post.id);
            }
          }
        });
      },
      { 
        threshold: [0, 0.3, 0.7, 1.0],
        rootMargin: '20px' 
      }
    );

    observer.observe(video);
    
    return () => observer.disconnect();
  }, [isActive, post.id]);

  const handleLike = async () => {
    if (isLiking) return;
    
    setIsLiking(true);
    const newLikedState = !isLiked;
    const newLikeCount = newLikedState ? currentLikes + 1 : currentLikes - 1;
    
    // Optimistic update
    setIsLiked(newLikedState);
    setCurrentLikes(newLikeCount);
    
    try {
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: newLikedState ? 'POST' : 'DELETE',
      });
      
      if (!response.ok) {
        // Revert on error
        setIsLiked(!newLikedState);
        setCurrentLikes(currentLikes);
      }
    } catch (error) {
      // Revert on error
      setIsLiked(!newLikedState);
      setCurrentLikes(currentLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const getBestImageUrl = (user: any): string | null => {
    if (user.profileImage && user.profileImage.trim() && !user.profileImage.includes("placeholder")) {
      return user.profileImage;
    }
    if (user.image && user.image.trim() && !user.image.includes("placeholder")) {
      return user.image;
    }
    return null;
  };

  const getMediaUrl = () => {
    return post.video || post.image || '/placeholder-video.jpg';
  };
  
  const isVideo = () => {
    return !!post.video;
  };
  
  const hasMedia = () => {
    return !!(post.video || post.image);
  };
  
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserDisplayName = () => {
    return post.user.nickname || post.user.username;
  };

  const getUserAvatar = () => {
    return getBestImageUrl(post.user) || '/placeholder-avatar.jpg';
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Media Background */}
      <div className="absolute inset-0">
        {isVideo() ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src={getMediaUrl()}
            muted={isMuted}
            loop
            playsInline
            preload="metadata"
            poster={getMediaUrl()}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadedData={() => {
              // Attempt autoplay when video is loaded and active
              if (isActive && videoRef.current) {
                videoRef.current.play().catch(console.error);
              }
            }}
            onError={(e) => {
              console.error('Video error for post:', post.id, e);
            }}
            onCanPlayThrough={() => {
              console.log('📹 Video can play through:', post.id);
            }}
            onWaiting={() => {
              console.log('⏳ Video buffering:', post.id);
            }}
          />
        ) : (
          <img
            className="w-full h-full object-cover"
            src={getMediaUrl()}
            alt="Post content"
          />
        )}
      </div>
      
      {/* Video Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Play/Pause Overlay - Only show for videos */}
      {isVideo() && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                if (isPlaying) {
                  video.pause();
                } else {
                  video.play().catch(console.error);
                }
              }
            }}
            className="w-16 h-16 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white backdrop-blur-sm transition-all duration-300"
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </Button>
        </div>
      )}
      
      {/* Duration Badge (if available) */}
      {post.duration && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
            {formatDuration(post.duration)}
          </div>
        </div>
      )}

      {/* Right Side Actions - TikTok Style */}
      <div className="absolute right-4 bottom-24 flex flex-col space-y-4 z-10">
        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLike}
            disabled={isLiking}
            className={`w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all ${
              isLiked ? 'text-red-400' : ''
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{currentLikes.toLocaleString()}</span>
        </div>

        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{post.comments.toLocaleString()}</span>
        </div>

        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
          >
            <Share className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">0</span>
        </div>

        {/* Volume control - Only show for videos */}
        {isVideo() && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                video.muted = !isMuted;
                setIsMuted(!isMuted);
                console.log('🔊 Video mute toggled:', !isMuted ? 'muted' : 'unmuted');
              }
            }}
            className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
          >
            {isMuted ? (
              <VolumeX className="w-6 h-6" />
            ) : (
              <Volume2 className="w-6 h-6" />
            )}
          </Button>
        )}
      </div>

      {/* Bottom Left Content */}
      <div className="absolute bottom-24 left-4 right-20 z-10">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-12 h-12 border-2 border-white/20">
            <AvatarImage src={getUserAvatar()} alt={getUserDisplayName()} />
            <AvatarFallback className="bg-primary text-white">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white text-sm">{getUserDisplayName()}</h3>
            <p className="text-white/80 text-xs">@{post.user.username}</p>
          </div>
        </div>

        <p className="text-white/90 text-sm mb-4 line-clamp-3">
          {post.content}
        </p>
        
        {showInviteButton && (
          <div className="mb-2">
            <InviteButton postId={post.id} />
          </div>
        )}
      </div>

    </div>
  );
};

export default VideoFeedItem;