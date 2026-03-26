"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/hooks/useAuth";
import { ArrowLeft, Bell, Heart, MessageCircle, UserPlus, MoreHorizontal, Check, Wallet, X as CloseX, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfirmModal, AlertModal } from "@/components/common/UIModals";
import { notificationService } from "@/core/firebase/notificationService";
import { userService } from "@/core/firebase/userService";
import { groupService } from "@/core/firebase/groupService";
import { Notification } from "@/types/notification";
import { DEFAULT_AVATAR } from "@/core/constants";
import Image from "next/image";

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
    case "group_invite": return <UserPlus size={12} className="text-white" />;
    case "settlement_request": return <Wallet size={12} className="text-white" />;
    case "settlement_pay": return <Check size={12} className="text-white" />;
  }
};

const getIconBg = (type: Notification["type"]) => {
  switch (type) {
    case "like": return "bg-error";
    case "comment": return "bg-primary";
    case "friend_request": return "bg-primary";
    case "friend_accept": return "bg-point";
    case "story_like": return "bg-error";
    case "group_invite": return "bg-secondary";
    case "settlement_request": return "bg-success";
    case "settlement_pay": return "bg-success";
  }
};

const getContent = (notif: Notification) => {
  switch (notif.type) {
    case "like": return "님이 회원님의 게시물을 좋아합니다.";
    case "comment": return `님이 댓글을 남겼습니다: "${notif.content}"`;
    case "friend_request": return "님이 친구 요청을 보냈습니다.";
    case "friend_accept": return "님이 친구 요청을 수락했습니다.";
    case "story_like": return "님이 회원님의 스토리를 좋아합니다.";
    case "group_invite": return "님이 그룹에 초대했습니다.";
    case "settlement_request": return "님이 정산을 요청했습니다.";
    case "settlement_pay": return "님이 정산을 완료했습니다.";
  }
};

