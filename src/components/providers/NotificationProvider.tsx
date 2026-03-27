"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { notificationService } from "@/core/firebase/notificationService";
import { useToastStore } from "@/store/useToastStore";
import { NotificationToast } from "@/components/common/NotificationToast";

const NotificationContext = createContext({});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const { addToast } = useToastStore();
  const lastNotifCount = useRef<number | null>(null);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    if (!user) return;

    // We only want to toast notifications that are newer than "now" (when this provider mounted)
    // and were just created (isRead: false)
    const unsubscribe = notificationService.subscribeToNotifications(user.uid, (notifications) => {
      // Find unread notifications created after mounting
      const newUnread = notifications.filter(n => {
        const createdAt = n.createdAt?.toMillis ? n.createdAt.toMillis() : (n.createdAt?.seconds ? n.createdAt.seconds * 1000 : 0);
        return !n.isRead && createdAt > mountedAt.current;
      });

      // Filter out notifications we already toasted in this session (optional but safer)
      // For simplicity, we just check if the count increased or if we found "new" ones
      if (newUnread.length > 0) {
        newUnread.forEach(n => {
          // Check if this specific ID was already toasted (to avoid double toasts on state updates)
          // For now, just toast the latest one found
          if (n === newUnread[0]) {
             addToast({
              type: n.type,
              title: n.fromNickname,
              message: n.content || "새로운 알림이 있습니다.",
              fromNickname: n.fromNickname,
              fromAvatarUrl: n.fromAvatarUrl,
              metadata: { roomId: (n as any).roomId, postId: n.postId }
            });
          }
        });
        
        // Update mountedAt to the latest notification's time to avoid re-toasting the same ones
        const latestTime = Math.max(...newUnread.map(n => n.createdAt?.toMillis ? n.createdAt.toMillis() : (n.createdAt?.seconds ? n.createdAt.seconds * 1000 : 0)));
        mountedAt.current = latestTime;
      }
    });

    return () => unsubscribe();
  }, [user, addToast]);

  return (
    <NotificationContext.Provider value={{}}>
      <NotificationToast />
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
