"use client";

import React, { useState } from "react";
import { GroupList } from "@/components/features/group/GroupList";
import { GroupCreate } from "@/components/features/group/GroupCreate";
import { GroupInvite } from "@/components/features/group/GroupInvite";
import { Group } from "@/types/group";
import { Users, Plus, LayoutGrid, List, Settings, Trash2, CheckCircle } from "lucide-react";
import { useAuth } from "@/core/hooks/useAuth";
import { Post } from "@/types/post";
import { postService } from "@/core/firebase/postService";
import { groupService } from "@/core/firebase/groupService";
import { PostCard } from "@/components/features/feed/PostCard";
import { useRouter } from "next/navigation";

export default function GroupsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showInviteSection, setShowInviteSection] = useState(false);
  
  // Custom Modal States
  const [activeModal, setActiveModal] = useState<"edit" | "delete" | "complete" | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editEndDate, setEditEndDate] = useState("");

  const [groupPosts, setGroupPosts] = useState<Post[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (selectedGroup) {
      loadGroupPosts(selectedGroup.id);
    }
  }, [selectedGroup]);

  const loadGroupPosts = async (groupId: string) => {
    setIsLoadingPosts(true);
    try {
      const posts = await postService.getPostsByGroup(groupId);
      setGroupPosts(posts);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handleGroupSelect = (group: Group) => {
    setSelectedGroup(group);
    setShowOptions(false);
    setShowInviteSection(false); // Reset invite section on group change
  };

  const handleConfirmDelete = async () => {
    if (!selectedGroup) return;
    try {
      await groupService.deleteGroup(selectedGroup.id);
      alert("그룹이 삭제되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmComplete = async () => {
    if (!selectedGroup) return;
    try {
      await groupService.updateGroup(selectedGroup.id, { 
        status: 'completed',
        description: `${selectedGroup.description} (여행 완료 ✈️)` 
      });
      alert("여행 완료 처리되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmEdit = async () => {
    if (!selectedGroup) return;
    try {
      await groupService.updateGroup(selectedGroup.id, { 
        name: editName.trim() || selectedGroup.name,
        description: editDesc.trim() || selectedGroup.description,
        startDate: editStartDate || undefined,
        endDate: editEndDate || undefined,
      });
      alert("그룹 정보가 수정되었습니다.");
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="px-6 py-8 pb-32">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-text-main tracking-tight">여행 팀 관리</h1>
        <p className="text-text-sub mt-2 font-medium">함께 떠나는 친구들과 여행을 공유하세요.</p>
      </header>

      {selectedGroup ? (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
          <section className="bg-bg-base p-8 rounded-[32px] border border-border-base shadow-xl shadow-black/5">
            <div className="flex justify-between items-start mb-6">
              <div>
                <button 
                  onClick={() => setSelectedGroup(null)}
                  className="text-xs font-bold text-primary mb-2 hover:underline"
                >
                  ← 전체 그룹 목록으로
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-text-main">{selectedGroup.name}</h2>
                  {user?.uid === selectedGroup.ownerId && (
                    <div className="relative">
                      <button onClick={() => setShowOptions(!showOptions)} className="p-1.5 text-text-sub hover:bg-bg-alt rounded-full transition-colors">
                        <Settings size={18} />
                      </button>
                      {showOptions && (
                        <div className="absolute left-0 top-full mt-2 w-48 bg-bg-base rounded-2xl shadow-xl border border-border-base py-2 z-50 animate-in fade-in zoom-in-95">
                          {selectedGroup.status !== 'completed' && (
                            <>
                              <button onClick={() => {
                                setEditName(selectedGroup.name);
                                setEditDesc(selectedGroup.description || "");
                                setEditStartDate(selectedGroup.startDate || "");
                                setEditEndDate(selectedGroup.endDate || "");
                                setActiveModal("edit");
                                setShowOptions(false);
                              }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-text-main hover:bg-bg-alt border-b border-border-base">
                                <Settings size={15} /> 정보 수정
                              </button>
                              <button onClick={() => {
                                setActiveModal("complete");
                                setShowOptions(false);
                              }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-primary hover:bg-primary/5">
                                <CheckCircle size={15} /> 여행 완료
                              </button>
                            </>
                          )}
                          <button onClick={() => {
                            setActiveModal("delete");
                            setShowOptions(false);
                          }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-error hover:bg-error/5">
                            <Trash2 size={15} /> 그룹 삭제
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-text-sub mt-1">{selectedGroup.description}</p>
              </div>
              <div className="flex gap-2">
                {selectedGroup.status !== 'completed' && (
                  <button 
                    onClick={() => setShowInviteSection(!showInviteSection)}
                    className="px-4 py-2 bg-primary/10 text-primary font-bold rounded-xl hover:bg-primary/20 transition-colors"
                  >
                    멤버 초대
                  </button>
                )}
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
              <div className="p-6 bg-bg-alt rounded-2xl border border-border-base">
                <p className="text-xs font-bold text-text-sub mb-1">멤버 수</p>
                <p className="text-xl font-black text-text-main">{selectedGroup.members.length}명</p>
              </div>
              <div className="p-6 bg-bg-alt rounded-2xl border border-border-base">
                <p className="text-xs font-bold text-text-sub mb-1">여행 일정</p>
                <p className="text-[17px] font-black text-text-main break-keep">
                  {selectedGroup.startDate && selectedGroup.endDate 
                    ? `${selectedGroup.startDate.replace(/-/g, '.')} ~ ${selectedGroup.endDate.replace(/-/g, '.')}`
                    : selectedGroup.startDate ? `${selectedGroup.startDate.replace(/-/g, '.')} ~ 미정`
                    : "미정"}
                </p>
              </div>
            </div>
            
            <div className="mt-8 pt-8 border-t border-border-base">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-text-main flex items-center gap-2">
                  <LayoutGrid size={18} className="text-primary" />
                  이 그룹의 게시물
                </h3>
                {selectedGroup.status !== 'completed' && (
                  <button 
                    onClick={() => router.push(`/post/create?groupId=${selectedGroup.id}`)}
                    className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-xl hover:opacity-90 transition"
                  >
                    게시판 글쓰기
                  </button>
                )}
              </div>
              
              {isLoadingPosts ? (
                 <div className="text-center py-12 text-text-sub">게시물 불러오는 중...</div>
              ) : groupPosts.length > 0 ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {groupPosts.map(post => (
                     <div key={post.id} className="relative">
                       {/* Wrapped in a scaler to fit 3-col comfortably or just rendered directly */}
                       <PostCard post={post} />
                     </div>
                   ))}
                 </div>
              ) : (
                 <div className="text-center py-12 text-text-sub text-sm italic">
                   아직 그룹 전용 게시물이 없습니다.
                 </div>
              )}
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

      {/* Modals for Group Management */}
      {activeModal === "edit" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-[90%] max-w-[400px] bg-bg-base rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-text-main mb-6">그룹 수정</h3>
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-text-sub mb-1 block">그룹 이름</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-bg-alt border border-border-base rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-main" />
              </div>
              <div>
                <label className="text-xs font-bold text-text-sub mb-1 block">그룹 설명</label>
                <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-bg-alt border border-border-base rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-main" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-sub mb-1 block">가는 날</label>
                  <input type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} className="w-full bg-bg-alt border border-border-base rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-main" />
                </div>
                <div>
                  <label className="text-xs font-bold text-text-sub mb-1 block">오는 날</label>
                  <input type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} min={editStartDate} className="w-full bg-bg-alt border border-border-base rounded-xl p-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-main" />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-bg-alt text-text-sub font-bold rounded-xl hover:bg-border-base transition">취소</button>
              <button onClick={handleConfirmEdit} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition">수정하기</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "complete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-[90%] max-w-[360px] bg-bg-base rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-success" />
            </div>
            <h3 className="text-xl font-black text-text-main mb-2">여행 완료 처리</h3>
            <p className="text-text-sub text-sm mb-8 leading-relaxed">이 여행 그룹을 완료(종료) 처리하시겠습니까?<br/>그룹 이름에 완료 표시가 추가됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-bg-alt text-text-sub font-bold rounded-xl hover:bg-border-base transition">취소</button>
              <button onClick={handleConfirmComplete} className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition">완료하기</button>
            </div>
          </div>
        </div>
      )}

      {activeModal === "delete" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setActiveModal(null)}>
          <div className="w-[90%] max-w-[360px] bg-bg-base rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} className="text-error" />
            </div>
            <h3 className="text-xl font-black text-text-main mb-2">여행 그룹 삭제</h3>
            <p className="text-text-sub text-sm mb-8 leading-relaxed">정말 이 그룹을 삭제하시겠습니까?<br/>관련 데이터가 영구적으로 삭제됩니다.</p>
            <div className="flex gap-3">
              <button onClick={() => setActiveModal(null)} className="flex-1 py-3 bg-bg-alt text-text-sub font-bold rounded-xl hover:bg-border-base transition">취소</button>
              <button onClick={handleConfirmDelete} className="flex-1 py-3 bg-error text-white font-bold rounded-xl hover:opacity-90 shadow-lg shadow-error/20 transition">삭제하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
