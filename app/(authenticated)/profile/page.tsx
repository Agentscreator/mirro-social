"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Home, User, Settings, Plus, Grid3X3, Heart, MessageCircle, Share, ArrowLeft, Loader2, Upload, Video } from "lucide-react";
import { NewPostCreator } from "@/components/new-post/NewPostCreator";
import { useRouter } from "next/navigation";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { useSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";

interface UserProfile {
  id: string;
  username: string;
  nickname?: string;
  email: string;
  about?: string;
  profileImage?: string;
  image?: string;
  created_at: string;
}

interface UserPost {
  id: number;
  content: string;
  image?: string;
  video?: string;
  duration?: number;
  createdAt: string;
  likes: number;
  comments: number;
}

interface ProfileStats {
  posts: number;
  followers: number;
  following: number;
}

export default function Profile() {
  const router = useRouter();
  const { data: session } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, followers: 0, following: 0 });
  const [userPosts, setUserPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  
  // New Post Creator state
  const [isNewPostOpen, setIsNewPostOpen] = useState(false);
  
  // Settings state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inviteSettings, setInviteSettings] = useState({
    inviteMode: "manual" as "manual" | "auto",
    autoAcceptLimit: 10,
  });

  // Fetch profile data
  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/users/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setStats(data.stats);
      } else {
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch user posts
  const fetchUserPosts = async () => {
    try {
      const response = await fetch('/api/users/posts?limit=12');
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched user posts:', data);
        setUserPosts(data.posts);
      } else {
        console.error('Failed to fetch posts:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };
  
  // Fetch invite settings
  const fetchInviteSettings = async () => {
    try {
      const response = await fetch('/api/users/invite-settings');
      if (response.ok) {
        const data = await response.json();
        setInviteSettings({
          inviteMode: data.inviteMode || "manual",
          autoAcceptLimit: data.autoAcceptLimit || 10,
        });
      }
    } catch (error) {
      console.error('Error fetching invite settings:', error);
    }
  };
  
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile();
      fetchUserPosts();
      fetchInviteSettings();
    }
  }, [session?.user?.id]);
  
  // Handle post created from new post creator
  const handlePostCreated = async (post: any) => {
    toast({
      title: "Success",
      description: "Post created successfully",
    });
    
    // Refresh posts and stats
    fetchUserPosts();
    fetchProfile();
  };
  
  // Handle update invite settings
  const handleUpdateInviteSettings = async () => {
    try {
      const response = await fetch('/api/users/invite-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(inviteSettings),
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Settings updated successfully",
        });
        setIsSettingsOpen(false);
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to update settings",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive",
      });
    }
  };
  
  const getBestImageUrl = (user: UserProfile): string | null => {
    if (user.profileImage && user.profileImage.trim() && !user.profileImage.includes("placeholder")) {
      return user.profileImage;
    }
    if (user.image && user.image.trim() && !user.image.includes("placeholder")) {
      return user.image;
    }
    return null;
  };
  
  const getDisplayName = (user: UserProfile): string => {
    return user.nickname || user.username;
  };
  
  const getPostThumbnail = (post: UserPost): string => {
    return post.video || post.image || '/placeholder-video.jpg';
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }
  
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Profile not found</p>
        </div>
      </div>
    );
  }

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
            <AvatarImage 
              src={getBestImageUrl(profile) || '/placeholder-avatar.jpg'} 
              className="object-cover w-full h-full"
            />
            <AvatarFallback className="bg-blue-500 text-white text-2xl">
              {getDisplayName(profile).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">{getDisplayName(profile)}</h2>
          <p className="text-gray-600 mb-4">@{profile.username}</p>
          <p className="text-gray-700 text-sm max-w-sm">
            {profile.about || "Welcome to my profile! 🚀"}
          </p>
          
          <div className="flex space-x-8 mt-6">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{stats.posts}</div>
              <div className="text-gray-500 text-sm">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{stats.followers}</div>
              <div className="text-gray-500 text-sm">Followers</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{stats.following}</div>
              <div className="text-gray-500 text-sm">Following</div>
            </div>
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button 
            onClick={() => setIsNewPostOpen(true)}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Post
          </Button>
          
        </div>

        {/* Posts Grid */}
        <div>
          <div className="flex items-center mb-4">
            <Grid3X3 className="w-5 h-5 mr-2 text-gray-700" />
            <span className="font-medium text-gray-900">Posts</span>
          </div>
          
          {postsLoading ? (
            <div className="grid grid-cols-3 gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (console.log('Posts loading:', postsLoading, 'Posts count:', userPosts.length, 'Posts:', userPosts), userPosts.length > 0) ? (
            <div className="grid grid-cols-3 gap-1">
              {userPosts.map((post) => (
                <div key={post.id} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={getPostThumbnail(post)}
                    alt="Post"
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
                          {post.comments}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="mb-4">
                <Grid3X3 className="w-12 h-12 mx-auto text-gray-300" />
              </div>
              <p className="text-lg font-medium">No posts yet</p>
              <p className="text-sm">Create your first post to share with the world!</p>
            </div>
          )}
        </div>
      </div>

      {/* New Post Creator */}
      <NewPostCreator
        isOpen={isNewPostOpen}
        onClose={() => setIsNewPostOpen(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}