"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Heart, Send, ChevronLeft, ChevronRight, User as UserIcon, Trash2 } from "lucide-react";
import { UserStoryGroup, Story } from "@/types/story";
import { storyService } from "@/core/firebase/storyService";
import { auth } from "@/core/firebase/config";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

interface StoryViewerProps {
  groups: UserStoryGroup[];
  initialGroupIndex: number;
  onClose: () => void;
  onRefresh?: () => void;
}

export const StoryViewer = ({ groups, initialGroupIndex, onClose, onRefresh }: StoryViewerProps) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(auth.currentUser?.uid || null);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
    
    const startTime = Date.now();
    const duration = 5000;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(nextProgress);
      
      if (elapsed >= duration) {
        handleNext();
      }
    }, 50); // Update every 50ms for smoothness
  };

  const stopTimer = () => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
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
      alert("답장이 전송되었습니다!");
    } catch (error) {
      console.error("Reply failed:", error);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !isMe) return;
    if (!confirm("이 스토리를 삭제하시겠습니까?")) return;

    setIsLoading(true);
    stopTimer();
    try {
      await storyService.deleteStory(currentStory.id, currentStory.mediaUrl);
      
      // Refresh parent data
      if (onRefresh) onRefresh();

      if (currentGroup.stories.length > 1) {
        handleNext();
      } else {
        onClose();
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("삭제에 실패했습니다.");
      startTimer();
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10 pointer-events-none"></div>

      <div className="relative w-full max-w-lg aspect-[9/16] bg-slate-900 shadow-2xl overflow-hidden sm:rounded-3xl">
        <img 
          src={currentStory.mediaUrl} 
          alt="Story" 
          className="w-full h-full object-cover"
        />

        {/* Top Overlay */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-6 z-20 space-y-4">
          <div className="flex space-x-1.5 px-0.5">
            {currentGroup.stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-75 ease-linear"
                  style={{ 
                    width: idx === currentStoryIndex ? `${progress}%` : idx < currentStoryIndex ? "100%" : "0%" 
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full overflow-hidden border border-white/20">
                {currentGroup.user.image ? (
                  <img src={currentGroup.user.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <UserIcon size={18} className="text-white/50" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-black text-white">{currentGroup.user.name}</span>
                <span className="text-[10px] font-bold text-white/60">
                  {currentStory.createdAt?.seconds 
                    ? formatDistanceToNow(new Date(currentStory.createdAt.seconds * 1000), { addSuffix: true, locale: ko })
                    : "방금 전"}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {isMe && (
                <button 
                  onClick={handleDeleteStory}
                  disabled={isLoading}
                  className="p-2 text-white/70 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={24} />
                </button>
              )}
              <button onClick={onClose} className="p-2 text-white/70 hover:text-white transition-colors">
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
          <div className="absolute bottom-0 left-0 right-0 p-6 pt-10 bg-gradient-to-t from-black/80 to-transparent z-20">
            <div className="flex items-center space-x-4">
              <form onSubmit={handleSendReply} className="flex-1 relative">
                <input 
                  type="text" 
                  placeholder="댓글 달기..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-full px-5 py-3 text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-white/20 transition-all pr-12"
                />
                <button 
                  type="submit"
                  disabled={!commentText.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[#2A9D8F] disabled:opacity-30"
                >
                  <Send size={18} />
                </button>
              </form>
              <button 
                onClick={handleToggleLike}
                className={`p-1 transition-transform active:scale-125 ${isLiked ? "text-[#e74c3c]" : "text-white"}`}
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
