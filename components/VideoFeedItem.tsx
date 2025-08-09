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

const VideoFeedItem = ({ 
  post,
  showInviteButton = false,
  isActive = false
}: VideoFeedItemProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // Start muted for better autoplay compliance
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
            onVolumeChange={() => {
              // Sync muted state with video element
              if (videoRef.current) {
                setIsMuted(videoRef.current.muted);
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
      
      {/* Tap to pause/unmute (invisible overlay) */}
      {isVideo() && isPlaying && (
        <div 
          className="absolute inset-0 z-5"
          onClick={() => {
            const video = videoRef.current;
            if (video) {
              if (isMuted) {
                // First tap unmutes
                setIsMuted(false);
                video.muted = false;
              } else {
                // Second tap pauses
                video.pause();
              }
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

      {/* Mute indicator */}
      {isVideo() && isMuted && isPlaying && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-black/60 text-white text-xs px-2 py-1 rounded-lg backdrop-blur-sm flex items-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.617 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.617l3.766-3.793a1 1 0 011.617.793zM14.657 5.757a1 1 0 011.414 0A9.972 9.972 0 0119 12a9.972 9.972 0 01-2.929 7.071 1 1 0 11-1.414-1.414A7.971 7.971 0 0017 12c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.829a1 1 0 011.414 0A5.983 5.983 0 0115 12a5.983 5.983 0 01-1.758 4.243 1 1 0 01-1.414-1.415A3.987 3.987 0 0013 12a3.987 3.987 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
              <path d="M3.5 9.5L17.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Tap to unmute
          </div>
        </div>
      )}

      {/* Right Side Actions - TikTok Style */}
      <div className="absolute right-3 bottom-32 md:bottom-28 flex flex-col space-y-6 z-20">
        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleLike}
            disabled={isLiking}
            className={`w-12 h-12 rounded-full transition-all duration-200 ${
              isLiked 
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                : 'bg-black/40 text-white hover:bg-black/60'
            } backdrop-blur-sm border border-white/10`}
          >
            <Heart className={`w-7 h-7 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <span className="text-white text-xs mt-2 font-semibold drop-shadow-lg">
            {currentLikes > 999 ? `${(currentLikes / 1000).toFixed(1)}K` : currentLikes.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleComment()}
            className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-200 border border-white/10"
          >
            <MessageCircle className="w-7 h-7" />
          </Button>
          <span className="text-white text-xs mt-2 font-semibold drop-shadow-lg">
            {post.comments > 999 ? `${(post.comments / 1000).toFixed(1)}K` : post.comments.toLocaleString()}
          </span>
        </div>

        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handleShare()}
            className="w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm transition-all duration-200 border border-white/10"
          >
            <Share className="w-7 h-7" />
          </Button>
          <span className="text-white text-xs mt-2 font-semibold drop-shadow-lg">Share</span>
        </div>
      </div>

      {/* Bottom Left Content - TikTok Style */}
      <div className="absolute bottom-6 left-4 right-24 z-20">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar 
            className="w-10 h-10 border-2 border-white/30 cursor-pointer hover:border-white/60 transition-all duration-200"
            onClick={() => {
              // Navigate to user profile
              window.location.href = `/profile/${post.user.id}`;
            }}
          >
            <AvatarImage src={getUserAvatar()} alt={getUserDisplayName()} />
            <AvatarFallback className="bg-primary text-white text-sm">
              {getUserDisplayName().charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => {
              // Navigate to user profile
              window.location.href = `/profile/${post.user.id}`;
            }}
          >
            <h3 className="font-bold text-white text-base drop-shadow-lg">{getUserDisplayName()}</h3>
            <p className="text-white/70 text-sm drop-shadow-lg">@{post.user.username}</p>
          </div>
        </div>

        <p className="text-white text-sm mb-4 line-clamp-3 drop-shadow-lg leading-relaxed">
          {post.content}
        </p>
        
        <div className="space-y-3">
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
              className="bg-black/40 border-white/20 text-white hover:bg-black/60 backdrop-blur-sm transition-all duration-200"
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