import { Play, Pause, Heart, MessageCircle, UserPlus, MoreHorizontal, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteButton } from "@/components/invite-button";
import { CommentModal } from "@/components/CommentModal";
import { ShareButton } from "@/components/share-button";
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

// Mobile detection utility
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const isIOSDevice = () => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

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
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Detect mobile device
  useEffect(() => {
    setIsMobile(isMobileDevice());
    setIsIOS(isIOSDevice());
  }, []);

  // Mobile-specific video setup
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo() || !isMobile) return;

    // Configure video for mobile
    const setupMobileVideo = () => {
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('muted', 'true');
      video.controls = false;
      video.disablePictureInPicture = true;
      
      // iOS specific settings
      if (isIOS) {
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x-webkit-airplay', 'deny');
      }
      
      console.log('📱 Mobile video configured:', post.id);
    };

    setupMobileVideo();
    
    // Re-setup on video load
    video.addEventListener('loadedmetadata', setupMobileVideo);
    
    return () => {
      video.removeEventListener('loadedmetadata', setupMobileVideo);
    };
  }, [isMobile, isIOS, post.id]);

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

  // Mobile-optimized autoplay effect
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo()) return;

    const handleAutoplay = async () => {
      try {
        if (isActive && video.paused) {
          // Ensure video is properly configured for mobile
          video.muted = true;
          video.playsInline = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('webkit-playsinline', 'true');
          
          // Small delay to ensure video is ready
          setTimeout(async () => {
            try {
              await video.play();
              setIsPlaying(true);
              console.log('✅ Video playing:', post.id);
            } catch (playError) {
              console.log('⚠️ Autoplay blocked, user interaction required:', post.id);
              setIsPlaying(false);
            }
          }, 100);
        } else if (!isActive && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
      } catch (error) {
        console.log('Autoplay setup error:', error);
        setIsPlaying(false);
      }
    };

    handleAutoplay();
  }, [isActive, post.id]);

  // Listen for video play events and handle mobile interaction
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

    // Mobile-specific: Enable video playback on first user interaction
    const enableVideoPlayback = async () => {
      if (isMobile && video.paused) {
        try {
          video.muted = true;
          video.playsInline = true;
          // Just load the video, don't play yet
          video.load();
          console.log('📱 Video enabled for mobile interaction:', post.id);
        } catch (error) {
          console.log('Mobile video enable failed:', error);
        }
      }
    };

    // Listen for user interactions to enable video
    const interactionEvents = ['touchstart', 'touchend', 'click'];
    interactionEvents.forEach(event => {
      document.addEventListener(event, enableVideoPlayback, { once: true, passive: true });
    });

    window.addEventListener('forceVideoPlay', handleForceVideoPlay as EventListener);
    
    return () => {
      window.removeEventListener('forceVideoPlay', handleForceVideoPlay as EventListener);
      interactionEvents.forEach(event => {
        document.removeEventListener(event, enableVideoPlayback);
      });
    };
  }, [isActive, post.id, isMobile]);



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

  const handleComment = () => {
    console.log('Comment clicked for post:', post.id);
    setIsCommentModalOpen(true);
  };

  const handleCommentCountChange = (change: number) => {
    setCurrentComments(prev => Math.max(0, prev + change));
  };



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
            muted={true}
            loop
            playsInline={true}
            webkit-playsinline="true"
            x-webkit-airplay="deny"
            preload="metadata"
            poster={getMediaUrl()}
            controls={false}
            disablePictureInPicture={true}
            crossOrigin="anonymous"
            onPlay={() => {
              setIsPlaying(true);
              console.log('🎥 Video started playing:', post.id);
            }}
            onPause={() => {
              setIsPlaying(false);
              console.log('⏸️ Video paused:', post.id);
            }}
            onLoadedData={() => {
              console.log('📱 Video loaded:', post.id);
              // Ensure mobile-friendly settings
              if (videoRef.current) {
                const video = videoRef.current;
                video.muted = true;
                video.playsInline = true;
                video.setAttribute('playsinline', 'true');
                video.setAttribute('webkit-playsinline', 'true');
                
                // Try to play if active
                if (isActive && video.paused) {
                  video.play().catch((error) => {
                    console.log('⚠️ Autoplay blocked for post:', post.id, error);
                    setIsPlaying(false);
                  });
                }
              }
            }}
            onLoadedMetadata={() => {
              console.log('📊 Video metadata loaded:', post.id);
            }}
            onCanPlay={() => {
              console.log('▶️ Video can play:', post.id);
              // Additional attempt to play when ready
              if (isActive && videoRef.current?.paused) {
                videoRef.current.play().catch(() => {
                  console.log('⚠️ Play attempt failed:', post.id);
                });
              }
            }}
            onError={(e) => {
              console.error('❌ Video error for post:', post.id, e);
              setIsPlaying(false);
              setVideoError(true);
            }}
            onStalled={() => {
              console.log('🔄 Video stalled:', post.id);
            }}
            onWaiting={() => {
              console.log('⏳ Video buffering:', post.id);
            }}
            onSuspend={() => {
              console.log('⏸️ Video suspended:', post.id);
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
          <Button
            variant="ghost"
            size="icon"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              const video = videoRef.current;
              if (video) {
                try {
                  video.muted = true;
                  video.playsInline = true;
                  video.setAttribute('playsinline', 'true');
                  video.setAttribute('webkit-playsinline', 'true');
                  await video.play();
                  setIsPlaying(true);
                  console.log('▶️ Manual play triggered:', post.id);
                } catch (error) {
                  console.error('❌ Manual play failed:', post.id, error);
                  setIsPlaying(false);
                  // Show user-friendly message on mobile
                  if (isMobile) {
                    toast({
                      title: "Video Playback",
                      description: "Tap the video to play",
                      duration: 2000,
                    });
                  }
                }
              }
            }}
            onTouchStart={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className="w-20 h-20 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white backdrop-blur-md transition-all duration-300 border border-white/20 touch-manipulation video-controls"
          >
            <Play className="w-10 h-10 ml-1" />
          </Button>
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
              console.log('⏸️ Manual pause triggered:', post.id);
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

      {/* Bottom Content - Clean & Elegant */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pb-20 md:pb-8 pr-20">
        {/* User Info */}
        <div className="flex items-center space-x-3 mb-4">
          <Avatar 
            className="w-12 h-12 border-2 border-white cursor-pointer hover:scale-105 transition-transform duration-200"
            onClick={() => {
              window.location.href = `/profile/${post.user.id}`;
            }}
          >
            <AvatarImage src={getUserAvatar()} alt={getUserDisplayName()} />
            <AvatarFallback className="bg-white text-black font-semibold">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              window.location.href = `/profile/${post.user.id}`;
            }}
          >
            <h3 className="font-semibold text-white text-lg">{getUserDisplayName()}</h3>
            <p className="text-white/60 text-sm">@{post.user.username}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-white text-base mb-4 leading-relaxed font-medium">
          {post.content}
        </p>
        
        {/* Action Buttons - Horizontal Layout */}
        <div className="flex items-center space-x-6 mb-4">
          <button 
            onClick={handleLike}
            disabled={isLiking}
            className="flex items-center space-x-2 transition-all duration-200 hover:scale-105"
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            <span className="text-white text-sm font-medium">{currentLikes}</span>
          </button>
          
          <button 
            onClick={() => handleComment()}
            className="flex items-center space-x-2 transition-all duration-200 hover:scale-105"
          >
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="text-white text-sm font-medium">{currentComments}</span>
          </button>
          
          <ShareButton
            postId={post.id}
            content={post.content}
            userDisplayName={getUserDisplayName()}
            className="flex items-center space-x-2 transition-all duration-200 hover:scale-105 bg-transparent border-none p-0 h-auto"
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