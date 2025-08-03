"use client"

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home, User, Settings, Plus, Grid3X3, Heart, MessageCircle, Share, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { HamburgerMenu } from "@/components/hamburger-menu";

export default function Profile() {
  const router = useRouter();
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [autoAccept, setAutoAccept] = useState(false);
  const [inviteLimit, setInviteLimit] = useState(10);
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [userPosts, setUserPosts] = useState([
    {
      id: "1",
      thumbnail: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=400&h=600&fit=crop",
      title: "My React Tutorial",
      likes: 1200,
      views: 5400
    },
    {
      id: "2",
      thumbnail: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=600&fit=crop",
      title: "Coding Journey",
      likes: 890,
      views: 3200
    },
    {
      id: "3",
      thumbnail: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400&h=600&fit=crop",
      title: "Dev Life",
      likes: 2100,
      views: 8900
    }
  ]);

  const handleCreatePost = () => {
    if (postTitle && postDescription) {
      const newPost = {
        id: Date.now().toString(),
        thumbnail: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=600&fit=crop",
        title: postTitle,
        likes: 0,
        views: 0
      };
      setUserPosts([newPost, ...userPosts]);
      setPostTitle("");
      setPostDescription("");
      setIsCreatePostOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold text-gray-900">Profile</h1>
          <HamburgerMenu />
        </div>
      </div>

      {/* Profile Info */}
      <div className="p-6">
        <div className="flex flex-col items-center text-center mb-8">
          <Avatar className="w-24 h-24 mb-4 border-4 border-blue-200">
            <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face" />
            <AvatarFallback className="bg-blue-500 text-white text-2xl">JD</AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">John Doe</h2>
          <p className="text-gray-600 mb-4">@johndoe</p>
          <p className="text-gray-700 text-sm max-w-sm">
            Creating amazing content every day 🚀 Join my community and let's build something incredible together!
          </p>
          
          <div className="flex space-x-8 mt-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{userPosts.length}</div>
              <div className="text-gray-500 text-sm">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">24.5K</div>
              <div className="text-gray-500 text-sm">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">892</div>
              <div className="text-gray-500 text-sm">Following</div>
            </div>
          </div>
        </div>


        {/* Create Post Button */}
        <Dialog open={isCreatePostOpen} onOpenChange={setIsCreatePostOpen}>
          <DialogTrigger asChild>
            <Button className="w-full mb-6 bg-blue-600 text-white hover:bg-blue-700">
              <Plus className="w-5 h-5 mr-2" />
              Create New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white border-gray-200">
            <DialogHeader>
              <DialogTitle className="text-gray-900">Create New Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700">Title</Label>
                <Input
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Enter post title"
                />
              </div>
              <div>
                <Label className="text-gray-700">Description</Label>
                <Textarea
                  value={postDescription}
                  onChange={(e) => setPostDescription(e.target.value)}
                  className="bg-white border-gray-300 text-gray-900"
                  placeholder="Enter post description"
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-700">Invite Limit for this post</Label>
                <Input
                  type="number"
                  defaultValue={inviteLimit}
                  className="w-24 bg-white border-gray-300 text-gray-900"
                />
              </div>
              <Button 
                onClick={handleCreatePost}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                disabled={!postTitle || !postDescription}
              >
                Create Post
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Posts Grid */}
        <div>
          <div className="flex items-center mb-4">
            <Grid3X3 className="w-5 h-5 mr-2 text-gray-700" />
            <span className="font-medium text-gray-900">Posts</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {userPosts.map((post) => (
              <div key={post.id} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
                <img 
                  src={post.thumbnail} 
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="flex items-center justify-center space-x-4 text-sm">
                      <div className="flex items-center">
                        <Heart className="w-4 h-4 mr-1" />
                        {post.likes}
                      </div>
                      <div className="flex items-center">
                        <MessageCircle className="w-4 h-4 mr-1" />
                        {post.views}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}