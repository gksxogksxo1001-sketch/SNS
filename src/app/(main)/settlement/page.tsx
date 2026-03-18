"use client";

import React from "react";
import { Plus, Search, CheckCircle2, Wallet, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSettlementStore } from "@/store/useSettlementStore";
import { userService } from "@/core/firebase/userService";
import { UserProfile } from "@/types/user";

// Mock Settlement Groups
export default function SettlementListPage() {
  const router = useRouter();
  const { expenses, groups, addGroup } = useSettlementStore();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [userProfiles, setUserProfiles] = React.useState<Record<string, UserProfile>>({});

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (groups.length > 0) {
      const allParticipants = Array.from(new Set(groups.flatMap((g: any) => g.participants)));
      fetchUserProfiles(allParticipants);
    }
  }, [groups]);

  const fetchUserProfiles = async (uids: string[]) => {
    const profiles: Record<string, UserProfile> = {};
    await Promise.all(uids.map(async (uid) => {
      const profile = await userService.getUserProfile(uid);
      if (profile) profiles[uid] = profile;
    }));
    setUserProfiles(profiles);
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.abs(Math.round(amount))) + '원';
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    addGroup({
      name: newGroupName,
      status: 'ongoing',
      date: new Date().toLocaleDateString('ko-KR'),
      participants: ["me"] // Initial participant
    });

    setNewGroupName("");
    setIsModalOpen(false);
  };

  const displayGroups = groups.map((group: any) => {
    const groupExpenses = expenses.filter(e => e.groupId === group.id);
    const totalAmount = groupExpenses.reduce((acc, exp) => acc + exp.amount, 0);
    const myTotalPaid = groupExpenses.filter(e => e.paidBy === "me").reduce((acc, exp) => acc + exp.amount, 0);
    const myTotalShare = groupExpenses.filter(e => e.participants.includes("me")).reduce((acc, exp) => acc + (exp.amount / (exp.participants.length || 1)), 0);
    const myBalance = myTotalPaid - myTotalShare;

    return {
      ...group,
      totalAmount,
      myBalance
    };
  });

  if (!isHydrated) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 p-5 backdrop-blur-md border-b border-[#F1F3F5]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col space-y-1">
            <h1 className="text-[22px] font-black text-[#212529] tracking-tight flex items-center">
              <Wallet size={24} className="mr-2 text-[#2A9D8F]" />
              정산 그룹
            </h1>
            <span className="text-[13px] font-semibold text-[#868E96]">투명하고 확실한 여행 더치페이</span>
          </div>
          <button className="text-[#212529] hover:bg-slate-50 p-2 rounded-full transition-colors bg-[#F8F9FA] border border-[#F1F3F5]">
            <Search size={20} />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {displayGroups.map((group) => {
          const isCompleted = group.status === "completed";
          return (
            <Link href={`/settlement/${group.id}`} key={group.id} className="block group">
              <div className={cn(
                "bg-white rounded-[24px] p-5 shadow-sm border transition-all duration-300",
                isCompleted 
                  ? "border-[#F1F3F5] opacity-80" 
                  : "border-[#2A9D8F]/20 group-hover:border-[#2A9D8F]/50 group-hover:shadow-md"
              )}>
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <h3 className="text-[17px] font-black text-[#212529] tracking-tight">{group.name}</h3>
                      {isCompleted ? (
                        <span className="flex items-center text-[10px] font-bold bg-[#F8F9FA] text-[#ADB5BD] px-2 py-0.5 rounded-md border border-[#F1F3F5]">
                          <CheckCircle2 size={12} className="mr-1" />
                          정산 완료
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-[#e74c3c]/10 text-[#e74c3c] px-2 py-0.5 rounded-md">
                          진행 중
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] font-semibold text-[#ADB5BD]">{group.date}</span>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1.5">
                    <div className="flex items-center text-[11px] font-bold text-[#868E96]">
                      <Users size={12} className="mr-1" />
                      {group.participants.length}명
                    </div>
                    <div className="flex -space-x-2">
                      {group.participants.slice(0, 3).map((p: string, idx: number) => {
                        const profile = userProfiles[p];
                        const avatar = profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.nickname || p}&background=2A9D8F&color=fff`;
                        return <img key={idx} src={avatar} alt="participant" className="w-7 h-7 rounded-full border-2 border-white object-cover shadow-sm bg-slate-100" />
                      })}
                      {group.participants.length > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-white bg-[#F1F3F5] flex items-center justify-center text-[9px] font-black text-[#6C757D] z-10">
                          +{group.participants.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "rounded-2xl p-4 flex items-center justify-between border",
                  isCompleted ? "bg-[#F8F9FA] border-transparent" : "bg-[#2A9D8F]/5 border-[#2A9D8F]/10"
                )}>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-[#868E96] mb-0.5">총 지출 추정</span>
                    <span className="text-[14px] font-black text-[#495057]">{formatMoney(group.totalAmount || 0)}</span>
                  </div>
                  
                  <div className="w-px h-10 bg-[#DEE2E6]"></div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-bold text-[#868E96] mb-0.5">나의 정산 현황</span>
                    <div className="flex items-center space-x-1.5">
                      {isCompleted ? (
                        <span className="text-[15px] font-black text-[#ADB5BD]">정산 완료</span>
                      ) : (
                        <>
                          <span className="text-[16px] font-black text-[#212529]">{formatMoney(group.myBalance || 0)}</span>
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                            (group.myBalance || 0) > 0 ? "bg-[#2A9D8F]/10 text-[#2A9D8F]" : 
                            (group.myBalance || 0) < 0 ? "bg-[#e74c3c]/10 text-[#e74c3c]" : "bg-[#F1F3F5] text-[#868E96]"
                          )}>
                            {(group.myBalance || 0) > 0 ? "받을 돈" : (group.myBalance || 0) < 0 ? "보낼 돈" : "완료"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* FAB for new settlement group */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-20 right-4 flex items-center space-x-2 bg-[#212529] text-white px-5 py-3.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={20} />
        <span className="text-[14px] font-bold">새 정산 시작</span>
      </button>

      {/* New Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
          <div className="w-full sm:w-[400px] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col slide-in-from-bottom-full sm:slide-in-from-bottom-0 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#F1F3F5]">
              <h2 className="text-lg font-black text-[#212529]">새 정산 그룹 만들기</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-[#ADB5BD] hover:bg-slate-50 rounded-full">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#495057]">그룹 이름</label>
                <input 
                  type="text" 
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="예: 부산 우정여행, 강남 점심모임" 
                  className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3.5 rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none transition-all"
                  required
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-[#212529] text-white py-4 rounded-2xl text-[15px] font-black shadow-lg hover:bg-[#343a40] transition-all active:scale-95"
              >
                그룹 생성하기
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
