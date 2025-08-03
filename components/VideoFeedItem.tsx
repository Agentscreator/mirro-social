import { Play, Pause, Volume2, VolumeX, Heart, MessageCircle, Share, UserPlus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";

interface VideoFeedItemProps {
  video: {
    id: string;
    thumbnail: string;
    duration: string;
    title: string;
  };
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  description: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked?: boolean;
  showInviteButton?: boolean;
}

const VideoFeedItem = ({ 
  video, 
  author, 
  description, 
  likes, 
  comments, 
  shares,
  isLiked = false,
  showInviteButton = false 
}: VideoFeedItemProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [inviteStatus, setInviteStatus] = useState<'accept' | 'sent' | 'accepted'>('accept');

  const handleInviteClick = () => {
    if (inviteStatus === 'accept') {
      setInviteStatus('sent');
    }
  };

  const getInviteButton = () => {
    switch (inviteStatus) {
      case 'accept':
        return (
          <Button 
            size="sm" 
            onClick={handleInviteClick}
            className="bg-white text-black hover:bg-white/90 backdrop-blur-sm transition-all font-medium px-4"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Accept Invite
          </Button>
        );
      case 'sent':
        return (
          <Button 
            size="sm" 
            disabled
            className="bg-orange-500 text-white backdrop-blur-sm font-medium px-4 cursor-default"
          >
            Invite Request Sent
          </Button>
        );
      case 'accepted':
        return (
          <Button 
            size="sm" 
            disabled
            className="bg-blue-500 text-white backdrop-blur-sm font-medium px-4 cursor-default"
          >
            Accepted
          </Button>
        );
    }
  };

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${video.thumbnail})` }}
      />
      
      {/* Video Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Play/Pause Overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-16 h-16 rounded-full bg-black/30 hover:bg-black/50 text-white hover:text-white backdrop-blur-sm transition-all duration-300"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </Button>
      </div>

      {/* Right Side Actions - TikTok Style */}
      <div className="absolute right-4 bottom-24 flex flex-col space-y-4 z-10">
        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className={`w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all ${
              isLiked ? 'text-red-400' : ''
            }`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{likes.toLocaleString()}</span>
        </div>

        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
          >
            <MessageCircle className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{comments.toLocaleString()}</span>
        </div>

        <div className="flex flex-col items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
          >
            <Share className="w-6 h-6" />
          </Button>
          <span className="text-white text-xs mt-1 font-medium">{shares.toLocaleString()}</span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMuted(!isMuted)}
          className="w-12 h-12 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all"
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6" />
          ) : (
            <Volume2 className="w-6 h-6" />
          )}
        </Button>
      </div>

      {/* Bottom Left Content */}
      <div className="absolute bottom-24 left-4 right-20 z-10">
        <div className="flex items-center space-x-3 mb-3">
          <Avatar className="w-12 h-12 border-2 border-white/20">
            <AvatarImage src={author.avatar} alt={author.name} />
            <AvatarFallback className="bg-primary text-white">
              {author.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-white text-sm">{author.name}</h3>
            <p className="text-white/80 text-xs">@{author.username}</p>
          </div>
        </div>

        <h2 className="text-white font-semibold text-base mb-2">
          {video.title}
        </h2>
        <p className="text-white/90 text-sm mb-4 line-clamp-2">
          {description}
        </p>
        
        {showInviteButton && (
          <div className="mb-2">
            {getInviteButton()}
          </div>
        )}
      </div>

    </div>
  );
};

export default VideoFeedItem;