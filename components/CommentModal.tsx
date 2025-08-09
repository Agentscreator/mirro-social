"use client"

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Send, Reply, Trash2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";

interface Comment {
  id: number;
  content: string;
  createdAt: string;
  userId: string;
  parentCommentId?: number | null;
  user: {
    username: string;
    nickname?: string;
    profileImage?: string;
  };
  replies?: Comment[];
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  postId: number;
  postContent: string;
  postUser: {
    username: string;
    nickname?: string;
    profileImage?: string;
  };
  onCommentCountChange?: (change: number) => void;
}

export function CommentModal({ isOpen, onClose, postId, postContent, postUser, onCommentCountChange }: CommentModalProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Helper function to organize comments into nested structure
  const organizeComments = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<number, Comment>();
    const topLevelComments: Comment[] = [];

    // First pass: create map of all comments
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into hierarchy
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parentCommentId) {
        // This is a reply
        const parentComment = commentMap.get(comment.parentCommentId);
        if (parentComment) {
          parentComment.replies!.push(commentWithReplies);
        }
      } else {
        // This is a top-level comment
        topLevelComments.push(commentWithReplies);
      }
    });

    return topLevelComments;
  };

  const fetchComments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/posts/${postId}/comments`);
      if (response.ok) {
        const data = await response.json();
        const organizedComments = organizeComments(data.comments || []);
        setComments(organizedComments);
      } else {
        setComments([]);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (parentCommentId?: number) => {
    const content = parentCommentId ? replyContent : newComment;
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          parentCommentId: parentCommentId || null,
        }),
      });

      if (response.ok) {
        // Refresh comments to get updated nested structure
        await fetchComments();

        // Reset form
        if (parentCommentId) {
          setReplyContent("");
          setReplyingTo(null);
        } else {
          setNewComment("");
        }

        // Notify parent component about comment count change
        onCommentCountChange?.(1);

        toast({
          title: "Success",
          description: parentCommentId ? "Reply added successfully!" : "Comment added successfully!",
        });
      } else {
        throw new Error("Failed to add comment");
      }
    } catch (error) {
      console.error("Error submitting comment:", error);
      toast({
        title: "Error",
        description: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      const response = await fetch(`/api/posts/${postId}/comments?commentId=${commentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchComments();
        
        // Notify parent component about comment count change
        onCommentCountChange?.(-1);
        
        toast({
          title: "Success",
          description: "Comment deleted successfully!",
        });
      } else {
        throw new Error("Failed to delete comment");
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
      toast({
        title: "Error",
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderComment = (comment: Comment, depth = 0) => {
    const maxDepth = 3; // Limit nesting depth

    return (
      <div key={comment.id} className={`space-y-3 ${depth > 0 ? "ml-8 border-l-2 border-gray-700 pl-4" : ""}`}>
        <div className="flex gap-3 group">
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarImage src={comment.user?.profileImage || "/placeholder-avatar.jpg"} />
            <AvatarFallback>
              {(comment.user?.nickname || comment.user?.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-white truncate">
                    {comment.user?.nickname || comment.user?.username}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-white leading-relaxed break-words">{comment.content}</p>
                
                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-1">
                  {depth < maxDepth && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="h-6 px-2 text-xs text-gray-400 hover:text-blue-400"
                    >
                      <Reply className="h-3 w-3 mr-1" />
                      Reply
                    </Button>
                  )}
                  
                  {session?.user?.id === comment.userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="h-6 px-2 text-xs text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="space-y-2">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="min-h-[60px] text-sm text-white placeholder:text-gray-400 bg-gray-800 border-gray-600"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSubmitComment(comment.id)}
                    disabled={!replyContent.trim() || submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyContent("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Render replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="space-y-3">
                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (isOpen) {
      fetchComments();
    }
  }, [isOpen, postId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={postUser?.profileImage || "/placeholder-avatar.jpg"} />
              <AvatarFallback>
                {(postUser?.nickname || postUser?.username || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <span className="font-medium text-white">{postUser?.nickname || postUser?.username}</span>
              <p className="text-sm text-white font-normal line-clamp-2">{postContent}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment) => renderComment(comment))
          )}
        </div>

        {/* New comment form */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarImage src={session?.user?.image || "/placeholder-avatar.jpg"} />
              <AvatarFallback>
                {(session?.user?.name || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="min-h-[60px] resize-none text-white placeholder:text-gray-400 bg-gray-800 border-gray-600"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => handleSubmitComment()}
              disabled={!newComment.trim() || submitting}
              size="sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Comment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}