"use client"

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Upload, Heart, MessageCircle, Share, MoreVertical, Users, Link, Copy, Check } from "lucide-react";
import { HamburgerMenu } from "@/components/hamburger-menu";

interface AlbumImage {
  id: string;
  url: string;
  caption: string;
  contributor: {
    name: string;
    username: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  createdAt: string;
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
  images: AlbumImage[];
}

export default function AlbumDetailPage({ params }: { params: { albumId: string } }) {
  const router = useRouter();
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [imageCaption, setImageCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const [album, setAlbum] = useState<AlbumDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch album data from API
  const fetchAlbum = async () => {
    try {
      const response = await fetch(`/api/albums/${params.albumId}`);
      if (response.ok) {
        const data = await response.json();
        setAlbum(data.album);
      } else {
        console.error('Failed to fetch album');
      }
    } catch (error) {
      console.error('Error fetching album:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchAlbum();
  }, [params.albumId]);

  // Mock album data for fallback
  const mockAlbum: AlbumDetails = {
    id: params.albumId,
    title: "Travel Adventures 2024",
    description: "Collecting amazing travel photos from around the world. Share your best travel moments and discover new destinations through the eyes of fellow travelers.",
    creator: {
      name: "Sarah Wilson",
      username: "sarahw",
      avatar: "https://images.unsplash.com/photo-1494790108755-2616b612c4c0?w=100&h=100&fit=crop&crop=face"
    },
    contributors: [
      {
        name: "Sarah Wilson",
        username: "sarahw",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612c4c0?w=100&h=100&fit=crop&crop=face"
      },
      {
        name: "Mike Chen",
        username: "mikec",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
      },
      {
        name: "Emma Davis",
        username: "emmad",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
      }
    ],
    isPublic: true,
    createdAt: "2024-01-15",
    images: [
      {
        id: "1",
        url: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop",
        caption: "Amazing sunset at Santorini! The most beautiful view I've ever seen 🌅",
        contributor: {
          name: "Sarah Wilson",
          username: "sarahw",
          avatar: "https://images.unsplash.com/photo-1494790108755-2616b612c4c0?w=100&h=100&fit=crop&crop=face"
        },
        likes: 24,
        comments: 5,
        createdAt: "2024-01-20"
      },
      {
        id: "2",
        url: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&h=400&fit=crop",
        caption: "Mountain hiking adventure in the Alps. The fresh air and stunning views made it all worth it!",
        contributor: {
          name: "Mike Chen",
          username: "mikec",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
        },
        likes: 18,
        comments: 3,
        createdAt: "2024-01-18"
      },
      {
        id: "3",
        url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop",
        caption: "Crystal clear waters in the Maldives. Paradise found! 🏝️",
        contributor: {
          name: "Emma Davis",
          username: "emmad",
          avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
        },
        likes: 31,
        comments: 8,
        createdAt: "2024-01-16"
      }
    ]
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleContribute = async () => {
    if (!selectedFile || !imageCaption || !album) return;

    try {
      // In a real app, you would upload the file to storage first
      // For now, we'll use a placeholder URL
      const imageUrl = `https://example.com/album-images/${Date.now()}.jpg`;

      const response = await fetch(`/api/albums/${params.albumId}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl,
          caption: imageCaption,
        }),
      });

      if (response.ok) {
        setImageCaption("");
        setSelectedFile(null);
        setIsContributeOpen(false);
        // Refresh album data
        fetchAlbum();
      } else {
        console.error('Failed to add image to album');
      }
    } catch (error) {
      console.error('Error adding image to album:', error);
    }
  };

  const handleGenerateShareLink = async () => {
    try {
      const response = await fetch(`/api/albums/${params.albumId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessLevel: 'contribute',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setShareUrl(data.shareUrl);
      } else {
        console.error('Failed to generate share link');
      }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-gray-900">{album?.title || 'Loading...'}</h1>
          </div>
          <HamburgerMenu />
        </div>
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : !album ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Album not found or you don't have access to it.</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </div>
        ) : (
          <>
            {/* Album content */}
        {/* Album Info */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-gray-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={album.creator.avatar} alt={album.creator.name} />
                <AvatarFallback className="bg-blue-500 text-white">
                  {album.creator.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-gray-900">{album.creator.name}</h2>
                <p className="text-sm text-gray-600">@{album.creator.username}</p>
                <p className="text-xs text-gray-500">{album.createdAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {album.isPublic ? (
                <div className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                  Public
                </div>
              ) : (
                <div className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">
                  Private
                </div>
              )}
              <Button variant="ghost" size="icon" onClick={handleOpenShare}>
                <Share className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-gray-700 mb-4">{album.description}</p>

          {/* Contributors */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">{album.contributors.length} contributors</span>
            </div>
            <div className="flex -space-x-2">
              {album.contributors.slice(0, 5).map((contributor, index) => (
                <Avatar key={index} className="w-6 h-6 border-2 border-white">
                  <AvatarImage src={contributor.avatar} alt={contributor.name} />
                  <AvatarFallback className="bg-blue-500 text-white text-xs">
                    {contributor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {album.contributors.length > 5 && (
                <div className="w-6 h-6 bg-gray-300 rounded-full border-2 border-white flex items-center justify-center">
                  <span className="text-xs text-gray-600">+{album.contributors.length - 5}</span>
                </div>
              )}
            </div>
          </div>

          {/* Contribute Button */}
          <Dialog open={isContributeOpen} onOpenChange={setIsContributeOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Contribute to Album
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-gray-200">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Add Photo to Album</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Select Photo</label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-input"
                    />
                    <label htmlFor="file-input" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                      </p>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">Caption</label>
                  <Textarea
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    className="bg-white border-gray-300 text-gray-900"
                    placeholder="Share the story behind this photo..."
                    rows={3}
                  />
                </div>
                <Button 
                  onClick={handleContribute}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  disabled={!selectedFile || !imageCaption}
                >
                  Add to Album
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Share Album Dialog */}
          <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
            <DialogContent className="bg-white border-gray-200">
              <DialogHeader>
                <DialogTitle className="text-gray-900">Share Album</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Anyone with this link can view and contribute to your album.
                </p>
                
                {shareUrl ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border">
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
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      {copySuccess ? (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4" />
                          Copied!
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </div>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                )}
                
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700">
                    <strong>Note:</strong> Contributors will be able to add photos to this album. 
                    Make sure you trust the people you share this with.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Images Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {album.images.map((image) => (
            <Card key={image.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img 
                  src={image.url} 
                  alt={image.caption}
                  className="w-full h-64 object-cover"
                />
              </div>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={image.contributor.avatar} alt={image.contributor.name} />
                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                      {image.contributor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{image.contributor.name}</p>
                    <p className="text-xs text-gray-500">{image.createdAt}</p>
                  </div>
                </div>
                
                <p className="text-sm text-gray-700 mb-3 line-clamp-2">{image.caption}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      <span>{image.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      <span>{image.comments}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="p-1 h-7 w-7">
                      <Heart className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="p-1 h-7 w-7">
                      <MessageCircle className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="p-1 h-7 w-7"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        // You could add a toast notification here
                      }}
                    >
                      <Share className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {album.images.length === 0 && (
          <div className="text-center py-12">
            <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Photos Yet</h3>
            <p className="text-gray-600 mb-4">Be the first to contribute to this album!</p>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}