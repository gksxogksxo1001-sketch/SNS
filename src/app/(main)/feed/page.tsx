"use client";

import React, { useEffect, useState } from "react";
import { Search, Bell, Loader2, MessageSquarePlus, Send } from "lucide-react";
import { PostCard } from "@/components/features/feed/PostCard";
import { Stories } from "@/components/features/feed/Stories";
import { postService } from "@/core/firebase/postService"; // Added this line
import { notificationService } from "@/core/firebase/notificationService";
import { messageService } from "@/core/firebase/messageService";
import { useAuth } from "@/core/hooks/useAuth";
import { Post } from "@/types/post";
import Link from "next/link";
import { DEFAULT_AVATAR } from "@/core/constants";

export default function FeedPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await postService.getPosts(user?.uid);
        setPosts(data);
      } catch (error) {
        console.error("Failed to fetch posts:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (user) fetchPosts();
    else if (!isLoading) fetchPosts(); // Guest view (public only)
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const unsubscribeNotif = notificationService.subscribeToNotifications(user.uid, (notifications) => {
      const count = notifications.filter(n => !n.isRead).length;
      setUnreadNotifCount(count);
    });

    const unsubscribeMsg = messageService.subscribeToTotalUnreadCount(user.uid, (count: number) => {
      setUnreadMsgCount(count);
    });

    return () => {
      unsubscribeNotif();
      unsubscribeMsg();
    };
  }, [user]);

  return (
    <div className="flex flex-col min-h-screen bg-bg-alt">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-bg-base/80 p-4 backdrop-blur-md border-b border-border-base">
        <h1 className="text-xl font-bold text-primary">HANS</h1>
        {/* 모바일에서만 표시 (PC는 사이드바/우측패널에 있음) */}
        <div className="flex items-center space-x-5 md:hidden">
          <Link href="/search" className="text-text-main hover:text-primary transition-colors block">
            <Search size={24} />
          </Link>
          
          <div className="relative">
            <Link href="/notifications" className="text-text-main hover:text-primary transition-colors block">
              <Bell size={24} />
            </Link>
            {unreadNotifCount > 0 && (
              <span className="absolute -right-1 -top-1 px-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-error text-[8px] font-bold text-white ring-2 ring-white">
                {unreadNotifCount >= 10 ? "10+" : unreadNotifCount}
              </span>
            )}
          </div>

          <div className="relative pt-0.5">
            <Link href="/messages" className="text-[#212529] hover:text-[#2A9D8F] transition-colors block">
              <Send size={22} className="-rotate-12" />
            </Link>
            {unreadMsgCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 px-1 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-[#e74c3c] text-[8px] font-bold text-white ring-2 ring-white animate-in zoom-in duration-300">
                {unreadMsgCount >= 10 ? "10+" : unreadMsgCount}
              </span>
            )}
          </div>
        </div>
      </header>
 
      {/* Story System */}
      <Stories />

      {/* Post Feed */}
      <div className="flex-1 p-4 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#ADB5BD] space-y-3">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">피드를 불러오는 중...</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <PostCard key={post.id} post={post as any} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center px-10">
            <div className="w-20 h-20 bg-bg-base rounded-3xl flex items-center justify-center shadow-sm mb-6">
              <MessageSquarePlus size={32} className="text-primary opacity-20" />
            </div>
            <h3 className="text-lg font-bold text-text-main mb-2">피드가 비어있어요</h3>
            <p className="text-sm text-text-sub mb-8 leading-relaxed">
              아직 작성된 게시물이 없습니다.<br />
              첫 번째 여행 이야기를 들려주세요!
            </p>
            <Link 
              href="/post/create"
              className="bg-[#2A9D8F] text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-[#2A9D8F]/20 active:scale-95 transition-transform"
            >
              글 쓰러 가기
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
