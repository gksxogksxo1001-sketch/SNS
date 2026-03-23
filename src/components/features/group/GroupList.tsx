"use client";

import React, { useEffect, useState } from "react";
import { groupService } from "@/core/firebase/groupService";
import { auth } from "@/core/firebase/config";
import { Group } from "@/types/group";
import { Users, ChevronRight, Plus, Loader2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface GroupListProps {
  onSelectGroup: (group: Group) => void;
  onCreateClick: () => void;
}

export const GroupList = ({ onSelectGroup, onCreateClick }: GroupListProps) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const userGroups = await groupService.getUserGroups(user.uid);
        setGroups(userGroups);
      } catch (error) {
        console.error("Failed to fetch groups:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, []);

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
              className="group relative bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:border-[#2A9D8F]/30 transition-all cursor-pointer overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-3 text-slate-100 group-hover:text-[#2A9D8F]/10 transition-colors">
                <Users size={80} />
              </div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-lg font-bold text-slate-800 group-hover:text-[#2A9D8F] transition-colors">
                      {group.name}
                    </h4>
                    <p className="text-slate-400 text-sm mt-1 line-clamp-1">{group.description || "설명 없음"}</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-[#2A9D8F] group-hover:text-white transition-all">
                    <ChevronRight size={20} />
                  </div>
                </div>
                
                <div className="mt-6 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {group.members.slice(0, 3).map((uid, i) => (
                      <div key={uid} className="w-8 h-8 rounded-xl bg-slate-200 border-2 border-white flex items-center justify-center overflow-hidden">
                         <div className="w-full h-full bg-gradient-to-br from-slate-300 to-slate-400" />
                      </div>
                    ))}
                    {group.members.length > 3 && (
                      <div className="w-8 h-8 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">
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
