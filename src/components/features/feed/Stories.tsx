"use client";

import React from "react";
import { Plus, User, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/core/firebase/config";
import Link from "next/link";
import { storyService } from "@/core/firebase/storyService";
import { UserStoryGroup } from "@/types/story";
import { StoryViewer } from "./StoryViewer";
import { useRouter } from "next/navigation";
import { DEFAULT_AVATAR } from "@/core/constants";

interface Story {
  id: string;
  name: string;
  image?: string;
  isMe?: boolean;
  hasUnread?: boolean;
}

export const Stories = () => {
  const router = useRouter();
  const [storyGroups, setStoryGroups] = React.useState<UserStoryGroup[]>([]);
  const [selectedGroupIndex, setSelectedGroupIndex] = React.useState<number | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const fetchStories = React.useCallback(async () => {
    try {
      const currentUserId = auth.currentUser?.uid;
      const groups = await storyService.getActiveStories(currentUserId || undefined);
      
      // 정렬 로직: 
      // 1. 읽지 않은 스토리(hasUnread) 우선
      // 2. 같은 읽음 상태 내에서는 내 스토리가 우선
      const sortedGroups = [...groups].sort((a, b) => {
        // 1. 읽지 않은 스토리 우선
        if (a.hasUnread && !b.hasUnread) return -1;
        if (!a.hasUnread && b.hasUnread) return 1;
        
        // 2. 같은 상태라면 내 스토리 우선
        const isAMe = a.userId === currentUserId;
        const isBMe = b.userId === currentUserId;
        if (isAMe) return -1;
        if (isBMe) return 1;
        
        return 0;
      });
      setStoryGroups(sortedGroups);
    } catch (error) {
      console.error("Failed to fetch stories:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const myGroup = storyGroups.find(g => g.userId === auth.currentUser?.uid);
  const otherGroups = storyGroups.filter(g => g.userId !== auth.currentUser?.uid);

  return (
    <div className="bg-bg-base py-6 border-b border-border-base overflow-hidden">
      <div className="flex space-x-5 overflow-x-auto px-6 scrollbar-hide">
        {/* My Story Item */}
        <div className="flex flex-col items-center flex-shrink-0 space-y-2 group cursor-pointer">
          <div className="relative">
            {/* My Story Avatar with Ring if exists */}
            <div 
              onClick={() => {
                if (myGroup) {
                  const idx = storyGroups.findIndex(g => g.userId === auth.currentUser?.uid);
                  setSelectedGroupIndex(idx);
                } else {
                  router.push("/story/create");
                }
              }}
              className={cn(
                "w-[68px] h-[68px] rounded-[26px] flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                myGroup 
                  ? (myGroup.hasUnread 
                      ? (myGroup.stories.some(s => s.visibility === "close_friends")
                          ? "bg-success p-[3px] scale-100 shadow-lg shadow-success/10" // 친한친구 녹색 링
                          : "bg-gradient-to-tr from-primary via-secondary to-point p-[3px] scale-100 shadow-lg shadow-primary/10")
                      : "bg-border-base p-[1.5px]") // 읽음 상태일 때 회색 링
                  : "bg-bg-alt p-[1.5px]"
              )}
            >
              <div className="w-full h-full rounded-[23px] bg-bg-base p-[2px]">
                <div className="w-full h-full rounded-[21px] overflow-hidden bg-bg-alt flex items-center justify-center">
                  <img src={auth.currentUser?.photoURL || DEFAULT_AVATAR} alt="Me" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
            {/* Add Icon */}
            <Link 
              href="/story/create"
              onClick={(e) => e.stopPropagation()}
              className="absolute -right-1 -bottom-1 w-6 h-6 rounded-xl bg-primary border-2 border-bg-base flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform"
            >
              <Plus size={14} strokeWidth={3} />
            </Link>
          </div>
          <span className="text-[10px] font-bold tracking-tight text-text-sub">내 스토리</span>
        </div>

        {/* Other User Stories */}
        {otherGroups.map((group) => (
          <div 
            key={group.userId} 
            onClick={() => {
              const idx = storyGroups.findIndex(g => g.userId === group.userId);
              setSelectedGroupIndex(idx);
            }}
            className="flex flex-col items-center flex-shrink-0 space-y-2 group cursor-pointer text-center"
          >
            <div className="relative">
              {/* Ring */}
              <div className={cn(
                "w-[68px] h-[68px] rounded-[26px] flex items-center justify-center transition-all duration-300 group-hover:scale-105",
                group.hasUnread 
                  ? (group.stories.some(s => s.visibility === "close_friends")
                      ? "bg-success p-[3px] scale-100 shadow-lg shadow-success/10" 
                      : "bg-gradient-to-tr from-primary via-secondary to-point p-[3px] scale-100 shadow-lg shadow-primary/10")
                  : "bg-border-base p-[1.5px]"
              )}>
                {/* Avatar Container */}
                <div className="w-full h-full rounded-[23px] bg-bg-base p-[2px]">
                  <div className="w-full h-full rounded-[21px] overflow-hidden bg-bg-alt flex items-center justify-center">
                    <img src={group.user.image || DEFAULT_AVATAR} alt={group.user.name} className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            </div>
            <span className={cn(
              "text-[10px] font-bold tracking-tight transition-colors w-16 truncate",
              group.hasUnread ? "text-text-main" : "text-text-sub"
            )}>
              {group.user.name}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer Overlay */}
      {selectedGroupIndex !== null && (
        <StoryViewer 
          groups={storyGroups}
          initialGroupIndex={selectedGroupIndex}
          onClose={() => setSelectedGroupIndex(null)}
          onRefresh={fetchStories}
        />
      )}
    </div>
  );
};
