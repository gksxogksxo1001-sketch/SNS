"use client";

import React, { useState } from "react";
import { GroupList } from "@/components/features/group/GroupList";
import { GroupCreate } from "@/components/features/group/GroupCreate";
import { GroupInvite } from "@/components/features/group/GroupInvite";
import { Group } from "@/types/group";
import { Users, Plus, LayoutGrid, List } from "lucide-react";

export default function GroupsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showInviteSection, setShowInviteSection] = useState(false);

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setShowInviteSection(false); // Reset invite section on group change
  };

  return (
    <div className="px-6 py-8 pb-32">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">여행 팀 관리</h1>
        <p className="text-slate-500 mt-2 font-medium">함께 떠나는 친구들과 여행을 공유하세요.</p>
      </header>

      {selectedGroup ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <section className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
            <div className="flex justify-between items-start mb-6">
              <div>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="text-xs font-bold text-[#2A9D8F] mb-2 hover:underline"
                >
                  ← 전체 그룹 목록으로
                </button>
                <h2 className="text-2xl font-bold text-slate-800">{selectedGroup.name}</h2>
                <p className="text-slate-500 mt-1">{selectedGroup.description}</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowInviteSection(!showInviteSection)}
                  className="px-4 py-2 bg-[#2A9D8F]/10 text-[#2A9D8F] font-bold rounded-xl hover:bg-[#2A9D8F]/20 transition-colors"
                >
                  멤버 초대
                </button>
              </div>
            </div>

            {showInviteSection && (
              <div className="mb-8 animate-in slide-in-from-top-2">
                <GroupInvite 
                  groupId={selectedGroup.id} 
                  groupName={selectedGroup.name}
                  onClose={() => setShowInviteSection(false)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mt-8">
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-1">멤버 수</p>
                <p className="text-xl font-black text-slate-800">{selectedGroup.members.length}명</p>
              </div>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 mb-1">여행 시작일</p>
                <p className="text-xl font-black text-slate-800">미정</p>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-50">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <LayoutGrid size={18} className="text-[#2A9D8F]" />
                이 그룹의 게시물
              </h3>
              <div className="text-center py-12 text-slate-400 text-sm italic">
                아직 그룹 전용 게시물이 없습니다.
              </div>
            </div>
          </section>
        </div>
      ) : (
        <GroupList 
          onSelectGroup={handleGroupSelect} 
          onCreateClick={() => setShowCreateModal(true)} 
        />
      )}

      {showCreateModal && (
        <GroupCreate 
          onClose={() => setShowCreateModal(false)}
          onSuccess={(groupId) => {
            setShowCreateModal(false);
            window.location.reload(); // Refresh to see the new group
          }}
        />
      )}
    </div>
  );
}
