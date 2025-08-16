import { Play, Pause, Heart, MessageCircle, Share, UserPlus, MoreHorizontal, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InviteButton } from "@/components/invite-button";
import { CommentModal } from "@/components/CommentModal";
import { useState, useRef, useEffect } from "react";
import { toast } from "@/hooks/use-toast";

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
  const [isMuted, setIsMuted] = useState(false); // Always unmuted
  const [currentLikes, setCurrentLikes] = useState(post.likes);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isLiking, setIsLiking] = useState(false);
  const [currentComments, setCurrentComments] = useState(post.comments);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const handleShare = async () => {
    try {
      console.log('Sharing post:', post.id);
      
      // Call the share API to get proper share data
      const response = await fetch(`/api/posts/${post.id}/share`, {
        method: "POST",
      });

      if (response.ok) {
        const shareData = await response.json();
        console.log('✅ Share data received:', shareData);
        
        // Try native sharing first on mobile
        if (navigator.share && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
          try {
            await navigator.share({
              title: shareData.title || `Check out this post by ${getUserDisplayName()}`,
              text: shareData.text || post.content,
              url: shareData.url,
            });
            console.log('✅ Native share successful');
            return;
          } catch (shareError) {
            console.log("Native share failed, falling back to clipboard");
          }
        }

        // Fallback to clipboard
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(shareData.url);
          console.log('✅ Link copied to clipboard');
          toast({
            title: "Link Copied!",
            description: "Post link has been copied to your clipboard.",
          });
        } else {
          // Fallback for older browsers
          const textArea = document.createElement("textarea");
          textArea.value = shareData.url;
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
            document.execCommand("copy");
            console.log('✅ Link copied to clipboard (fallback)');
            toast({
              title: "Link Copied!",
              description: "Post link has been copied to your clipboard.",
            });
          } catch (err) {
            console.error('Failed to copy link');
            toast({
              title: "Share Link",
              description: `Copy this link: ${shareData.url}`,
            });
          }
          document.body.removeChild(textArea);
        }
      } else {
        const errorText = await response.text();
        console.error('Share API failed:', response.status, errorText);
        throw new Error('Failed to generate share link');
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      // Fallback to basic sharing
      const fallbackUrl = `${window.location.origin}/post/${post.id}`;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(fallbackUrl);
          toast({
            title: "Link Copied!",
            description: "Post link has been copied to your clipboard.",
          });
        } catch {
          toast({
            title: "Share Link",
            description: `Copy this link: ${fallbackUrl}`,
          });
        }
      } else {
        toast({
          title: "Share Link",
          description: `Copy this link: ${fallbackUrl}`,
        });
      }
    }
  };

  const handleLocationRequest = async () => {
    if (isRequestingLocation) return;
    
    try {
      setIsRequestingLocation(true);
      
      const response = await fetch('/api/location-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId: post.id,
        }),
      });

      if (response.ok) {
        toast({
          title: "Request Sent!",
          description: "Your location request has been sent to the post owner.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send location request');
      }
    } catch (error) {
      console.error('Error requesting location:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send location request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRequestingLocation(false);
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Media Background - Full Screen */}
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
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
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

      {/* Play/Pause Overlay - Only show for videos, more subtle like TikTok */}
      {isVideo() && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const video = videoRef.current;
              if (video) {
                video.play().catch(console.error);
              }
            }}
            className="w-20 h-20 rounded-full bg-black/40 hover:bg-black/60 text-white hover:text-white backdrop-blur-md transition-all duration-300 border border-white/20"
          >
            <Play className="w-10 h-10 ml-1" />
          </Button>
        </div>
      )}
      
      {/* Tap to pause (invisible overlay) */}
      {isVideo() && isPlaying && (
        <div 
          className="absolute inset-0 z-5"
          onClick={() => {
            const video = videoRef.current;
            if (video) {
              video.pause();
            }
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



      {/* Right Side Actions - Minimal Design */}
      <div className="absolute right-4 bottom-32 md:bottom-28 flex flex-col space-y-4 z-20">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleLike}
          disabled={isLiking}
          className={`w-10 h-10 rounded-full transition-all duration-200 ${
            isLiked 
              ? 'bg-white text-black' 
              : 'bg-white/10 text-white hover:bg-white/20'
          } backdrop-blur-sm`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleComment()}
          className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>

        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => handleShare()}
          className="w-10 h-10 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all duration-200"
        >
          <Share className="w-5 h-5" />
        </Button>
      </div>

      {/* Bottom Content - Clean & Elegant */}
      <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pb-8">
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
        
        {/* Invite Section */}
        {showInviteButton && (
          <div className="mb-4">
            <InviteButton postId={post.id} postUserId={post.user.id} />
          </div>
        )}
        
        {/* Location */}
        {locationData && (
          <div className="flex items-center text-white/80 text-sm mb-2">
            <MapPin className="h-4 w-4 mr-2" />
            <span>{locationData.locationName || "Location available"}</span>
            {!locationData.locationAddress && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleLocationRequest}
                disabled={isRequestingLocation}
                className="ml-2 text-white hover:text-white hover:bg-white/10 p-1 h-auto"
              >
                {isRequestingLocation ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Request Details"
                )}
              </Button>
            )}
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