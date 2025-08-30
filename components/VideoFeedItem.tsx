import { Play, Pause, Heart, MessageCircle, UserPlus, MoreHorizontal, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteButton } from "@/components/invite-button";
import { CommentModal } from "@/components/CommentModal";
import { ShareButton } from "@/components/share-button";
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

// Import mobile utilities
import { isMobileDevice, isNativeApp, isIOSDevice } from '@/lib/mobile-utils';

interface VideoFeedItemProps {
  post: {
    id: number;
    content: string;
    image?: string;
    video?: string;
    duration?: number;
    createdAt: string;
    hasPrivateLocation?: boolean;
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

interface LocationData {
  hasLocation: boolean;
  locationName?: string;
  locationAddress?: string;
}

const VideoFeedItem = ({ 
  post,
  showInviteButton = false,
  isActive = false
}: VideoFeedItemProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay
  const [currentLikes, setCurrentLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [currentComments, setCurrentComments] = useState(post.comments);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isNative, setIsNative] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Simplified device detection
  useEffect(() => {
    const mobile = isMobileDevice();
    const ios = isIOSDevice();
    const native = isNativeApp();
    
    setIsMobile(mobile);
    setIsIOS(ios);
    setIsNative(native);
    
    console.log('🔍 Device detection for post', post.id, ':', { mobile, ios, native });
  }, [post.id]);

  // Simplified video setup for all platforms
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo()) return;

    // Basic video configuration that works everywhere
    video.muted = true;
    video.playsInline = true;
    video.controls = false;
    video.disablePictureInPicture = true;
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    
    console.log('🎬 Video configured for post:', post.id, 'URL:', video.src);
  }, [post.id]);

  // Sync comment count when post prop changes
  useEffect(() => {
    setCurrentComments(post.comments);
  }, [post.comments]);

  // Fetch location data if post has private location
  useEffect(() => {
    if (post.hasPrivateLocation) {
      fetch(`/api/posts/${post.id}/location`)
        .then(response => response.json())
        .then(data => {
          if (data.hasLocation) {
            setLocationData(data);
          }
        })
        .catch(error => {
          console.error('Error fetching location:', error);
        });
    }
  }, [post.id, post.hasPrivateLocation]);

  // Simplified autoplay effect that works on all platforms
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo()) return;

    const handleAutoplay = async () => {
      if (isActive && video.paused) {
        try {
          // Ensure proper configuration
          video.muted = true;
          video.playsInline = true;
          
          console.log('🎬 Attempting video play:', post.id);
          await video.play();
          setIsPlaying(true);
          console.log('✅ Video playing:', post.id);
        } catch (error) {
          console.log('⚠️ Autoplay failed:', post.id, error);
          setIsPlaying(false);
          // Don't show error toast for autoplay failures, it's expected
        }
      } else if (!isActive && !video.paused) {
        video.pause();
        setIsPlaying(false);
      }
    };

    // Small delay to ensure video is ready
    const timer = setTimeout(handleAutoplay, 100);
    return () => clearTimeout(timer);
  }, [isActive, post.id]);

  // Simple video event handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo()) return;

    const handleForceVideoPlay = async (event: CustomEvent) => {
      try {
        const { postId } = event.detail;
        if (postId === post.id && isActive) {
          video.muted = true;
          await video.play();
          setIsPlaying(true);
        }
      } catch (error) {
        console.log('Video play failed:', error);
      }
    };

    window.addEventListener('forceVideoPlay', handleForceVideoPlay as EventListener);
    
    return () => {
      window.removeEventListener('forceVideoPlay', handleForceVideoPlay as EventListener);
    };
  }, [isActive, post.id]);



  // Simplified intersection observer for better performance
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo()) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Video is visible - try to play if active
            if (isActive && video.paused) {
              video.play().then(() => {
                setIsPlaying(true);
              }).catch(() => {
                setIsPlaying(false);
              });
            }
          } else {
            // Video is not visible enough - pause
            if (!video.paused) {
              video.pause();
              setIsPlaying(false);
            }
          }
        });
      },
      { 
        threshold: [0.5],
        rootMargin: '10px' 
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
      console.log(`${newLikedState ? 'Liking' : 'Unliking'} post ${post.id}`);
      
      const response = await fetch(`/api/posts/${post.id}/like`, {
        method: newLikedState ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log("Like response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Like failed:", response.status, errorText);
        // Revert on error
        setIsLiked(!newLikedState);
        setCurrentLikes(currentLikes);
        toast({
          title: "Error",
          description: "Failed to like post. Please try again.",
          variant: "destructive",
        });
      } else {
        const result = await response.json();
        console.log("✅ Like successful:", result);
        // Update with server response to ensure consistency
        if (result.likes !== undefined) {
          setCurrentLikes(result.likes);
        }
        if (result.isLiked !== undefined) {
          setIsLiked(result.isLiked);
        }
      }
    } catch (error) {
      console.error("Like error:", error);
      // Revert on error
      setIsLiked(!newLikedState);
      setCurrentLikes(currentLikes);
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      });
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
    const url = post.video || post.image || '/placeholder-video.jpg';
    console.log('Media URL for post', post.id, ':', url);
    return url;
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

  const handleComment = () => {
    console.log('Comment clicked for post:', post.id);
    setIsCommentModalOpen(true);
  };

  const handleCommentCountChange = (change: number) => {
    setCurrentComments(prev => Math.max(0, prev + change));
  };



  // Debug post data
  console.log('Rendering VideoFeedItem for post:', post.id, {
    hasVideo: !!post.video,
    hasImage: !!post.image,
    mediaUrl: getMediaUrl(),
    isActive
  });

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Media Background - Full Screen */}
      <div className="absolute inset-0">
        {videoError ? (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
                <Play className="w-8 h-8" />
              </div>
              <p className="text-sm text-white/70">Video unavailable</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setVideoError(false);
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="mt-2 text-white/60 hover:text-white"
              >
                Retry
              </Button>
            </div>
          </div>
        ) : isVideo() ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            src={getMediaUrl()}
            muted
            loop
            playsInline
            webkit-playsinline="true"
            preload="metadata"
            poster={post.image || getMediaUrl()}
            controls={false}
            disablePictureInPicture
            crossOrigin="anonymous"
            onPlay={() => {
              console.log('Video playing for post:', post.id);
              setIsPlaying(true);
            }}
            onPause={() => {
              console.log('Video paused for post:', post.id);
              setIsPlaying(false);
            }}
            onLoadedData={() => {
              console.log('Video loaded for post:', post.id);
              // Try to play if active
              if (isActive && videoRef.current?.paused) {
                videoRef.current.play().then(() => {
                  setIsPlaying(true);
                }).catch(() => {
                  setIsPlaying(false);
                });
              }
            }}
            onCanPlay={() => {
              console.log('Video can play for post:', post.id);
            }}
            onError={(e) => {
              console.error('Video error for post:', post.id, e);
              setIsPlaying(false);
              setVideoError(true);
            }}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              backgroundColor: '#000'
            }}
          />
        ) : (
          <img
            className="w-full h-full object-cover"
            src={getMediaUrl()}
            alt="Post content"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        )}
      </div>
      
      {/* Video Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Play/Pause Overlay - Mobile optimized */}
      {isVideo() && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10 video-overlay">
          <div className="flex flex-col items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const video = videoRef.current;
                if (video) {
                  try {
                    console.log('🎬 Manual play button clicked:', post.id);
                    
                    // Ensure video is properly configured
                    video.muted = true;
                    video.playsInline = true;
                    
                    // Try to play
                    await video.play();
                    setIsPlaying(true);
                    console.log('✅ Video playing from button click:', post.id);
                  } catch (error) {
                    console.error('❌ Manual video play failed:', post.id, error);
                    setIsPlaying(false);
                    
                    // Show user-friendly error message
                    toast({
                      title: "Video Playback Issue",
                      description: "Unable to play video. Please try again.",
                      variant: "destructive",
                      duration: 3000,
                    });
                  }
                }
              }}
              className="w-20 h-20 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white backdrop-blur-md transition-all duration-300 border border-white/20 touch-manipulation video-controls"
            >
              <Play className="w-10 h-10 ml-1" />
            </Button>

          </div>
        </div>
      )}
      
      {/* Tap to pause (invisible overlay) - Mobile optimized */}
      {isVideo() && isPlaying && (
        <div 
          className="absolute inset-0 z-5 touch-manipulation video-overlay"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const video = videoRef.current;
            if (video && !video.paused) {
              video.pause();
              setIsPlaying(false);
            }
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        />
      )}
      
      {/* Duration Badge (if available) */}
      {post.duration && (
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm">
            {formatDuration(post.duration)}
          </div>
        </div>
      )}



      {/* Right Side Actions - Hidden for cleaner swipe experience */}
      <div className="absolute right-4 bottom-36 md:bottom-28 flex flex-col space-y-4 z-30 opacity-0 pointer-events-none">
        {/* Actions hidden to prevent interference with swiping */}
      </div>

      {/* Bottom Content - Mobile Optimized */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pb-24 md:pb-8 pr-4 mobile-padding" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6rem)' }}>
        {/* User Info - Mobile Optimized */}
        <div className="flex items-center space-x-3 mb-4 mobile-gap">
          <Avatar 
            className="w-14 h-14 border-2 border-white cursor-pointer hover:scale-105 transition-transform duration-200 touch-manipulation"
            onClick={() => {
              window.location.href = `/profile/${post.user.id}`;
            }}
          >
            <AvatarImage src={getUserAvatar()} alt={getUserDisplayName()} />
            <AvatarFallback className="bg-white text-black font-semibold text-lg">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity touch-manipulation"
            onClick={() => {
              window.location.href = `/profile/${post.user.id}`;
            }}
          >
            <h3 className="font-semibold text-white text-xl leading-tight">{getUserDisplayName()}</h3>
            <p className="text-white/60 text-base">@{post.user.username}</p>
          </div>
        </div>

        {/* Content - Mobile Optimized */}
        <p className="text-white text-lg mb-6 leading-relaxed font-medium">
          {post.content}
        </p>
        
        {/* Action Buttons - Mobile Optimized Layout */}
        <div className="flex items-center space-x-8 mb-6 mobile-gap">
          <button 
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center space-x-3 transition-all duration-200 hover:scale-105 touch-manipulation min-h-12 min-w-12"
          >
            <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            <span className="text-white text-base font-medium">{currentLikes}</span>
          </button>
          
          <button 
            onClick={() => handleComment()}
            className="flex items-center space-x-3 transition-all duration-200 hover:scale-105 touch-manipulation min-h-12 min-w-12"
          >
            <MessageCircle className="w-7 h-7 text-white" />
            <span className="text-white text-base font-medium">{currentComments}</span>
          </button>
          
          <ShareButton
            postId={post.id}
            content={post.content}
            userDisplayName={getUserDisplayName()}
            className="flex items-center space-x-3 transition-all duration-200 hover:scale-105 bg-transparent border-none p-0 h-auto touch-manipulation min-h-12"
            variant="ghost"
          />
        </div>
        
        {/* Invite Section */}
        {showInviteButton && (
          <div className="mb-4">
            <InviteButton postId={post.id} postUserId={post.user.id} />
          </div>
        )}
        
        {/* Location */}
        {locationData && (
          <div className="text-white/80 text-sm mb-2">
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
              <div className="flex-1">
                {locationData.locationName && (
                  <div className="font-medium">{locationData.locationName}</div>
                )}
                {locationData.locationAddress && (
                  <div className="text-xs text-white/60 mt-0.5">{locationData.locationAddress}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        postId={post.id}
        postContent={post.content}
        postUser={{
          username: post.user.username,
          nickname: post.user.nickname,
          profileImage: getBestImageUrl(post.user),
        }}
        onCommentCountChange={handleCommentCountChange}
      />

    </div>
  );
};

export default VideoFeedItem;