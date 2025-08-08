"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Bell, Heart, MessageCircle, UserPlus, MapPin, Check, X, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  postId?: number;
  inviteRequestId?: number;
  locationRequestId?: number;
  isRead: boolean;
  createdAt: string;
  fromUser?: {
    id: string;
    username: string;
    nickname?: string;
    profileImage?: string;
  };
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      } else {
        throw new Error('Failed to fetch notifications');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, isRead: true }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleLocationRequest = async (notificationId: number, requestId: number, action: 'accept' | 'deny') => {
    if (processingIds.has(notificationId)) return;
    
    try {
      setProcessingIds(prev => new Set(prev).add(notificationId));
      
      const response = await fetch(`/api/location-requests/${requestId}/${action}`, {
        method: 'POST',
      });

      if (response.ok) {
        // Remove the notification after processing
        setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
        
        toast({
          title: "Success",
          description: action === 'accept' 
            ? "Location shared successfully!" 
            : "Location request denied.",
        });
      } else {
        throw new Error(`Failed to ${action} location request`);
      }
    } catch (error) {
      console.error(`Error ${action}ing location request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} location request. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notificationId);
        return newSet;
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-5 w-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="h-5 w-5 text-blue-500" />;
      case 'follow':
        return <UserPlus className="h-5 w-5 text-green-500" />;
      case 'location_request':
        return <MapPin className="h-5 w-5 text-purple-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications();
    }
  }, [session?.user?.id]);

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        {notifications.some(n => !n.isRead) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Mark all as read
              notifications.forEach(notif => {
                if (!notif.isRead) {
                  markAsRead(notif.id);
                }
              });
            }}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
          <p className="text-gray-500">When you get notifications, they'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`cursor-pointer transition-colors ${
                !notification.isRead ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => !notification.isRead && markAsRead(notification.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Notification Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* User Avatar (if from another user) */}
                  {notification.fromUser && (
                    <Avatar className="w-10 h-10 flex-shrink-0">
                      <AvatarImage src={notification.fromUser.profileImage || "/placeholder-avatar.jpg"} />
                      <AvatarFallback>
                        {(notification.fromUser.nickname || notification.fromUser.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 text-sm">
                          {notification.title}
                        </h4>
                        <p className="text-gray-600 text-sm mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {formatTime(notification.createdAt)}
                        </p>
                      </div>
                      
                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          New
                        </Badge>
                      )}
                    </div>

                    {/* Location Request Actions */}
                    {notification.type === 'location_request' && notification.locationRequestId && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLocationRequest(notification.id, notification.locationRequestId!, 'accept');
                          }}
                          disabled={processingIds.has(notification.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {processingIds.has(notification.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Share Location
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLocationRequest(notification.id, notification.locationRequestId!, 'deny');
                          }}
                          disabled={processingIds.has(notification.id)}
                        >
                          {processingIds.has(notification.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <X className="h-4 w-4 mr-1" />
                          )}
                          Deny
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}