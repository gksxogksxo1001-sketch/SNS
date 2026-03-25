"use client";

import React, { useEffect, useState } from "react";
import { groupService } from "@/core/firebase/groupService";
import { auth } from "@/core/firebase/config";
import { useAuth } from "@/core/hooks/useAuth";
import { userService } from "@/core/firebase/userService";
import { Group } from "@/types/group";
import { UserProfile } from "@/types/user";
import { DEFAULT_AVATAR } from "@/core/constants";
import { Users, ChevronRight, Plus, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupListProps {
  onSelectGroup: (group: Group) => void;
  onCreateClick: () => void;
}

export const GroupList = ({ onSelectGroup, onCreateClick }: GroupListProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, UserProfile>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { user, isLoading: isAuthLoading } = useAuth();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchGroups = async () => {
      try {
          const userGroups = await groupService.getUserGroups(user.uid);
          const sortedGroups = [...userGroups].sort((a, b) => {
            const statusOrder: Record<string, number> = { ongoing: 0, completed: 1 };
            const aOrder = statusOrder[a.status || "ongoing"] ?? 0;
            const bOrder = statusOrder[b.status || "ongoing"] ?? 0;
            if (aOrder !== bOrder) return aOrder - bOrder;
            
            const aTime = a.createdAt?.seconds || 0;
            const bTime = b.createdAt?.seconds || 0;
            return bTime - aTime;
          });
          setGroups(sortedGroups);
          const memberUids = new Set<string>();
          userGroups.forEach(g => g.members.forEach(uid => memberUids.add(uid)));
          
          const profilesData: Record<string, UserProfile> = {};
          await Promise.all(
            Array.from(memberUids).map(async (uid) => {
              const p = await userService.getUserProfile(uid);
              if (p) profilesData[uid] = p;
            })
          );
          setMemberProfiles(profilesData);
      } catch (error) {
        console.error("Failed to fetch groups:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, [user, isAuthLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400">
        <Loader2 className="animate-spin mr-2" size={20} />
        그룹 정보를 불러오는 중...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users size={22} className="text-[#2A9D8F]" />
          내 여행 그룹
        </h3>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-1 text-sm font-bold text-[#2A9D8F] hover:bg-[#2A9D8F]/10 px-3 py-1.5 rounded-xl transition-colors"
        >
          <Plus size={16} />
          새 그룹
        </button>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 px-6 bg-slate-50 rounded-[28px] border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm text-slate-300">
            <Users size={32} />
          </div>
          <p className="text-slate-500 font-medium">아직 소속된 그룹이 없습니다.</p>
          <p className="text-slate-400 text-sm mt-1">친구들과 함께 여행을 시작해보세요!</p>
          <button
            onClick={onCreateClick}
            className="mt-6 px-6 py-3 bg-[#2A9D8F] text-white font-bold rounded-2xl shadow-lg shadow-[#2A9D8F]/20 hover:scale-105 active:scale-95 transition-all"
          >
            그룹 만들기
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group) => (
            <div
              key={group.id}
              onClick={() => onSelectGroup(group)}
              className={cn(
                "group relative bg-white p-6 rounded-[28px] border shadow-sm transition-all cursor-pointer overflow-hidden",
                group.status === 'completed' 
                  ? "border-[#F1F3F5] opacity-75 hover:bg-slate-50"
                  : "border-slate-100 hover:shadow-xl hover:border-[#2A9D8F]/30"
              )}
            >
              <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-[#2A9D8F]/10 transition-colors">
                <Users size={80} />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-lg font-bold text-slate-800 group-hover:text-[#2A9D8F] transition-colors">
                        {group.name}
                      </h4>
                      {group.status === 'completed' && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-md border border-slate-200">
                          완료됨
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mt-1 line-clamp-1">{group.description || "설명 없음"}</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#2A9D8F] group-hover:text-white transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 3).map((uid, i) => {
                      const profile = memberProfiles[uid];
                      return (
                        <div key={uid} className="w-8 h-8 rounded-xl bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden">
                          <img 
                            src={profile?.avatarUrl || DEFAULT_AVATAR} 
                            alt="member" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                      );
                    })}
                    {group.members.length > 3 && (
                      <div className="w-8 h-8 z-10 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
                        +{group.members.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-300 bg-slate-50 px-2.5 py-1 rounded-lg">
                    멤버 {group.members.length}명
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
