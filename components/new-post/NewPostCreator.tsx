"use client"

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { 
  Upload, 
  Camera, 
  Pause, 
  Play, 
  Square, 
  RotateCcw, 
  Check,
  X,
  Loader2,
  Users,
  Layers,
  Timer,
  Zap,
  Image as ImageIcon,
  MoreHorizontal,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface NewPostCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: (post: any) => void;
}

type CreationStep = 'upload' | 'details';

export function NewPostCreator({ isOpen, onClose, onPostCreated }: NewPostCreatorProps) {
  // Main state
  const [currentStep, setCurrentStep] = useState<CreationStep>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  
  // Auto-accept group (all posts are invites now)
  const [autoAcceptInvites, setAutoAcceptInvites] = useState(false);
  const [groupName, setGroupName] = useState("");
  
  // Invite limit (all posts are invites)
  const [inviteLimit, setInviteLimit] = useState(10);
  const [isUnlimitedInvites, setIsUnlimitedInvites] = useState(false);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);


  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCurrentStep('details');
    }
  };


  // Create post
  const handleCreatePost = async () => {
    if (!selectedFile && !previewUrl) return;
    
    console.log('🚀 Starting post creation...');
    
    // Check file size before uploading
    if (selectedFile) {
      const maxSize = selectedFile.type.startsWith('video/') ? 100 * 1024 * 1024 : 10 * 1024 * 1024; // 100MB for video, 10MB for images
      if (selectedFile.size > maxSize) {
        alert(`File too large. Maximum size is ${selectedFile.type.startsWith('video/') ? '100MB for videos' : '10MB for images'}.`);
        return;
      }
      console.log('✅ File size check passed:', {
        size: selectedFile.size,
        maxSize,
        type: selectedFile.type,
      });
    }
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('content', caption);
      
      if (selectedFile) {
        formData.append('media', selectedFile);
      }

      // All posts are invites now, add invite data
      formData.append('isInvite', 'true');
      formData.append('inviteLimit', isUnlimitedInvites ? '100' : inviteLimit.toString());
      
      // Add auto-accept group data
      if (autoAcceptInvites && groupName.trim()) {
        formData.append('autoAcceptInvites', 'true');
        formData.append('groupName', groupName.trim());
      }
      
      console.log('📤 Sending request to /api/posts with FormData:', {
        content: caption.substring(0, 50),
        hasFile: !!selectedFile,
        isInvite: true,
        inviteLimit: isUnlimitedInvites ? 100 : inviteLimit,
        autoAcceptInvites,
        groupName: groupName.substring(0, 30),
      });

      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/posts', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('📥 Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Post created successfully:', result);
        
        // If auto-accept is enabled and group name is provided, create the group
        if (autoAcceptInvites && groupName.trim() && result.post?.id) {
          console.log('🔄 Creating group for post...');
          try {
            const groupResponse = await fetch(`/api/posts/${result.post.id}/create-group`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                groupName: groupName.trim(),
                maxMembers: isUnlimitedInvites ? 100 : inviteLimit,
              }),
            });

            if (groupResponse.ok) {
              const groupResult = await groupResponse.json();
              console.log('✅ Group created successfully:', groupResult.group);
              result.group = groupResult.group; // Add group to result
            } else {
              console.error('❌ Failed to create group:', await groupResponse.text());
            }
          } catch (groupError) {
            console.error('❌ Error creating group:', groupError);
          }
        }
        
        // Clear any cached feed data to ensure new post appears
        if (typeof window !== 'undefined') {
          // Clear feed cache
          const feedCacheKeys = Object.keys(sessionStorage).filter(key => 
            key.startsWith('posts-') || key.includes('feed')
          );
          feedCacheKeys.forEach(key => sessionStorage.removeItem(key));
          
          // Trigger feed refresh
          window.dispatchEvent(new CustomEvent('feedRefresh'));
        }
        
        // Pass the post object to the callback
        onPostCreated?.(result.post || result);
        handleClose();
        
        // Show success message
        console.log('🎉 Post created and feed refresh triggered');
        if (result.group) {
          console.log('🎉 Group also created:', result.group.name);
        }
      } else {
        console.error('❌ Post creation failed:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });

        let errorMessage = `Failed to create post: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (jsonError) {
          console.error('❌ Failed to parse error response as JSON:', jsonError);
          
          try {
            const errorText = await response.text();
            console.error('❌ Error response text:', errorText.substring(0, 500));
            
            // Check if it's a common error
            if (errorText.includes('Request Entity Too Large')) {
              errorMessage = 'File too large. Please choose a smaller file.';
            } else if (errorText.includes('413')) {
              errorMessage = 'Request too large. Please reduce file size.';
            } else if (errorText.includes('timeout')) {
              errorMessage = 'Request timed out. Please try again.';
            } else {
              errorMessage = 'Server error. Please try again.';
            }
          } catch (textError) {
            console.error('❌ Failed to parse error response as text:', textError);
            errorMessage = 'Unknown server error. Please try again.';
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error creating post:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        alert('Request timed out. Please check your connection and try again.');
      } else {
        alert(error instanceof Error ? error.message : 'Failed to create post. Please try again.');
      }
    } finally {
      console.log('🏁 Post creation finished, setting loading to false');
      setIsUploading(false);
    }
  };

  // Close and cleanup
  const handleClose = () => {
    // Reset all states
    setCurrentStep('upload');
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption("");
    setAutoAcceptInvites(false);
    setGroupName("");
    setInviteLimit(10);
    setIsUnlimitedInvites(false);
    
    onClose();
  };

  // Render upload step
  const renderUploadStep = () => (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-8 shadow-2xl">
        <Upload className="w-12 h-12 text-white" />
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-3">Select Video to Upload</h2>
      <p className="text-gray-400 text-center mb-8 leading-relaxed">
        Choose a video from your device to create an<br />
        amazing post with editing tools and sounds
      </p>
      
      <Button
        onClick={() => fileInputRef.current?.click()}
        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold shadow-lg transform transition-all duration-200 hover:scale-105"
      >
        Choose Video
      </Button>
      
      <p className="text-gray-500 text-sm mt-4">Max file size: 100MB</p>
    </div>
  );


  // Render details step
  const renderDetailsStep = () => (
    <div className="flex flex-col h-full">
      {/* Video Preview */}
      <div className="h-48 md:h-64 relative bg-black overflow-hidden flex-shrink-0">
        {previewUrl && (
          <video
            src={previewUrl}
            className="w-full h-full object-cover"
            muted
            loop
            autoPlay
          />
        )}
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentStep('upload')}
          className="absolute top-4 left-4 bg-black/50 text-white rounded-full backdrop-blur-sm"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Details Form */}
      <div className="flex-1 bg-gray-900 p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <label className="text-white font-medium">Describe your invitation</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What are you inviting people to do? Be creative and engaging..."
            className="bg-gray-800 border-gray-700 text-white resize-none min-h-[100px] rounded-xl"
            rows={4}
          />
          <p className="text-gray-400 text-xs">{caption.length}/2200</p>
        </div>

        {/* Invite Limit */}
        <div className="space-y-4 p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white font-medium">Participant Limit</p>
                <p className="text-gray-400 text-sm">Set how many people can join</p>
              </div>
            </div>
            <Switch
              checked={isUnlimitedInvites}
              onCheckedChange={setIsUnlimitedInvites}
            />
          </div>
          
          {!isUnlimitedInvites ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Maximum participants</span>
                <span className="text-sm text-gray-400">{inviteLimit}</span>
              </div>
              <Slider
                value={[inviteLimit]}
                onValueChange={(value) => setInviteLimit(value[0])}
                max={100}
                min={2}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>2</span>
                <span>100</span>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-400 text-sm font-medium">Unlimited participants</p>
              <p className="text-green-300/70 text-xs">Anyone can join your invitation</p>
            </div>
          )}
        </div>

        {/* Auto-Accept Group */}
        <div className="space-y-4 p-4 bg-gray-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-white font-medium">Auto-Accept to Group</p>
                <p className="text-gray-400 text-sm">Create instant group chats</p>
              </div>
            </div>
            <Switch
              checked={autoAcceptInvites}
              onCheckedChange={setAutoAcceptInvites}
            />
          </div>
          
          {autoAcceptInvites && (
            <div className="space-y-2">
              <Input
                placeholder="Group name (e.g., 'Beach Volleyball Squad')"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="bg-gray-900 border-gray-700 text-white rounded-lg"
                required
              />
              <p className="text-gray-400 text-xs">
                People who accept your invite will automatically join this group chat
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Post Button */}
      <div className="p-4 md:p-6 bg-gray-900 border-t border-gray-800 flex-shrink-0">
        <Button
          onClick={handleCreatePost}
          disabled={isUploading || !caption.trim() || (autoAcceptInvites && !groupName.trim())}
          className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 text-white py-3 md:py-4 rounded-full font-bold text-base md:text-lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 mr-2 animate-spin" />
              Creating Invitation...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Share Invitation
            </>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-md mx-auto h-[100vh] md:h-[90vh] bg-black text-white border-none p-0 flex flex-col md:rounded-3xl">
        <DialogTitle className="sr-only">
          {currentStep === 'upload' ? 'Upload Video' : 'Create Post'}
        </DialogTitle>
        
        {/* Progress Indicator */}
        <div className="absolute top-0 left-0 right-0 z-50 flex bg-black/80 backdrop-blur-sm md:rounded-t-3xl">
          {['upload', 'details'].map((step, index) => (
            <div
              key={step}
              className={`flex-1 h-1 ${
                currentStep === step || 
                (['upload'].indexOf(currentStep) > index)
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                  : 'bg-gray-700'
              }`}
            />
          ))}
        </div>

        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="absolute top-4 right-4 z-50 bg-black/50 text-white rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Step Content */}
        <div className="flex-1 pt-6 overflow-hidden">
          {currentStep === 'upload' && renderUploadStep()}
          {currentStep === 'details' && renderDetailsStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}