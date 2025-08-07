import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share, UserPlus, MoreHorizontal, MapPin, Loader2 } from "lucide-react";
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
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
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
            onClick={() => handleComment()}
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
            onClick={() => handleShare()}
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
        
        <div className="space-y-2">
          {showInviteButton && (
            <div>
              <InviteButton postId={post.id} postUserId={post.user.id} />
            </div>
          )}
          
          {post.hasPrivateLocation && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleLocationRequest}
              disabled={isRequestingLocation}
              className="bg-black/30 border-white/20 text-white hover:bg-black/50 backdrop-blur-sm"
            >
              {isRequestingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              Request Location
            </Button>
          )}
        </div>
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
      />

    </div>
  );
};

export default VideoFeedItem;