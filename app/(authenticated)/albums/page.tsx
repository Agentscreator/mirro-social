"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Image as ImageIcon, Heart, MessageCircle, Share } from "lucide-react";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { useRouter } from "next/navigation";

interface Album {
  id: string;
  title: string;
  description: string;
  creator: {
    name: string;
    username: string;
    avatar: string;
  };
  contributors: number;
  images: number;
  thumbnail: string;
  isPublic: boolean;
  createdAt: string;
}

export default function AlbumsPage() {
  const router = useRouter();
  const [isCreateAlbumOpen, setIsCreateAlbumOpen] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [albums, setAlbums] = useState<Album[]>([
    {
      id: "1",
      title: "Travel Adventures 2024",
      description: "Collecting amazing travel photos from around the world",
      creator: {
        name: "Sarah Wilson",
        username: "sarahw",
        avatar: "https://images.unsplash.com/photo-1494790108755-2616b612c4c0?w=100&h=100&fit=crop&crop=face"
      },
      contributors: 12,
      images: 47,
      thumbnail: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop",
      isPublic: true,
      createdAt: "2024-01-15"
    },
    {
      id: "2",
      title: "Food Discoveries",
      description: "Share your favorite dishes and culinary adventures",
      creator: {
        name: "Mike Chen",
        username: "mikec",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
      },
      contributors: 8,
      images: 23,
      thumbnail: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop",
      isPublic: true,
      createdAt: "2024-01-20"
    },
    {
      id: "3",
      title: "Pet Moments",
      description: "Cute and funny moments with our furry friends",
      creator: {
        name: "Emma Davis",
        username: "emmad",
        avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
      },
      contributors: 15,
      images: 89,
      thumbnail: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&h=300&fit=crop",
      isPublic: true,
      createdAt: "2024-01-10"
    }
  ]);

  const handleCreateAlbum = () => {
    if (albumTitle && albumDescription) {
      const newAlbum: Album = {
        id: Date.now().toString(),
        title: albumTitle,
        description: albumDescription,
        creator: {
          name: "John Doe",
          username: "johndoe",
          avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face"
        },
        contributors: 1,
        images: 0,
        thumbnail: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=300&fit=crop",
        isPublic,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setAlbums([newAlbum, ...albums]);
      setAlbumTitle("");
      setAlbumDescription("");
      setIsCreateAlbumOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-900">Shared Albums</h1>
          <HamburgerMenu />
        </div>
      </div>

      <div className="p-6">
        {/* Create Album Button */}
        <Dialog open={isCreateAlbumOpen} onOpenChange={setIsCreateAlbumOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6 bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" />
              Create New Album
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Create New Album</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Title</label>
                <Input
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Enter album title"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Description</label>
                <Textarea
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Describe your album"
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Public Album</label>
                <Button
                  type="button"
                  variant={isPublic ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPublic(!isPublic)}
                  className={isPublic ? "bg-blue-600 text-white" : ""}
                >
                  {isPublic ? "Public" : "Private"}
                </Button>
              </div>
              <Button 
                onClick={handleCreateAlbum}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                disabled={!albumTitle || !albumDescription}
              >
                Create Album
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Albums Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <Card 
              key={album.id} 
              className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => router.push(`/albums/${album.id}`)}
            >
              <div className="relative">
                <img 
                  src={album.thumbnail} 
                  alt={album.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-2 right-2">
                  {album.isPublic ? (
                    <div className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      Public
                    </div>
                  ) : (
                    <div className="bg-gray-500 text-white text-xs px-2 py-1 rounded-full">
                      Private
                    </div>
                  )}
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold text-gray-900">{album.title}</CardTitle>
                <p className="text-sm text-gray-600 line-clamp-2">{album.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={album.creator.avatar} alt={album.creator.name} />
                      <AvatarFallback className="bg-blue-500 text-white text-xs">
                        {album.creator.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-gray-600">@{album.creator.username}</span>
                  </div>
                  <span className="text-xs text-gray-500">{album.createdAt}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{album.contributors}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ImageIcon className="w-4 h-4" />
                      <span>{album.images}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="p-1 h-8 w-8">
                      <Heart className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="p-1 h-8 w-8">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="p-1 h-8 w-8">
                      <Share className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button 
                  className="w-full mt-3 bg-blue-600 text-white hover:bg-blue-700" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/albums/${album.id}`);
                  }}
                >
                  View Album
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {albums.length === 0 && (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Albums Yet</h3>
            <p className="text-gray-600 mb-4">Create your first shared album to start collecting memories with others!</p>
          </div>
        )}
      </div>
    </div>
  );
}