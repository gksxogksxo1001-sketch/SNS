"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, Plus, Wallet, Receipt, ArrowRight, CheckCircle2, MoreVertical, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { settlementService } from "@/core/firebase/settlementService";
import { groupService } from "@/core/firebase/groupService";
import { messageService } from "@/core/firebase/messageService";
import { userService } from "@/core/firebase/userService";
import { notificationService } from "@/core/firebase/notificationService";
import { useAuth } from "@/core/hooks/useAuth";
import { Post } from "@/types/post";
import { Group } from "@/types/group";
import { UserProfile } from "@/types/user";

export default function SettlementDetailPage() {
  const params = useParams();
  const groupId = params?.id as string;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  
  // States for Calculator and Add Expense (UI)
  const [showCalculator, setShowCalculator] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<any>("식비");

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const loadDetail = async () => {
      if (groupId) {
        setIsLoading(true);
        try {
          const settlement = await settlementService.calculateGroupSettlement(groupId);
          const group = await groupService.getGroup(groupId);
          
          setSettlementData(settlement);
          setCurrentGroup(group);
          
          if (group) {
            await fetchUserProfiles(group.members);
          }
        } catch (error) {
          console.error("Failed to load settlement detail:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadDetail();
  }, [groupId]);

  const fetchUserProfiles = async (uids: string[]) => {
    const profiles: Record<string, UserProfile> = {};
    await Promise.all(uids.map(async (uid) => {
      const profile = await userService.getUserProfile(uid);
      if (profile) profiles[uid] = profile;
    }));
    setUserProfiles(profiles);
  };

  const myNetBalance = useMemo(() => {
    if (!settlementData || !currentUser) return 0;
    return settlementData.balances[currentUser.uid] || 0;
  }, [settlementData, currentUser]);
  
  const splits = useMemo(() => settlementData?.splits || [], [settlementData]);
  const totalGroupExpense = settlementData?.totalAmount || 0;

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(amount)) + '원';
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "식비": return "🍽️";
      case "숙박": return "🏨";
      case "교통": return "🚕";
      case "액티비티": return "🏄‍♂️";
      default: return "🧾";
    }
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    alert("지출 내역은 '게시물 작성'에서 그룹을 선택하여 등록해 주세요. 자동으로 정산에 반영됩니다.");
    setIsAddExpenseModalOpen(false);
  };

  if (!isHydrated) {
    return null; // Prevents hydration mismatch while Zustand loads from localStorage
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-white/80 p-4 backdrop-blur-md border-b border-[#F1F3F5]">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="text-[#212529] hover:bg-slate-50 p-1.5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-[#212529] tracking-tight">{currentGroup?.name || "정산 상세"}</h1>
            <span className="text-[11px] font-semibold text-[#2A9D8F]">참여자 {currentGroup?.members.length || 0}명</span>
          </div>
        </div>
        <button className="text-[#212529] hover:bg-slate-50 p-1.5 rounded-full transition-colors">
          <MoreVertical size={20} />
        </button>
      </header>

      <div className="p-4 space-y-6">
        
        {/* Main Dashboard Card */}
        <div className="bg-[#2A9D8F] rounded-3xl p-6 text-white shadow-lg shadow-[#2A9D8F]/20 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-xl translate-y-1/3 -translate-x-1/4"></div>
          
          <div className="relative z-10 space-y-5">
            <div>
              <p className="text-white/80 text-xs font-semibold mb-1">총 지출 금액 (그룹 전체)</p>
              <h2 className="text-3xl font-black tracking-tight">{formatMoney(totalGroupExpense)}</h2>
            </div>
            
            <div className="h-px w-full bg-white/20"></div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-xs font-semibold mb-0.5">나의 정산 현황</p>
                <div className="flex items-center space-x-2">
                  <span className="text-lg font-bold">
                    {Math.abs(myNetBalance) === 0 ? "정산 완료" : formatMoney(Math.abs(myNetBalance))}
                  </span>
                  {myNetBalance !== 0 && (
                     <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${myNetBalance > 0 ? "bg-white/20 text-white" : "bg-[#e74c3c] text-white"}`}>
                      {myNetBalance > 0 ? "받을 돈" : "보낼 돈"}
                    </span>
                  )}
                </div>
              </div>
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md border border-white/30 shadow-sm">
                <Wallet size={24} className="text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Dutch Pay Calculator Preview */}
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-[#F1F3F5]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[#212529]">정산 결과 요약</h3>
            <button 
              onClick={() => setShowCalculator(!showCalculator)}
              className="text-[#2A9D8F] text-[12px] font-bold px-3 py-1.5 rounded-xl bg-[#2A9D8F]/10 hover:bg-[#2A9D8F]/20 transition-colors"
            >
              상세 보기
            </button>
          </div>

          <div className="space-y-3">
            {splits.length === 0 ? (
              <p className="text-sm font-medium text-[#ADB5BD] text-center py-4">모든 정산이 완료되었습니다!</p>
            ) : (
              splits.map((split: any, idx: number) => {
                const fromUser = userProfiles[split.fromUserId];
                const toUser = userProfiles[split.toUserId];
                
                const fromUserName = fromUser?.nickname || split.fromUserId;
                const toUserName = toUser?.nickname || split.toUserId;
                
                const fromAvatar = fromUser?.avatarUrl || `https://ui-avatars.com/api/?name=${fromUserName}&background=2A9D8F&color=fff`;
                const toAvatar = toUser?.avatarUrl || `https://ui-avatars.com/api/?name=${toUserName}&background=F1F3F5&color=6C757D`;
                const isMyDebt = split.fromUserId === "me";
                const isMyCredit = split.toUserId === "me";

                return (
                  <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl ${
                    isMyDebt ? "bg-[#e74c3c]/5 border border-[#e74c3c]/10" : 
                    isMyCredit ? "bg-[#2A9D8F]/5 border border-[#2A9D8F]/10" : "bg-[#F8F9FA]"
                  }`}>
                    <div className="flex items-center space-x-3">
                      <div className="flex -space-x-2">
                        <img src={fromAvatar} alt={fromUserName} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
                        <img src={toAvatar} alt={toUserName} className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm" />
                      </div>
                      <div className="flex items-center space-x-1.5 text-[13px] font-semibold text-[#495057]">
                        <span className="text-[#212529] font-bold">{fromUserName.split('(')[0]}</span>
                        <ArrowRight size={14} className="text-[#ADB5BD]" />
                        <span className="text-[#212529] font-bold">{toUserName.split('(')[0]}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[14px] font-black tracking-tight">{formatMoney(split.amount)}</span>
                      {isMyDebt && (
                        <button 
                          onClick={async () => {
                            if (!currentUser || !currentGroup) return;
                            const recipients = [{ uid: split.fromUserId, amount: split.amount }];
                            await notificationService.sendSettlementNotifications(
                              recipients,
                              { uid: currentUser.uid, nickname: currentUser.displayName || "관리자", avatarUrl: currentUser.photoURL },
                              currentGroup.name,
                              currentGroup.id
                            );
                            alert(`${fromUserName}님에게 정산 요청 알림을 보냈습니다.`);
                          }}
                          className="h-6 px-2.5 bg-[#e74c3c] text-white text-[10px] items-center justify-center font-bold rounded-lg hover:bg-[#c0392b] transition-colors"
                        >
                          요청
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expenses Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-[#212529] flex items-center">
              <Receipt size={18} className="mr-2 text-[#2A9D8F]" />
              상세 지출 내역
            </h3>
            <span className="text-[12px] font-semibold text-[#868E96]">집계 완료</span>
          </div>

          <div className="space-y-3">
            {/* Real-time posts list from settlementData if available, 
                for now we only have aggregate data in settlementData. 
                We might need to fetch posts here too if we want a timeline. */}
            <p className="text-xs text-slate-400 text-center py-4 italic">그룹에 등록된 게시물에서 지출 정보를 가져옵니다.</p>
          </div>
        </div>
      </div>

      {/* Floating Action Button for New Expense */}
      <button 
        onClick={() => setIsAddExpenseModalOpen(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-[#212529] text-white rounded-full flex items-center justify-center shadow-xl shadow-[#212529]/20 hover:scale-105 active:scale-95 transition-all z-40"
      >
        <Plus size={24} />
      </button>

      {/* Add Expense Modal Overlay */}
      {isAddExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl flex flex-col slide-in-from-bottom-full overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-[#F1F3F5]">
              <h2 className="text-lg font-black text-[#212529] flex items-center">
                <Receipt size={20} className="mr-2 text-[#2A9D8F]" />
                새 지출 추가
              </h2>
              <button onClick={() => setIsAddExpenseModalOpen(false)} className="p-1.5 text-[#ADB5BD] hover:bg-slate-50 rounded-full">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#495057]">카테고리</label>
                <div className="grid grid-cols-5 gap-2">
                  {["식비", "숙박", "교통", "액티비티", "기타"].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`py-2 rounded-xl text-[12px] font-bold border transition-colors ${
                        newCategory === cat 
                          ? "bg-[#2A9D8F] text-white border-[#2A9D8F]" 
                          : "bg-[#F8F9FA] text-[#868E96] border-[#F1F3F5] hover:border-[#ADB5BD]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#495057]">지출 내역</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="무엇을 결제하셨나요?" 
                  className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3.5 rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none transition-all placeholder:text-[#ADB5BD]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#495057]">결제 금액</label>
                <div className="relative">
                  <input 
                    type="text" 
                    inputMode="numeric"
                    value={newAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setNewAmount(val ? parseInt(val).toLocaleString('ko-KR') : '');
                    }}
                    placeholder="0" 
                    className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3.5 pr-8 rounded-2xl text-[18px] font-black tracking-tight focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none transition-all placeholder:text-[#ADB5BD]"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#495057]">원</span>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit" 
                  className="w-full flex items-center justify-center space-x-2 bg-[#212529] text-white py-4 rounded-2xl text-[15px] font-black shadow-xl hover:bg-[#343a40] active:scale-95 transition-all"
                >
                  <span>지출 내역 등록하기</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
