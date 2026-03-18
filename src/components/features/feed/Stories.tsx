"use client";

import React from "react";
import { Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { auth } from "@/core/firebase/config";
import Link from "next/link";
import { storyService } from "@/core/firebase/storyService";
import { UserStoryGroup } from "@/types/story";
import { StoryViewer } from "./StoryViewer";
import { useRouter } from "next/navigation";

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
      const groups = await storyService.getActiveStories();
      // 내 스토리가 있다면 가장 앞으로 정렬
      const sortedGroups = [...groups].sort((a, b) => {
        if (a.userId === auth.currentUser?.uid) return -1;
        if (b.userId === auth.currentUser?.uid) return 1;
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
    <div className="bg-white py-6 border-b border-[#F1F3F5] overflow-hidden">
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
                  ? "bg-gradient-to-tr from-[#2A9D8F] via-[#E9C46A] to-[#F4A261] p-[3px] scale-100 shadow-lg shadow-[#2A9D8F]/10" 
                  : "bg-slate-100 p-[1.5px]"
              )}
            >
              <div className="w-full h-full rounded-[23px] bg-white p-[2px]">
                <div className="w-full h-full rounded-[21px] overflow-hidden bg-slate-50 flex items-center justify-center">
                  {auth.currentUser?.photoURL ? (
                    <img src={auth.currentUser.photoURL} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <User size={24} className="text-[#ADB5BD]" />
                  )}
                </div>
              </div>
            </div>
            {/* Add Icon */}
            <Link 
              href="/story/create"
              onClick={(e) => e.stopPropagation()}
              className="absolute -right-1 -bottom-1 w-6 h-6 rounded-xl bg-[#2A9D8F] border-2 border-white flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform"
            >
              <Plus size={14} strokeWidth={3} />
            </Link>
          </div>
          <span className="text-[10px] font-bold tracking-tight text-[#ADB5BD]">내 스토리</span>
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
                  ? "bg-gradient-to-tr from-[#2A9D8F] via-[#E9C46A] to-[#F4A261] p-[3px] scale-100 shadow-lg shadow-[#2A9D8F]/10" 
                  : "bg-slate-100 p-[1.5px]"
              )}>
                {/* Avatar Container */}
                <div className="w-full h-full rounded-[23px] bg-white p-[2px]">
                  <div className="w-full h-full rounded-[21px] overflow-hidden bg-slate-50 flex items-center justify-center">
                    {group.user.image ? (
                      <img src={group.user.image} alt={group.user.name} className="w-full h-full object-cover" />
                    ) : (
                      <User size={24} className="text-[#ADB5BD]" />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <span className={cn(
              "text-[10px] font-bold tracking-tight transition-colors w-16 truncate",
              group.hasUnread ? "text-[#212529]" : "text-[#ADB5BD]"
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
