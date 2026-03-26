"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Heart, Send, ChevronLeft, ChevronRight, User as UserIcon, Trash2, Star, Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserStoryGroup, Story } from "@/types/story";
import { storyService } from "@/core/firebase/storyService";
import { auth } from "@/core/firebase/config";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import Image from "next/image";

import { useModalStore } from "@/store/useModalStore";

interface StoryViewerProps {
  groups: UserStoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export const StoryViewer = ({ groups, initialGroupIndex, onClose, onRefresh }: StoryViewerProps) => {
  const { showAlert, showConfirm } = useModalStore();
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(auth.currentUser?.uid || null);
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isMe = currentGroup?.userId === currentUserId;

  // Track auth state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUserId(user?.uid || null);
    });
    return () => unsubscribe();
  }, []);

  // Auto-progression logic with manual progress state for smooth animation
  useEffect(() => {
    if (!currentGroup || !currentStory) return;
    
    // Mark as viewed
    if (currentUserId && !currentStory.viewedBy.includes(currentUserId)) {
      storyService.markStoryAsViewed(currentStory.id, currentUserId)
        .catch(err => console.error("Failed to mark story as viewed:", err));
    }

    // Reset and start
    setProgress(0);
    startTimer();
    
    return () => {
      stopTimer();
    };
  }, [currentGroupIndex, currentStoryIndex, currentUserId]);

  const startTimer = () => {
    stopTimer();
    
    // Reset progress to 0 and turn off transition for the reset
    setIsTransitioning(false);
    setProgress(0);
    
    // Use a small delay for the browser to register the 0% width before starting the transition
    setTimeout(() => {
      setIsTransitioning(true);
      setProgress(100);
      
      timeoutRef.current = setTimeout(() => {
        handleNext();
      }, 5000);
    }, 10);
  };

  const stopTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    if (currentStory && currentUserId) {
      setIsLiked(currentStory.likedBy.includes(currentUserId));
    }
  }, [currentStory, currentUserId]);

  const handleNext = () => {
    if (currentStoryIndex < currentGroup.stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1);
    } else if (currentGroupIndex < groups.length - 1) {
      setCurrentGroupIndex(prev => prev + 1);
      setCurrentStoryIndex(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1);
    } else if (currentGroupIndex > 0) {
      setCurrentGroupIndex(prev => prev - 1);
      setCurrentStoryIndex(groups[currentGroupIndex - 1].stories.length - 1);
    }
  };

  const handleToggleLike = async () => {
    if (!currentStory || !currentUserId) return;
    try {
      const newLikedStatus = !isLiked;
      setIsLiked(newLikedStatus);
      await storyService.toggleStoryLike(currentStory.id, currentUserId, isLiked);
    } catch (error) {
      console.error("Like toggle failed:", error);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentStory || !currentUserId) return;

    try {
      await storyService.replyToStory(currentStory, currentUserId, commentText);
      setCommentText("");
      showAlert({ title: "답장 완료", message: "답장이 전송되었습니다!", type: "success" });
    } catch (error) {
      console.error("Reply failed:", error);
      showAlert({ title: "오류", message: "답장 전송에 실패했습니다.", type: "error" });
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !isMe) return;
    
    stopTimer();
    showConfirm({
      title: "스토리 삭제",
      message: "이 스토리를 삭제하시겠습니까?",
      isDanger: true,
      onConfirm: async () => {
        setIsLoading(true);
        try {
          await storyService.deleteStory(currentStory.id, currentStory.mediaUrl);
          if (onRefresh) onRefresh();
          if (currentGroup.stories.length > 1) {
            handleNext();
          } else {
            onClose();
          }
        } catch (error) {
          console.error("Delete failed:", error);
          showAlert({ title: "오류", message: "삭제에 실패했습니다.", type: "error" });
          startTimer();
        } finally {
          setIsLoading(false);
        }
      },
      onCancel: () => {
        startTimer();
      }
    });
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-bg-base flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      {/* Immersive background with blur */}
      <div className="absolute inset-0 z-0 opacity-10 blur-3xl scale-125">
        <Image 
          src={currentStory.mediaUrl} 
          alt="" 
          fill
          sizes="100vw"
          className="object-cover" 
        />
      </div>

      <div className="relative w-full max-w-lg aspect-[9/16] bg-bg-base shadow-2xl overflow-hidden sm:rounded-[40px] border border-border-base z-10">
        <Image 
          src={currentStory.mediaUrl} 
          alt="Story" 
          fill
          priority
          sizes="(max-width: 768px) 100vw, 512px"
          className="object-cover"
        />

        {/* Top Overlay */}
        <div className="absolute top-0 left-0 right-0 p-5 pt-8 z-20 space-y-5 bg-gradient-to-b from-white/90 via-white/40 to-transparent">
          <div className="flex space-x-1.5 px-0.5">
            {currentGroup.stories.map((s, idx) => (
              <div key={idx} className="flex-1 h-1 bg-border-base/30 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full",
                    isTransitioning && idx === currentStoryIndex ? "transition-all duration-[5000ms] ease-linear" : "transition-none",
                    currentGroup.stories[idx].visibility === "close_friends" ? "bg-success" : "bg-text-main"
                  )}
                  style={{ 
                    width: idx === currentStoryIndex ? `${progress}%` : idx < currentStoryIndex ? "100%" : "0%" 
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={cn(
                "w-10 h-10 rounded-[15px] p-[2px]",
                currentStory.visibility === "close_friends" ? "bg-success" : "bg-gradient-to-tr from-primary via-point to-secondary"
              )}>
                <div className="w-full h-full rounded-[13px] bg-bg-base p-[1.5px]">
                  <div className="w-full h-full rounded-[11px] overflow-hidden bg-bg-alt">
                    {currentGroup.user.image ? (
                      <Image src={currentGroup.user.image} alt="" fill sizes="44px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <UserIcon size={20} className="text-[#ADB5BD]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-text-main tracking-tight">{currentGroup.user.name}</span>
                  <div className={cn(
                    "flex items-center p-1 rounded-md",
                    currentStory.visibility === "close_friends" ? "text-success bg-success/10" : "text-text-sub bg-bg-alt"
                  )}>
                    {currentStory.visibility === "friends" ? (
                      <Users size={10} />
                    ) : (
                      <Star size={10} className="fill-current" />
                    )}
                  </div>
                </div>
                <span className="text-[10px] font-bold text-text-sub">
                  {currentStory.createdAt?.seconds 
                    ? formatDistanceToNow(new Date(currentStory.createdAt.seconds * 1000), { addSuffix: true, locale: ko })
                    : "방금 전"}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              {isMe && (
                <button 
                  onClick={handleDeleteStory}
                  disabled={isLoading}
                  className="p-2.5 text-text-sub hover:bg-bg-alt rounded-full transition-colors"
                >
                  <Trash2 size={24} />
                </button>
              )}
              <button onClick={onClose} className="p-2.5 text-text-sub hover:bg-bg-alt rounded-full transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Interaction Areas */}
        <div className="absolute inset-0 flex z-10">
          <div className="flex-1 cursor-pointer" onClick={handlePrev}></div>
          <div className="flex-[2] cursor-pointer" onClick={handleNext}></div>
        </div>

        {!isMe && (
          <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-bg-base/90 via-bg-base/40 to-transparent z-20">
            <div className="flex items-center space-x-4">
              <form onSubmit={handleSendReply} className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="댓글 전송하기..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-bg-base/80 backdrop-blur-md border border-border-base rounded-[22px] px-6 py-4 text-sm text-text-main placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all pr-14 shadow-lg shadow-black/5"
                />
                <button 
                  type="submit"
                  disabled={!commentText.trim()}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-2.5 text-primary disabled:opacity-30 transition-opacity"
                >
                  <Send size={18} className="-rotate-12" />
                </button>
              </form>
              <button 
                onClick={handleToggleLike}
                className={cn(
                  "w-14 h-14 rounded-[22px] flex items-center justify-center transition-all active:scale-125 shadow-lg",
                  isLiked 
                    ? "bg-error text-white shadow-error/30" 
                    : "bg-bg-base text-text-main border border-border-base shadow-black/5"
                )}
              >
                <Heart size={28} fill={isLiked ? "currentColor" : "none"} strokeWidth={isLiked ? 0 : 2.5} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
