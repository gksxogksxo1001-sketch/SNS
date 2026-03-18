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
}

export const StoryViewer = ({ groups, initialGroupIndex, onClose }: StoryViewerProps) => {
  const [currentGroupIndex, setCurrentGroupIndex] = useState(initialGroupIndex);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentGroup = groups[currentGroupIndex];
  const currentStory = currentGroup?.stories[currentStoryIndex];
  const isMe = currentGroup?.userId === auth.currentUser?.uid;

  // Auto-progression timer (5 seconds)
  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [currentGroupIndex, currentStoryIndex]);

  const startTimer = () => {
    stopTimer();
    timerRef.current = setTimeout(() => {
      handleNext();
    }, 5000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (currentStory && auth.currentUser) {
      setIsLiked(currentStory.likedBy.includes(auth.currentUser.uid));
    }
  }, [currentStory]);

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
    if (!currentStory || !auth.currentUser) return;
    try {
      const newLikedStatus = !isLiked;
      setIsLiked(newLikedStatus);
      await storyService.toggleStoryLike(currentStory.id, auth.currentUser.uid, isLiked);
    } catch (error) {
      console.error("Like toggle failed:", error);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentStory || !auth.currentUser) return;

    try {
      await storyService.replyToStory(currentStory, auth.currentUser.uid, commentText);
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
    stopTimer(); // Pause timer during deletion
    try {
      await storyService.deleteStory(currentStory.id, currentStory.mediaUrl);
      
      // Update local state or close if it was the only story
      if (currentGroup.stories.length > 1) {
        // Just move to next or stay if last
        handleNext();
      } else {
        onClose();
      }
      // Note: Ideally, we should trigger a refresh in the parent 'Stories' component too.
      // For now, we'll just handle the viewer state.
    } catch (error) {
      console.error("Delete failed:", error);
      alert("삭제에 실패했습니다.");
      startTimer();
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Implementation of router was removed in some versions, but we should use it if needed.
    // For now, focusing on the user's direct request.
  };

  if (!currentGroup || !currentStory) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
      {/* Background Dimmer */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 z-10 pointer-events-none"></div>

      {/* Main Story Content */}
      <div className="relative w-full max-w-lg aspect-[9/16] bg-slate-900 shadow-2xl overflow-hidden sm:rounded-3xl">
        <img 
          src={currentStory.mediaUrl} 
          alt="Story" 
          className="w-full h-full object-cover"
        />

        {/* Top Overlay: Progress Bars, Header */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-6 z-20 space-y-4">
          {/* Multi-story Progress Indicators */}
          <div className="flex space-x-1.5 px-0.5">
            {currentGroup.stories.map((_, idx) => (
              <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white transition-all duration-[5000ms] linear ${
                    idx === currentStoryIndex ? "w-full" : idx < currentStoryIndex ? "w-full" : "w-0"
                  }`}
                  style={{ 
                    transitionDuration: idx === currentStoryIndex ? '5000ms' : '300ms' 
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

        {/* Navigation Areas */}
        <div className="absolute inset-0 flex z-10">
          <div className="flex-1 cursor-pointer" onClick={handlePrev}></div>
          <div className="flex-1 cursor-pointer" onClick={handleNext}></div>
        </div>

        {/* Left/Right Buttons */}
        <div className="hidden sm:block">
          <button 
            onClick={handlePrev}
            className="absolute -left-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/20 transition-all"
          >
            <ChevronLeft size={32} />
          </button>
          <button 
            onClick={handleNext}
            className="absolute -right-16 top-1/2 -translate-y-1/2 p-3 bg-white/10 rounded-full text-white/50 hover:text-white hover:bg-white/20 transition-all"
          >
            <ChevronRight size={32} />
          </button>
        </div>

        {/* Bottom Bar: Heart & Reply (Hidden for isMe) */}
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
