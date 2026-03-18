"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/hooks/useAuth";
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, MoreHorizontal, Check, X as CloseX } from "lucide-react";
import { cn } from "@/lib/utils";
import { notificationService } from "@/core/firebase/notificationService";
import { userService } from "@/core/firebase/userService";
import { Notification } from "@/types/notification";

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribeToNotifications(
      user.uid, 
      (data) => {
        setNotifications(data);
        setIsLoading(false);
        setError(null);
        
        // Mark as read when we actually get data and it's unread
        if (data.some(n => !n.isRead)) {
          notificationService.markAllAsRead(user.uid);
        }
      },
      (err) => {
        console.error("NotificationsPage error:", err);
        setError("알림을 불러오는 중 오류가 발생했습니다.");
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAcceptFriend = async (notif: Notification) => {
    try {
      // Find the request ID
      const requests = await userService.getPendingRequests(user!.uid);
      const request = requests.find(r => r.fromUid === notif.fromUid);
      if (request) {
        await userService.acceptFriendRequest(request.id);
        // Change type so buttons disappear and it shows as accepted
        await notificationService.updateNotification(notif.id, { 
          type: "friend_accept",
          isRead: true 
        });
      }
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    }
  };

  const handleDeclineFriend = async (notif: Notification) => {
    try {
      const requests = await userService.getPendingRequests(user!.uid);
      const request = requests.find(r => r.fromUid === notif.fromUid);
      if (request) {
        await userService.declineFriendRequest(request.id);
        // Delete notification or change to a 'declined' state
        await notificationService.deleteNotification(notif.id);
      }
    } catch (error) {
      console.error("Failed to decline friend request:", error);
    }
  };

  const formatTime = (createdAt: any) => {
    if (!createdAt) return "";
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;

    if (diff < 60) return "방금 전";
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return `${Math.floor(diff / 86400)}일 전`;
  };

  const getIcon = (type: Notification["type"]) => {
    switch (type) {
      case "like": return <Heart size={12} className="fill-current text-white" />;
      case "comment": return <MessageCircle size={12} className="fill-current text-white" />;
      case "friend_request": return <UserPlus size={12} className="fill-current text-white" />;
      case "friend_accept": return <Check size={12} className="text-white" />;
      case "story_like": return <Heart size={12} className="fill-current text-white" />;
    }
  };

  const getIconBg = (type: Notification["type"]) => {
    switch (type) {
      case "like": return "bg-red-500";
      case "comment": return "bg-[#2A9D8F]";
      case "friend_request": return "bg-blue-500";
      case "friend_accept": return "bg-purple-500";
      case "story_like": return "bg-pink-500";
    }
  };

  const getContent = (notif: Notification) => {
    switch (notif.type) {
      case "like": return "님이 회원님의 게시물을 좋아합니다.";
      case "comment": return `님이 댓글을 남겼습니다: "${notif.content}"`;
      case "friend_request": return "님이 친구 요청을 보냈습니다.";
      case "friend_accept": return "님이 친구 요청을 수락했습니다.";
      case "story_like": return "님이 회원님의 스토리를 좋아합니다.";
    }
  };

  return (
    <div className="min-h-screen bg-white pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-4 border-b">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">알림</h1>
        </div>
        <button className="p-2 text-text-sub hover:bg-gray-100 rounded-full">
          <MoreHorizontal size={20} />
        </button>
      </header>

      <main>
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={cn(
                  "flex items-start p-4 space-x-4 transition-colors hover:bg-gray-50 cursor-pointer",
                  !notif.isRead && "bg-blue-50/50"
                )}
                onClick={() => {
                  if (notif.type === "story_like") {
                    router.push(`/profile/${notif.fromUid}`);
                  } else if (notif.postId) {
                    router.push(`/post/${notif.postId}`);
                  } else if (notif.fromUid) {
                    router.push(`/profile/${notif.fromUid}`);
                  }
                }}
              >
                {/* User Avatar & Type Icon */}
                <div className="relative flex-shrink-0 mt-0.5">
                  <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100 border border-gray-100">
                    {notif.fromAvatarUrl ? (
                      <img src={notif.fromAvatarUrl} alt={notif.fromNickname} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-400 bg-gray-50 font-bold text-lg">
                        {notif.fromNickname[0]}
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center",
                    getIconBg(notif.type)
                  )}>
                    {getIcon(notif.type)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <p className="text-[13px] text-[#212529] leading-snug">
                    <span className="font-bold">{notif.fromNickname}</span>
                    {getContent(notif)}
                  </p>
                  <p className="text-[11px] font-medium text-[#ADB5BD]">{formatTime(notif.createdAt)}</p>
                  
                  {/* Friend Request Actions */}
                  {notif.type === "friend_request" && (
                    <div className="flex items-center space-x-2 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => handleAcceptFriend(notif)}
                        className="bg-[#2A9D8F] text-white px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-[#21867a] transition-colors"
                      >
                        수락
                      </button>
                      <button 
                        onClick={() => handleDeclineFriend(notif)}
                        className="bg-[#F1F3F5] text-[#495057] px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-[#E9ECEF] transition-colors"
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>

                {/* Target Image (if post related) */}
                {notif.postImage && (
                  <div className="h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 mt-0.5">
                    <img src={notif.postImage} alt="Post" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center text-gray-200">
              <Bell size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-text-main">알림이 없습니다.</p>
              <p className="text-sm text-text-sub">새로운 소식이 생기면 이곳에 알려드릴게요!</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
