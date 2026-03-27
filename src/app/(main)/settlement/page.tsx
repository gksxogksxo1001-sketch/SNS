"use client";

import React from "react";
import { Plus, Search, CheckCircle2, Wallet, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/types/user";
import { useAuth } from "@/core/hooks/useAuth";
import { settlementService } from "@/core/firebase/settlementService";
import { userService } from "@/core/firebase/userService";
import { groupService } from "@/core/firebase/groupService";
import Image from "next/image";

// Mock Settlement Groups
export default function SettlementListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [groups, setGroups] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [userProfiles, setUserProfiles] = React.useState<Record<string, UserProfile>>({});

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const unsubscribe = groupService.subscribeToUserGroups(user.uid, async (userGroups) => {
      try {
        const summaries = await Promise.all(userGroups.map(async (group) => {
          const settlement = await settlementService.calculateGroupSettlement(group.id);
          return {
            id: group.id,
            name: group.name,
            date: "최근 여행", 
            participants: group.members,
            settlementStatus: group.settlementStatus || "ongoing",
            totalAmount: settlement.totalAmount,
            myBalance: settlement.balances[user.uid] || 0
          };
        }));
        setGroups(summaries.filter(s => s !== null));
        
        const allParticipants = Array.from(new Set(userGroups.flatMap(g => g.members)));
        await fetchUserProfiles(allParticipants);
      } catch (error) {
        console.error("Failed to load settlement overview:", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

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

  const displayGroups = React.useMemo(() => {
    return [...groups].sort((a, b) => {
      // Priority 1: Status (ongoing first)
      const statusOrder: Record<string, number> = { ongoing: 0, completed: 1 };
      const aOrder = statusOrder[a.settlementStatus || "ongoing"] ?? 2;
      const bOrder = statusOrder[b.settlementStatus || "ongoing"] ?? 2;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Priority 2: Date (Newest first)
      const aTime = a.createdAt?.seconds 
        ? a.createdAt.seconds * 1000 
        : (a.date ? new Date(a.date).getTime() : 0);
      const bTime = b.createdAt?.seconds 
        ? b.createdAt.seconds * 1000 
        : (b.date ? new Date(b.date).getTime() : 0);
        
      return bTime - aTime;
    });
  }, [groups]);

  if (!isHydrated) return null;

  return (
    <div className="flex flex-col min-h-screen bg-bg-alt pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-bg-base/90 p-5 backdrop-blur-md border-b border-border-base">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col space-y-1">
            <h1 className="text-[22px] font-black text-text-main tracking-tight flex items-center">
              <Wallet size={24} className="mr-2 text-primary" />
              정산 그룹
            </h1>
            <span className="text-[13px] font-semibold text-text-sub">투명하고 확실한 여행 더치페이</span>
          </div>
          <button className="text-text-main hover:bg-bg-alt p-2 rounded-full transition-colors bg-bg-base border border-border-base">
            <Search size={20} />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {displayGroups.map((group) => {
          const isCompleted = group.settlementStatus === "completed";
          return (
            <Link href={`/settlement/${group.id}`} key={group.id} className="block group">
              <div className={cn(
                "bg-bg-base rounded-[24px] p-5 shadow-sm border transition-all duration-300 relative overflow-hidden",
                isCompleted 
                  ? "border-border-base opacity-80" 
                  : "border-primary/20 group-hover:border-primary/50 group-hover:shadow-md"
              )}>
                <div className="flex justify-between items-start mb-5">
                  <div>
                    <div className="flex items-center space-x-2 mb-1.5">
                      <h3 className="text-[17px] font-black text-text-main tracking-tight">{group.name}</h3>
                      {isCompleted ? (
                        <span className="flex items-center text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md border border-primary/20">
                          <CheckCircle2 size={12} className="mr-1" />
                          정산 완료
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold bg-error/10 text-error px-2 py-0.5 rounded-md">
                          진행 중
                        </span>
                      )}
                    </div>
                    <span className="text-[12px] font-semibold text-text-sub">{group.date}</span>
                  </div>
                  
                  <div className="flex flex-col items-end space-y-1.5">
                    <div className="flex items-center text-[11px] font-bold text-text-sub">
                      <Users size={12} className="mr-1" />
                      {group.participants.length}명
                    </div>
                    <div className="flex -space-x-2">
                      {group.participants.slice(0, 3).map((p: string, idx: number) => {
                        const profile = userProfiles[p];
                        const avatar = profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.nickname || p}&background=2A9D8F&color=fff`;
                        return (
                          <div key={idx} className="relative w-7 h-7 rounded-full border-2 border-bg-base overflow-hidden shadow-sm bg-bg-alt">
                            <Image 
                              src={avatar} 
                              alt="participant" 
                              fill
                              sizes="28px"
                              className="object-cover" 
                            />
                          </div>
                        );
                      })}
                      {group.participants.length > 3 && (
                        <div className="w-7 h-7 rounded-full border-2 border-bg-base bg-bg-alt flex items-center justify-center text-[9px] font-black text-text-sub z-10">
                          +{group.participants.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                </div>


                {/* 'Settled' Stamp Effect */}
                {isCompleted && (
                  <div className="absolute top-4 right-10 pointer-events-none select-none opacity-[0.25] -rotate-[22deg] border-[6px] border-primary rounded-2xl px-5 py-2 flex flex-col items-center justify-center z-0 scale-125 transition-all">
                    <span className="text-[22px] font-black text-primary tracking-tighter leading-none">SETTLED</span>
                    <div className="w-full h-[2px] bg-primary my-1.5 opacity-60"></div>
                    <span className="text-[10px] font-bold text-primary tracking-[0.3em]">정산완료</span>
                  </div>
                )}

                <div className={cn(
                  "rounded-2xl p-4 flex items-center justify-between border",
                  isCompleted ? "bg-bg-alt border-transparent" : "bg-primary/5 border-primary/10"
                )}>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-text-sub mb-0.5">총 지출 추정</span>
                    <span className="text-[14px] font-black text-text-main">{formatMoney(group.totalAmount || 0)}</span>
                  </div>
                  
                  <div className="w-px h-10 bg-border-base"></div>
                  
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-bold text-text-sub mb-0.5">나의 정산 현황</span>
                    <div className="flex items-center space-x-1.5">
                      {isCompleted ? (
                        <span className="text-[15px] font-black text-text-main">정산 완료</span>
                      ) : (
                        <>
                          <span className="text-[16px] font-black text-text-main">{formatMoney(group.myBalance || 0)}</span>
                          <span className={cn(
                            "text-[10px] font-black px-1.5 py-0.5 rounded-md",
                            (group.myBalance || 0) > 0 ? "bg-primary/10 text-primary" : 
                            (group.myBalance || 0) < 0 ? "bg-error/10 text-error" : "bg-bg-alt text-text-sub"
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
        className="fixed bottom-20 right-4 flex items-center space-x-2 bg-text-main text-bg-base px-5 py-3.5 rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={20} />
        <span className="text-[14px] font-bold">새 정산 시작</span>
      </button>

      {/* New Group / Select Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
          <div className="w-full sm:w-[450px] max-h-[85vh] bg-bg-base rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col slide-in-from-bottom-full sm:slide-in-from-bottom-0 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border-base shrink-0">
              <h2 className="text-[18px] font-black text-text-main tracking-tight">어떤 그룹에서 정산을 할까요?</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 text-text-sub hover:bg-bg-alt rounded-full transition-colors">
                <X size={22} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button 
                onClick={() => router.push("/groups")}
                className="w-full flex items-center p-4 bg-bg-base hover:bg-bg-alt rounded-2xl transition-colors border border-border-base text-left group"
              >
                <div className="w-12 h-12 bg-text-main group-hover:opacity-90 rounded-2xl flex items-center justify-center mr-4 shrink-0 transition-colors">
                  <Plus size={24} className="text-bg-base" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-text-main">새로운 그룹 만들기</span>
                  <span className="text-[12px] font-semibold text-text-sub">새 멤버들과 새로운 정산을 시작합니다</span>
                </div>
              </button>
              
              <div className="pt-4 pb-2 px-2">
                <span className="text-[13px] font-bold text-text-sub">기존 정산 그룹 선택</span>
              </div>
              
              <div className="space-y-2 pb-6">
                {groups.length === 0 ? (
                  <div className="py-8 text-center text-[13px] font-semibold text-text-sub">
                    참여 중인 기존 그룹이 없습니다.
                  </div>
                ) : (
                  groups.map(group => (
                    <button 
                      key={group.id}
                      onClick={async () => {
                        // If group is completed, re-open it
                        if (group.settlementStatus === "completed") {
                          try {
                            await groupService.updateGroup(group.id, { settlementStatus: "ongoing" });
                          } catch (e) {
                             console.error("Failed to reopen group:", e);
                          }
                        }
                        router.push(`/settlement/${group.id}`);
                      }}
                      className="w-full flex items-center p-4 bg-bg-base hover:bg-bg-alt rounded-2xl transition-colors border border-transparent hover:border-border-base text-left group"
                    >
                      <div className="w-12 h-12 bg-primary/10 group-hover:bg-primary/20 rounded-2xl flex items-center justify-center mr-4 shrink-0 transition-colors">
                        <Users size={20} className="text-primary" />
                      </div>
                      <div className="flex flex-col flex-1 overflow-hidden">
                        <span className="text-[15px] font-bold text-text-main truncate">{group.name}</span>
                        <div className="flex items-center space-x-1.5 mt-0.5">
                          <span className="text-[12px] font-semibold text-text-sub truncate">
                            {group.participants.length}명 참여 중
                          </span>
                          {group.settlementStatus === "completed" && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-border-base"></span>
                              <span className="text-[11px] font-bold text-text-sub">완료됨 (클릭 시 재오픈)</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
