"use client";

import React, { useEffect } from "react";
import { useToastStore, Toast } from "@/store/useToastStore";
import { AnimatePresence, motion } from "framer-motion";
import { X, MessageCircle, Heart, UserPlus, Star, Users, Bell, DollarSign } from "lucide-react";
import { Avatar } from "./Avatar";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export const NotificationToast = () => {
  const { toasts, removeToast } = useToastStore();
  const router = useRouter();

  const getIcon = (type: string) => {
    switch (type) {
      case "message": return <MessageCircle size={18} className="text-primary" />;
      case "like": return <Heart size={18} className="text-error fill-current" />;
      case "comment": return <MessageCircle size={18} className="text-secondary" />;
      case "friend_request": return <UserPlus size={18} className="text-point" />;
      case "friend_accept": return <Star size={18} className="text-yellow-400 fill-current" />;
      case "group_invite": return <Users size={18} className="text-primary" />;
      case "settlement_request": return <DollarSign size={18} className="text-error" />;
      case "settlement_pay": return <DollarSign size={18} className="text-success" />;
      default: return <Bell size={18} className="text-text-sub" />;
    }
  };

  const handleToastClick = (toast: Toast) => {
    if (toast.type === "message" && toast.metadata?.roomId) {
      router.push(`/chat/${toast.metadata.roomId}`);
    } else if (toast.type === "like" || toast.type === "comment") {
      router.push("/notifications");
    }
    removeToast(toast.id);
  };

  return (
    <div className="fixed inset-x-0 top-6 z-[200] flex flex-col items-center pointer-events-none space-y-3">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.5, bottom: 0.1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y < -50) {
                removeToast(toast.id);
              }
            }}
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9, transition: { duration: 0.2 } }}
            className="pointer-events-auto touch-none"
          >
            <div 
              onClick={() => handleToastClick(toast)}
              className={cn(
                "flex min-w-[320px] max-w-[450px] items-center space-x-4 rounded-3xl bg-bg-base p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-border-base backdrop-blur-xl cursor-pointer hover:bg-bg-alt transition-colors group"
              )}
            >
              {/* Profile / Icon */}
              <div className="relative">
                <Avatar 
                  src={toast.fromAvatarUrl} 
                  size={42} 
                  className="border border-border-base"
                />
                <div className="absolute -bottom-1 -right-1 rounded-full bg-bg-base p-1.5 shadow-sm border border-border-base">
                  {getIcon(toast.type as string)}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <p className="text-[13px] font-black text-text-main line-clamp-1">
                  {toast.fromNickname || "알림"}
                </p>
                <p className="text-[12px] font-medium text-text-sub line-clamp-2 leading-tight mt-0.5">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); removeToast(toast.id); }}
                className="p-1.5 text-text-sub hover:text-text-main transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