function SwipeableNotificationItem({ 
  notif, 
  router, 
  onDelete, 
  onAcceptFriend, 
  onDeclineFriend, 
  onAcceptGroup, 
  onDeclineGroup 
}: any) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const startX = React.useRef(0);
  const currentX = React.useRef(0);
  const SWIPE_THRESHOLD = -80;

  const isDraggingClick = React.useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const touchX = e.touches[0].clientX;
    let diff = touchX - startX.current;
    
    if (isOpen) {
      diff += SWIPE_THRESHOLD;
    }
    
    if (diff < 0) {
      const newX = Math.max(diff, SWIPE_THRESHOLD * 1.5);
      setTranslateX(newX);
      currentX.current = newX;
    } else {
      setTranslateX(0);
      currentX.current = 0;
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    if (Math.abs(currentX.current - (isOpen ? SWIPE_THRESHOLD : 0)) > 10) {
      isDraggingClick.current = true;
      setTimeout(() => { isDraggingClick.current = false; }, 50);
    }

    if (currentX.current <= SWIPE_THRESHOLD / 2) {
      setTranslateX(SWIPE_THRESHOLD);
      currentX.current = SWIPE_THRESHOLD;
      setIsOpen(true);
    } else {
      setTranslateX(0);
      currentX.current = 0;
      setIsOpen(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isSwiping) return;
    let diff = e.clientX - startX.current;
    if (isOpen) {
      diff += SWIPE_THRESHOLD;
    }
    if (diff < 0) {
      const newX = Math.max(diff, SWIPE_THRESHOLD * 1.5);
      setTranslateX(newX);
      currentX.current = newX;
    } else {
      setTranslateX(0);
      currentX.current = 0;
    }
  };

  const handleMouseUp = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    if (Math.abs(currentX.current - (isOpen ? SWIPE_THRESHOLD : 0)) > 10) {
      isDraggingClick.current = true;
      setTimeout(() => { isDraggingClick.current = false; }, 50);
    }

    if (currentX.current <= SWIPE_THRESHOLD / 2) {
      setTranslateX(SWIPE_THRESHOLD);
      currentX.current = SWIPE_THRESHOLD;
      setIsOpen(true);
    } else {
      setTranslateX(0);
      currentX.current = 0;
      setIsOpen(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isOpen) {
      e.preventDefault();
      e.stopPropagation();
      setTranslateX(0);
      currentX.current = 0;
      setIsOpen(false);
      return;
    }
    
    if (isDraggingClick.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (notif.type === "story_like") {
      router.push(`/profile/${notif.fromUid}`);
    } else if (notif.type === "group_invite") {
      router.push(`/groups`);
    } else if (notif.type === "settlement_request" || notif.type === "settlement_pay") {
      router.push(`/settlement/${notif.groupId || notif.postId}`);
    } else if (notif.postId) {
      router.push(`/post/${notif.postId}`);
    } else if (notif.fromUid) {
      router.push(`/profile/${notif.fromUid}`);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notif);
    setTranslateX(0);
    currentX.current = 0;
    setIsOpen(false);
  };

  return (
    <div className="relative w-full overflow-hidden bg-error">
      <div 
        className="absolute inset-y-0 right-0 w-24 flex items-center justify-end pr-6 text-white text-sm font-bold opacity-100 cursor-pointer"
        onClick={handleDeleteClick}
      >
        <Trash2 size={24} />
      </div>

      <div 
        className={cn(
          "relative bg-bg-base flex items-start p-4 space-x-4 w-full cursor-pointer transition-transform",
          !notif.isRead ? "bg-primary/5" : "hover:bg-bg-alt",
          !isSwiping && "duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      >
        {/* User Avatar & Type Icon */}
        <div className="relative flex-shrink-0 mt-0.5 pointer-events-none">
          <div className="relative h-12 w-12 overflow-hidden rounded-full bg-bg-alt border border-border-base">
            <Image 
              src={notif.fromAvatarUrl || DEFAULT_AVATAR} 
              alt={notif.fromNickname} 
              fill
              sizes="48px"
              className="h-full w-full object-cover" 
              draggable={false} 
            />
          </div>
          <div className={cn(
            "absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-bg-base flex items-center justify-center",
            getIconBg(notif.type)
          )}>
            {getIcon(notif.type)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-1.5 min-w-0 pointer-events-none">
          <p className="text-[13px] text-text-main leading-snug">
            <span className="font-bold">{notif.fromNickname}</span>
            {getContent(notif)}
          </p>
          <p className="text-[11px] font-medium text-text-sub/60">{formatTime(notif.createdAt)}</p>
          
          {/* Actions */}
          <div className="pointer-events-auto">
            {/* Friend Request Actions */}
            {notif.type === "friend_request" && (
              <div className="flex items-center space-x-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => onAcceptFriend(notif)}
                  className="bg-[#2A9D8F] text-white px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-[#21867a] transition-colors"
                >
                  수락
                </button>
                <button 
                  onClick={() => onDeclineFriend(notif)}
                  className="bg-bg-alt text-text-sub px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-bg-base transition-colors"
                >
                  거절
                </button>
              </div>
            )}

            {/* Group Invite Actions */}
            {notif.type === "group_invite" && (
              <div className="flex items-center space-x-2 pt-1" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => onAcceptGroup(notif)}
                  className="bg-[#E76F51] text-white px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-[#c0392b] transition-colors"
                >
                  수락
                </button>
                <button 
                  onClick={() => onDeclineGroup(notif)}
                  className="bg-bg-alt text-text-sub px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-bg-base transition-colors"
                >
                  거절
                </button>
              </div>
            )}

            {/* Settlement Request Details */}
            {notif.type === "settlement_request" && notif.content && (
              <div className="mt-1">
                <div className="bg-bg-alt p-3 rounded-xl border border-border-base text-[12px] text-text-sub font-medium">
                  {notif.content}
                </div>
                <div className="flex items-center space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => router.push(`/settlement/${notif.groupId || notif.postId}`)}
                    className="bg-[#2A9D8F] text-white px-4 py-1.5 rounded-lg text-[12px] font-bold hover:bg-[#21867a] transition-colors"
                  >
                    정산 확인
                  </button>
                </div>
              </div>
            )}

            {/* Settlement Payment Details */}
            {notif.type === "settlement_pay" && notif.content && (
              <div className="mt-1">
                <div className="bg-bg-alt p-3 rounded-xl border border-border-base text-[12px] text-text-sub font-medium">
                  {notif.content}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Target Image (if post related) */}
        {notif.postImage && (
          <div className="relative h-12 w-12 flex-shrink-0 rounded-lg overflow-hidden bg-bg-alt border border-border-base mt-0.5 pointer-events-none">
            <Image 
              src={notif.postImage} 
              alt="Post" 
              fill
              sizes="48px"
              className="h-full w-full object-cover" 
              draggable={false} 
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isDanger?: boolean;
    confirmText?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });
  const [alertModal, setAlertModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: "success" | "info" | "error";
  }>({
    isOpen: false,
    title: "",
    message: "",
  });

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

  const handleAcceptGroup = async (notif: Notification) => {
    if (!user || !notif.postId) return;
    try {
      await groupService.acceptInvitation(notif.postId, user.uid);
      await notificationService.deleteNotification(notif.id);
      setAlertModal({ isOpen: true, title: "가입 완료", message: "그룹 초대를 수락했습니다. 그룹 메뉴에서 확인해 보세요!", type: "success" });
      
      // Also re-fetch or filter out natively
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    } catch (error) {
      console.error("Failed to accept group invite:", error);
      setAlertModal({ isOpen: true, title: "오류", message: "그룹 초대 수락에 실패했습니다.", type: "error" });
    }
  };

  const handleDeclineGroup = async (notif: Notification) => {
    try {
      await notificationService.deleteNotification(notif.id);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
    } catch (error) {
      console.error("Failed to decline group invite:", error);
    }
  };

  const handleDeleteAll = () => {
    if (!user) return;
    setConfirmModal({
      isOpen: true,
      title: "모든 알림 삭제",
      message: "정말 모든 알림을 삭제하시겠습니까?",
      isDanger: true,
      confirmText: "삭제",
      onConfirm: async () => {
        try {
          await notificationService.deleteAllNotifications(user.uid);
          setNotifications([]);
          setShowMenu(false);
          setAlertModal({ isOpen: true, title: "삭제 완료", message: "모든 알림이 삭제되었습니다.", type: "success" });
        } catch (error) {
          console.error("Failed to delete all notifications:", error);
          setAlertModal({ isOpen: true, title: "오류", message: "알림 삭제 중 오류가 발생했습니다.", type: "error" });
        }
      }
    });
    setShowMenu(false);
  };

  const handleDeleteSingle = (notif: Notification) => {
    setConfirmModal({
      isOpen: true,
      title: "알림 삭제",
      message: "선택한 알림을 삭제하시겠습니까?",
      isDanger: true,
      confirmText: "삭제",
      onConfirm: async () => {
        try {
          await notificationService.deleteNotification(notif.id);
          setNotifications(prev => prev.filter(n => n.id !== notif.id));
        } catch (error) {
          console.error("Failed to delete notification:", error);
          setAlertModal({ isOpen: true, title: "오류", message: "알림 삭제 중 오류가 발생했습니다.", type: "error" });
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-bg-alt pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-bg-base px-4 border-b border-border-base">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="p-1 hover:bg-bg-alt rounded-full text-text-main">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">알림</h1>
        </div>
        <div className="relative">
          <button 
            className="p-2 text-text-sub hover:bg-bg-alt rounded-full transition-colors"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-bg-base rounded-xl shadow-lg border border-border-base py-1.5 z-50">
                <button
                  onClick={handleDeleteAll}
                  className="w-full flex items-center px-4 py-2.5 text-sm text-red-500 hover:bg-bg-alt transition-colors"
                >
                  <Trash2 size={16} className="mr-2" />
                  모두 삭제
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main>
        {notifications.length > 0 ? (
          <div className="divide-y divide-border-base">
            {notifications.map((notif) => (
              <SwipeableNotificationItem 
                key={notif.id}
                notif={notif}
                router={router}
                onDelete={handleDeleteSingle}
                onAcceptFriend={handleAcceptFriend}
                onDeclineFriend={handleDeclineFriend}
                onAcceptGroup={handleAcceptGroup}
                onDeclineGroup={handleDeclineGroup}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-bg-alt flex items-center justify-center text-text-sub/20">
              <Bell size={40} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-bold text-text-main">알림이 없습니다.</p>
              <p className="text-sm text-text-sub">새로운 소식이 생기면 이곳에 알려드릴게요!</p>
            </div>
          </div>
        )}
      </main>

      <ConfirmModal 
        {...confirmModal} 
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
      />
      
      <AlertModal 
        {...alertModal} 
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))} 
      />
    </div>
  );
}
