"use client"

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Upload, Heart, MessageCircle, Share, MoreVertical, Users, Link, Copy, Check, Play, Pause, Volume2, VolumeX, Download, Eye, Calendar, ImageIcon, Video, Grid3X3, List, Filter, Search, Settings, Lock, Globe } from 'lucide-react';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
  caption: string;
  contributor: {
    name: string;
    username: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  views: number;
  createdAt: string;
  duration?: number; // for videos in seconds
}

interface AlbumDetails {
  id: string;
  title: string;
  description: string;
  creator: {
    name: string;
    username: string;
    avatar: string;
  };
  contributors: Array<{
    name: string;
    username: string;
    avatar: string;
  }>;
  isPublic: boolean;
  createdAt: string;
  media: MediaItem[];
  totalViews: number;
  coverImage?: string;
}

export default function EnhancedAlbumDetailPage({ params }: { params: { albumId: string } }) {
  const router = useRouter();
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [mediaCaption, setMediaCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'images' | 'videos'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [mutedVideos, setMutedVideos] = useState<Set<string>>(new Set());
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement }>({});

  // Mock enhanced album data
  const mockAlbum: AlbumDetails = {
    id: params.albumId,
    title: "Travel Adventures 2024",
    description: "Collecting amazing travel photos and videos from around the world. Share your best travel moments and discover new destinations through the eyes of fellow travelers.",
    creator: {
      name: "Sarah Wilson",
      username: "sarahw",
      avatar: "/placeholder.svg?height=100&width=100"
    },
    contributors: [
      {
        name: "Sarah Wilson",
        username: "sarahw",
        avatar: "/placeholder.svg?height=100&width=100"
      },
      {
        name: "Mike Chen",
        username: "mikec",
        avatar: "/placeholder.svg?height=100&width=100"
      },
      {
        name: "Emma Davis",
        username: "emmad",
        avatar: "/placeholder.svg?height=100&width=100"
      },
      {
        name: "Alex Johnson",
        username: "alexj",
        avatar: "/placeholder.svg?height=100&width=100"
      }
    ],
    isPublic: true,
    createdAt: "2024-01-15",
    totalViews: 1247,
    coverImage: "/placeholder.svg?height=400&width=600",
    media: [
      {
        id: "1",
        url: "/placeholder.svg?height=400&width=600",
        type: 'image',
        caption: "Amazing sunset at Santorini! The most beautiful view I've ever seen 🌅 #travel #sunset #greece",
        contributor: {
          name: "Sarah Wilson",
          username: "sarahw",
          avatar: "/placeholder.svg?height=100&width=100"
        },
        likes: 24,
        comments: 5,
        views: 156,
        createdAt: "2024-01-20"
      },
      {
        id: "2",
        url: "/placeholder.svg?height=400&width=600",
        thumbnailUrl: "/placeholder.svg?height=400&width=600",
        type: 'video',
        caption: "Epic mountain hiking adventure in the Alps! The journey to the summit was challenging but absolutely worth it. Check out this incredible view! 🏔️",
        contributor: {
          name: "Mike Chen",
          username: "mikec",
          avatar: "/placeholder.svg?height=100&width=100"
        },
        likes: 31,
        comments: 8,
        views: 203,
        createdAt: "2024-01-18",
        duration: 45
      },
      {
        id: "3",
        url: "/placeholder.svg?height=400&width=600",
        type: 'image',
        caption: "Crystal clear waters in the Maldives. Paradise found! 🏝️ The water is so clear you can see the bottom even at 20 feet deep.",
        contributor: {
          name: "Emma Davis",
          username: "emmad",
          avatar: "/placeholder.svg?height=100&width=100"
        },
        likes: 42,
        comments: 12,
        views: 298,
        createdAt: "2024-01-16"
      },
      {
        id: "4",
        url: "/placeholder.svg?height=400&width=600",
        thumbnailUrl: "/placeholder.svg?height=400&width=600",
        type: 'video',
        caption: "Walking through the bustling streets of Tokyo at night. The neon lights and energy of this city are incredible! 🌃✨",
        contributor: {
          name: "Alex Johnson",
          username: "alexj",
          avatar: "/placeholder.svg?height=100&width=100"
        },
        likes: 28,
        comments: 6,
        views: 187,
        createdAt: "2024-01-14",
        duration: 32
      },
      {
        id: "5",
        url: "/placeholder.svg?height=400&width=600",
        type: 'image',
        caption: "Northern Lights in Iceland - nature's most spectacular light show! Waited 3 hours in -15°C but it was absolutely worth it ❄️✨",
        contributor: {
          name: "Sarah Wilson",
          username: "sarahw",
          avatar: "/placeholder.svg?height=100&width=100"
        },
        likes: 67,
        comments: 15,
        views: 445,
        createdAt: "2024-01-12"
      },
      {
        id: "6",
        url: "/placeholder.svg?height=400&width=600",
        thumbnailUrl: "/placeholder.svg?height=400&width=600",
        type: 'video',
        caption: "Safari adventure in Kenya! Got so close to these magnificent elephants. What an incredible experience! 🐘",
        contributor: {
          name: "Mike Chen",
          username: "mikec",
          avatar: "/placeholder.svg?height=100&width=100"
        },
        likes: 39,
        comments: 9,
        views: 234,
        createdAt: "2024-01-10",
        duration: 28
      }
    ]
  };

  React.useEffect(() => {
    setAlbum(mockAlbum);
  }, [params.albumId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleContribute = async () => {
    if (!selectedFile || !mediaCaption || !album) return;
    
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMediaCaption("");
      setSelectedFile(null);
      setIsContributeOpen(false);
    } catch (error) {
      console.error('Error adding media to album:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShareUrl(`${window.location.origin}/album/${params.albumId}?share=true`);
    } catch (error) {
      console.error('Error generating share link:', error);
    }
  };

  const handleCopyShareLink = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  };

  const handleOpenShare = () => {
    setIsShareOpen(true);
    if (!shareUrl) {
      handleGenerateShareLink();
    }
  };

  const toggleVideoPlay = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      if (playingVideo === videoId) {
        video.pause();
        setPlayingVideo(null);
      } else {
        // Pause other videos
        Object.values(videoRefs.current).forEach(v => v.pause());
        video.play();
        setPlayingVideo(videoId);
      }
    }
  };

  const toggleVideoMute = (videoId: string) => {
    const video = videoRefs.current[videoId];
    if (video) {
      video.muted = !video.muted;
      const newMutedVideos = new Set(mutedVideos);
      if (video.muted) {
        newMutedVideos.add(videoId);
      } else {
        newMutedVideos.delete(videoId);
      }
      setMutedVideos(newMutedVideos);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredMedia = album?.media.filter(item => {
    const matchesType = filterType === 'all' || 
      (filterType === 'images' && item.type === 'image') ||
      (filterType === 'videos' && item.type === 'video');
    
    const matchesSearch = searchQuery === '' || 
      item.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.contributor.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  }) || [];

  const mediaStats = {
    total: album?.media.length || 0,
    images: album?.media.filter(m => m.type === 'image').length || 0,
    videos: album?.media.filter(m => m.type === 'video').length || 0
  };

  if (!album) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading album...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{album.title}</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Eye className="w-3 h-3" />
                <span>{album.totalViews.toLocaleString()} views</span>
                <span>•</span>
                <Calendar className="w-3 h-3" />
                <span>{album.createdAt}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleOpenShare}>
              <Share className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Enhanced Album Info */}
        <div className="bg-white rounded-2xl p-8 mb-8 shadow-lg border border-gray-100">
          {/* Cover Image */}
          {album.coverImage && (
            <div className="relative h-48 md:h-64 rounded-xl overflow-hidden mb-6">
              <img 
                src={album.coverImage || "/placeholder.svg"} 
                alt="Album cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4 text-white">
                <h2 className="text-2xl font-bold mb-1">{album.title}</h2>
                <div className="flex items-center gap-4 text-sm">
                  <span>{mediaStats.total} items</span>
                  <span>•</span>
                  <span>{album.contributors.length} contributors</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16 ring-4 ring-blue-100">
                <AvatarImage src={album.creator.avatar || "/placeholder.svg"} alt={album.creator.name} />
                <AvatarFallback className="bg-blue-500 text-white text-lg">
                  {album.creator.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{album.creator.name}</h3>
                <p className="text-gray-600">@{album.creator.username}</p>
                <div className="flex items-center gap-2 mt-1">
                  {album.isPublic ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      <Globe className="w-3 h-3 mr-1" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-700 mb-6 text-lg leading-relaxed">{album.description}</p>

          {/* Enhanced Contributors */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-gray-600" />
              <span className="text-gray-600 font-medium">{album.contributors.length} contributors</span>
              <div className="flex -space-x-3">
                {album.contributors.slice(0, 6).map((contributor, index) => (
                  <Avatar key={index} className="w-8 h-8 border-2 border-white ring-1 ring-gray-200">
                    <AvatarImage src={contributor.avatar || "/placeholder.svg"} alt={contributor.name} />
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {contributor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {album.contributors.length > 6 && (
                  <div className="w-8 h-8 bg-gray-200 rounded-full border-2 border-white ring-1 ring-gray-200 flex items-center justify-center">
                    <span className="text-xs text-gray-600 font-medium">+{album.contributors.length - 6}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Media Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <ImageIcon className="w-4 h-4" />
                <span>{mediaStats.images} photos</span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="w-4 h-4" />
                <span>{mediaStats.videos} videos</span>
              </div>
            </div>
          </div>

          {/* Enhanced Contribute Button */}
          <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 h-12 text-lg font-medium shadow-lg">
                <Plus className="w-5 h-5 mr-2" />
                Contribute Photos & Videos
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200 max-w-md">
              <DialogHeader>
                <DialogTitle className="text-gray-900 text-xl">Add Media to Album</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-3 block">Select Photo or Video</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="cursor-pointer">
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 mb-1">
                        {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                      </p>
                      <p className="text-xs text-gray-500">
                        Supports JPG, PNG, MP4, MOV up to 50MB
                      </p>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Caption</label>
                  <Textarea
                    value={mediaCaption}
                    onChange={(e) => setMediaCaption(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900 min-h-[100px]"
                    placeholder="Share the story behind this moment... #travel #adventure"
                    rows={4}
                  />
                </div>
                <Button
                  onClick={handleContribute}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 h-11"
                  disabled={!selectedFile || !mediaCaption || loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </div>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Album
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Enhanced Controls */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>

              {/* Filter Tabs */}
              <Tabs value={filterType} onValueChange={(value) => setFilterType(value as any)}>
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="all" className="text-sm">
                    All ({mediaStats.total})
                  </TabsTrigger>
                  <TabsTrigger value="images" className="text-sm">
                    Photos ({mediaStats.images})
                  </TabsTrigger>
                  <TabsTrigger value="videos" className="text-sm">
                    Videos ({mediaStats.videos})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search media..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        {/* Enhanced Media Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMedia.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-all duration-300 group border-0 shadow-lg">
                <div className="relative">
                  {item.type === 'image' ? (
                    <img
                      src={item.url || "/placeholder.svg"}
                      alt={item.caption}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="relative">
                      <video
                        ref={(el) => {
                          if (el) videoRefs.current[item.id] = el;
                        }}
                        src={item.url}
                        poster={item.thumbnailUrl}
                        className="w-full h-64 object-cover"
                        muted={mutedVideos.has(item.id)}
                        loop
                      />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Button
                          variant="secondary"
                          size="icon"
                          className="w-12 h-12 rounded-full bg-white/90 hover:bg-white shadow-lg"
                          onClick={() => toggleVideoPlay(item.id)}
                        >
                          {playingVideo === item.id ? (
                            <Pause className="w-5 h-5" />
                          ) : (
                            <Play className="w-5 h-5 ml-0.5" />
                          )}
                        </Button>
                      </div>
                      {item.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                          {formatDuration(item.duration)}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white"
                        onClick={() => toggleVideoMute(item.id)}
                      >
                        {mutedVideos.has(item.id) ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                  
                  {/* Media Type Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-black/70 text-white border-0">
                      {item.type === 'image' ? (
                        <ImageIcon className="w-3 h-3 mr-1" />
                      ) : (
                        <Video className="w-3 h-3 mr-1" />
                      )}
                      {item.type}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={item.contributor.avatar || "/placeholder.svg"} alt={item.contributor.name} />
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {item.contributor.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{item.contributor.name}</p>
                      <p className="text-xs text-gray-500">{item.createdAt}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3 line-clamp-2 leading-relaxed">{item.caption}</p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        <span>{item.likes}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        <span>{item.comments}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{item.views}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="p-1 h-7 w-7 hover:bg-red-50 hover:text-red-600">
                        <Heart className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="p-1 h-7 w-7 hover:bg-blue-50 hover:text-blue-600">
                        <MessageCircle className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="p-1 h-7 w-7 hover:bg-green-50 hover:text-green-600">
                        <Share className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="p-1 h-7 w-7 hover:bg-gray-50">
                        <Download className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-4">
            {filteredMedia.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="relative flex-shrink-0">
                      {item.type === 'image' ? (
                        <img
                          src={item.url || "/placeholder.svg"}
                          alt={item.caption}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="relative">
                          <video
                            ref={(el) => {
                              if (el) videoRefs.current[item.id] = el;
                            }}
                            src={item.url}
                            poster={item.thumbnailUrl}
                            className="w-24 h-24 object-cover rounded-lg"
                            muted={mutedVideos.has(item.id)}
                            loop
                          />
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute inset-0 w-6 h-6 m-auto rounded-full bg-white/90 hover:bg-white"
                            onClick={() => toggleVideoPlay(item.id)}
                          >
                            {playingVideo === item.id ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3 ml-0.5" />
                            )}
                          </Button>
                        </div>
                      )}
                      <Badge variant="secondary" className="absolute -top-1 -right-1 bg-black/70 text-white border-0 text-xs">
                        {item.type === 'image' ? (
                          <ImageIcon className="w-2 h-2" />
                        ) : (
                          <Video className="w-2 h-2" />
                        )}
                      </Badge>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={item.contributor.avatar || "/placeholder.svg"} alt={item.contributor.name} />
                          <AvatarFallback className="bg-blue-500 text-white text-xs">
                            {item.contributor.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-gray-900">{item.contributor.name}</span>
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-xs text-gray-500">{item.createdAt}</span>
                      </div>
                      
                      <p className="text-gray-700 mb-3 leading-relaxed">{item.caption}</p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Heart className="w-4 h-4" />
                            <span>{item.likes}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{item.comments}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Eye className="w-4 h-4" />
                            <span>{item.views}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7">
                            <Heart className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7">
                            <MessageCircle className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="p-1 h-7 w-7">
                            <Share className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredMedia.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {filterType === 'images' ? (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              ) : filterType === 'videos' ? (
                <Video className="w-12 h-12 text-gray-400" />
              ) : (
                <Upload className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No results found' : `No ${filterType === 'all' ? 'media' : filterType} yet`}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : `Be the first to contribute ${filterType === 'all' ? 'photos and videos' : filterType} to this album!`
              }
            </p>
            {!searchQuery && (
              <Button 
                onClick={() => setIsContributeOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Media
              </Button>
            )}
          </div>
        )}

        {/* Enhanced Share Dialog */}
        <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
          <DialogContent className="bg-white border-gray-200 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-gray-900 text-xl">Share Album</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Share className="w-8 h-8 text-blue-600" />
                </div>
                <p className="text-gray-600">
                  Anyone with this link can view and contribute to your album.
                </p>
              </div>

              {shareUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-xl border">
                    <Link className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-700 outline-none"
                    />
                  </div>

                  <Button
                    onClick={handleCopyShareLink}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white h-11"
                  >
                    {copySuccess ? (
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Copied to clipboard!
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Copy className="w-4 h-4" />
                        Copy Share Link
                      </div>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              )}

              <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <div className="flex gap-3">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Contributor Access</p>
                    <p className="text-xs text-blue-700">
                      People with this link can view all content and add their own photos and videos to the album.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
