"use client"

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Users, Image as ImageIcon, UserPlus, CheckCircle } from "lucide-react";
import { HamburgerMenu } from "@/components/hamburger-menu";

interface SharedAlbum {
  id: string;
  title: string;
  description: string;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  isPublic: boolean;
  allowContributions: boolean;
  contributorsCount: number;
  imagesCount: number;
  createdAt: string;
  isContributor: boolean;
  canContribute: boolean;
}

export default function SharedAlbumPage() {
  const router = useRouter();
  const params = useParams();
  const shareToken = params?.shareToken as string;
  
  const [album, setAlbum] = useState<SharedAlbum | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch shared album data
  useEffect(() => {
    const fetchSharedAlbum = async () => {
      if (!shareToken) return;
      
      try {
        const response = await fetch(`/api/albums/shared/${shareToken}`);
        if (response.ok) {
          const data = await response.json();
          setAlbum(data.album);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to load album');
        }
      } catch (error) {
        console.error('Error fetching shared album:', error);
        setError('Failed to load album');
      } finally {
        setLoading(false);
      }
    };

    fetchSharedAlbum();
  }, [shareToken]);

  const handleJoinAlbum = async () => {
    if (!album || joining) return;

    setJoining(true);
    try {
      const response = await fetch(`/api/albums/shared/${shareToken}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Refresh album data to update contributor status
        const updatedResponse = await fetch(`/api/albums/shared/${shareToken}`);
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setAlbum(data.album);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join album');
      }
    } catch (error) {
      console.error('Error joining album:', error);
      setError('Failed to join album');
    } finally {
      setJoining(false);
    }
  };

  const handleViewAlbum = () => {
    if (album) {
      router.push(`/albums/${album.id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="min-h-screen bg-gray-50">
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
              <h1 className="text-xl font-bold text-gray-900">Shared Album</h1>
            </div>
            <HamburgerMenu />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Album Not Found'}
            </h2>
            <p className="text-gray-600 mb-4">
              This album link may be invalid or expired.
            </p>
            <Button onClick={() => router.push('/albums')} className="bg-blue-600 hover:bg-blue-700">
              Browse Albums
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <h1 className="text-xl font-bold text-gray-900">Shared Album</h1>
          </div>
          <HamburgerMenu />
        </div>
      </div>

      <div className="p-6">
        {/* Album Info Card */}
        <Card className="mb-6 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{album.title}</h2>
              <p className="text-gray-600 mb-4">{album.description}</p>
              
              {/* Creator Info */}
              <div className="flex items-center justify-center gap-3 mb-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={album.creator.avatar} alt={album.creator.name} />
                  <AvatarFallback className="bg-blue-500 text-white">
                    {album.creator.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="font-medium text-gray-900">{album.creator.name}</p>
                  <p className="text-sm text-gray-600">@{album.creator.username}</p>
                </div>
              </div>

              {/* Album Stats */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{album.contributorsCount} contributors</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">{album.imagesCount} images</span>
                </div>
              </div>

              {/* Status and Actions */}
              <div className="space-y-3">
                {album.isContributor ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-3">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">You're a contributor to this album</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {album.allowContributions && album.canContribute ? (
                      <Button
                        onClick={handleJoinAlbum}
                        disabled={joining}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {joining ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Joining...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Join as Contributor
                          </div>
                        )}
                      </Button>
                    ) : !album.allowContributions ? (
                      <p className="text-gray-500 text-sm">This album doesn't allow contributions</p>
                    ) : !album.canContribute ? (
                      <p className="text-gray-500 text-sm">Album has reached maximum contributors</p>
                    ) : null}
                  </div>
                )}

                <Button
                  onClick={handleViewAlbum}
                  variant="outline"
                  className="w-full border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  View Album
                </Button>
              </div>
            </div>

            {/* Album Metadata */}
            <div className="border-t pt-4 text-center">
              <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                <span>Created {new Date(album.createdAt).toLocaleDateString()}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {album.isPublic ? (
                    <span className="text-green-600">Public</span>
                  ) : (
                    <span className="text-gray-600">Private</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Info Box */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-center">
              <h3 className="font-medium text-blue-900 mb-2">About Shared Albums</h3>
              <p className="text-sm text-blue-700">
                {album.allowContributions 
                  ? "Contributors can add photos to this album and help build the collection together."
                  : "This is a view-only album. You can explore the photos but cannot add new ones."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}