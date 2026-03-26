"use client";

import React, { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Wallet, Receipt, ArrowRight, CheckCircle2, X, MoreVertical } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { settlementService } from "@/core/firebase/settlementService";
import { groupService } from "@/core/firebase/groupService";
import { messageService } from "@/core/firebase/messageService";
import { userService } from "@/core/firebase/userService";
import { postService } from "@/core/firebase/postService";
import { notificationService } from "@/core/firebase/notificationService";
import { UserProfile } from "@/types/user";
import { Group } from "@/types/group";
import { useAuth } from "@/core/hooks/useAuth";
import { ConfirmModal, AlertModal } from "@/components/common/UIModals";

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
  const [myDebts, setMyDebts] = useState<any[]>([]);
  const [openExpenseMenuId, setOpenExpenseMenuId] = useState<string | null>(null);

  const [confirmConfig, setConfirmConfig] = useState<any>({ isOpen: false });
  const [alertConfig, setAlertConfig] = useState<any>({ isOpen: false });

  // For explanation modal
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuTriggerRef = React.useRef<HTMLButtonElement>(null);

  // States for Calculator and Add Expense (UI)
  const [showCalculator, setShowCalculator] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isAddExpenseModalOpen, setIsAddExpenseModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCategory, setNewCategory] = useState<any>("식비");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);


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
            setSelectedParticipants(group.members);
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

  const aggregatedExpenses = useMemo(() => {
    if (!settlementData) return [];
    const all = [
      ...(settlementData.posts || []).map((p: any) => ({ ...p, type: 'post' })),
      ...(settlementData.expenses || []).map((e: any) => ({ ...e, type: 'direct' }))
    ];
    return all.sort((a, b) => {
      const dateA = new Date(a.date?.toDate ? a.date.toDate() : (a.createdAt?.toDate ? a.createdAt.toDate() : a.date || a.createdAt)).getTime();
      const dateB = new Date(b.date?.toDate ? b.date.toDate() : (b.createdAt?.toDate ? b.createdAt.toDate() : b.date || b.createdAt)).getTime();
      return dateB - dateA;
    });
  }, [settlementData]);





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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newAmount || !currentUser || !groupId) return;

    const amountNum = parseInt(newAmount.replace(/[^0-9]/g, ''));
    if (isNaN(amountNum)) return;

    try {
      await settlementService.addExpense({
        groupId,
        title: newTitle,
        amount: amountNum,
        paidBy: currentUser.uid,
        participants: selectedParticipants.length > 0 ? selectedParticipants : (currentGroup?.members || []),
        category: newCategory,
        date: new Date().toISOString()
      });

      setIsAddExpenseModalOpen(false);
      setNewTitle("");
      setNewAmount("");

      // Refresh data
      const settlement = await settlementService.calculateGroupSettlement(groupId);
      setSettlementData(settlement);
      setNewTitle("");
      setNewAmount("");
      setIsAddingExpense(false);
      setAlertConfig({ isOpen: true, title: "성공", message: "지출 내역이 성공적으로 등록되었습니다.", type: "success" });
    } catch (error) {
      console.error(error);
      setAlertConfig({ isOpen: true, title: "오류", message: "등록 중 오류가 발생했습니다.", type: "error" });
    }
  };

  const handleCompleteSettlement = async () => {
    console.info("handleCompleteSettlement clicked", { groupId });
    if (!groupId) return;
    try {
      await groupService.updateGroup(groupId, { settlementStatus: 'completed' });
      setCurrentGroup(prev => prev ? { ...prev, settlementStatus: 'completed' } : null);
      setAlertConfig({ isOpen: true, title: "완료", message: "정산이 모두 완료 처리되었습니다.", type: "success" });
    } catch (e) {
      console.error("Complete failed:", e);
      setAlertConfig({ isOpen: true, title: "오류", message: "처리 중 오류가 발생했습니다: " + (e as any).message, type: "error" });
    }
  };


  const handleSettleSplit = async (fromUserId: string, toUserId: string, amount: number) => {
    if (!groupId || !currentGroup) return;
    try {
      await settlementService.markSplitAsSettled(groupId, fromUserId, toUserId, amount);
      const settlement = await settlementService.calculateGroupSettlement(groupId);
      setSettlementData(settlement);

      // Notify the person who was just marked as settled (the debtor)
      // If current user is the creditor (toUserId), notify the debtor (fromUserId)
      if (currentUser?.uid === toUserId && fromUserId !== "me") {
        await notificationService.sendSettlementPaymentNotification(
          fromUserId,
          { uid: currentUser.uid, nickname: currentUser.displayName || "관리자", avatarUrl: currentUser.photoURL },
          currentGroup.name,
          currentGroup.id,
          amount
        );
      }

      setAlertConfig({ isOpen: true, title: "정산 확인", message: "해당 정산 건이 완료되었습니다.", type: "success" });
    } catch (e) {
      console.error("Settle split failed:", e);
      setAlertConfig({ isOpen: true, title: "오류", message: "정산 도중 오류가 발생했습니다.", type: "error" });
    }
  };

  const executeDeleteExpense = async (id: string, type: 'post' | 'direct') => {
    try {
      if (type === 'post') {
        await postService.deletePost(id);
      } else {
        await settlementService.deleteExpense(id);
      }

      const settlement = await settlementService.calculateGroupSettlement(groupId);
      setSettlementData(settlement);
      setOpenExpenseMenuId(null);
      setAlertConfig({ isOpen: true, title: "삭제 완료", message: "지출 내역이 성공적으로 삭제되었습니다.", type: "success" });
    } catch (e) {
      console.error("Delete failed:", e);
      setAlertConfig({ isOpen: true, title: "오류", message: "삭제 중 오류가 발생했습니다.", type: "error" });
    }
  };

  const handleDeleteExpense = (id: string, type: 'post' | 'direct') => {
    setConfirmConfig({
      isOpen: true,
      title: "지출 내역 삭제",
      message: "이 지출 내역을 정말 삭제하시겠습니까?",
      isDanger: true,
      confirmText: "삭제하기",
      onClose: () => setConfirmConfig({ isOpen: false }),
      onConfirm: () => executeDeleteExpense(id, type)
    });
  };

  const handleRequestAllSettlements = async () => {
    if (!currentUser || !currentGroup || !splits.length) return;

    const myCredits = splits.filter((s: any) => s.toUserId === currentUser.uid);
    if (myCredits.length === 0) {
      setAlertConfig({ isOpen: true, title: "안내", message: "요청할 정산 내역이 없습니다.", type: "info" });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: "정산 요청 일괄 전송",
      message: `${myCredits.length}명에게 정산 요청 알림(메시지)을 일괄로 보내시겠습니까?`,
      confirmText: "전송하기",
      onClose: () => setConfirmConfig({ isOpen: false }),
      onConfirm: executeRequestAllSettlements
    });
  };

  const executeRequestAllSettlements = async () => {
    if (!currentUser || !currentGroup || !splits.length) return;
    const myCredits = splits.filter((s: any) => s.toUserId === currentUser.uid);
    
    setIsLoading(true);
    let successCount = 0;

    try {
      for (const split of myCredits) {
        try {
          // 1. Send 1:1 Chat Message
          const roomId = await messageService.createOrGetRoom(currentUser.uid, split.fromUserId);
          const messageText = `'${currentGroup.name}' 정산 요청: ${formatMoney(split.amount)}원을 보내주세요.`;
          await messageService.sendMessage(
            roomId,
            currentUser.uid,
            messageText,
            "settlement",
            {
              title: `${currentGroup.name} 정산`,
              amountToPay: Math.round(split.amount),
              bankAccount: "채팅으로 문의"
            }
          );

          // 2. Send Notification
          const recipients = [{ uid: split.fromUserId, amount: split.amount }];
          await notificationService.sendSettlementNotifications(
            recipients,
            { uid: currentUser.uid, nickname: currentUser.displayName || "관리자", avatarUrl: currentUser.photoURL },
            currentGroup.name,
            currentGroup.id
          );
          successCount++;
        } catch (err) {
          console.error(`Failed to request from ${split.fromUserId}:`, err);
        }
      }
      setAlertConfig({ isOpen: true, title: "성공", message: "모든 정산 요청 알림을 보냈습니다.", type: "success" });
    } finally {
      setIsLoading(false);
    }
  };


      if (!isHydrated) {
        return null; // Prevents hydration mismatch while Zustand loads from localStorage
      }

      return (
        <div className="flex flex-col min-h-screen bg-bg-alt pb-24">
          {/* Header */}
          <header className="sticky top-0 z-40 flex items-center justify-between bg-bg-base/80 p-4 backdrop-blur-md border-b border-border-base">
            <div className="flex items-center space-x-3">
              <button onClick={() => router.back()} className="text-text-main hover:bg-bg-alt p-1.5 rounded-full transition-colors">
                <ChevronLeft size={24} />
              </button>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <h1 className="text-[17px] font-black text-text-main truncate max-w-[150px]">
                    {currentGroup?.name || "정산 상세"}
                  </h1>
                  {currentGroup?.settlementStatus === "completed" ? (
                    <span className="ml-2 text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20 shadow-sm flex items-center">
                      <CheckCircle2 size={12} className="mr-1.5" />
                      정산 완료
                    </span>
                  ) : (
                    currentGroup?.ownerId === currentUser?.uid && (
                      <button
                        onClick={() => {
                          setConfirmConfig({
                            isOpen: true,
                            title: "정산 마감",
                            message: "모든 정산이 완료되었습니까?\n그룹 상태를 완전히 '정산 완료'로 변경합니다.",
                            confirmText: "마감하기",
                            onClose: () => setConfirmConfig({ isOpen: false }),
                            onConfirm: handleCompleteSettlement
                          });
                        }}
                        className="ml-2 text-[11px] font-black bg-primary text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-all shadow-md shadow-primary/20 active:scale-95 flex items-center border border-primary/20"
                      >
                        <CheckCircle2 size={12} className="mr-1.5" />
                        정산 마감하기
                      </button>
                    )
                  )}
                </div>
                <span className="text-[11px] font-semibold text-primary">참여자 {currentGroup?.members.length || 0}명</span>
              </div>
            </div>
          </header>

          <div className="p-4 space-y-6 relative overflow-hidden">
            {/* 'Settled' Stamp Effect */}
            {currentGroup?.settlementStatus === "completed" && (
              <div className="absolute top-10 right-10 pointer-events-none select-none opacity-[0.2] -rotate-[15deg] border-[8px] border-primary rounded-3xl px-8 py-4 flex flex-col items-center justify-center z-50 scale-150 transition-all">
                <span className="text-[40px] font-black text-primary tracking-tighter leading-none">SETTLED</span>
                <div className="w-full h-[3px] bg-primary my-2 opacity-60"></div>
                <span className="text-[14px] font-bold text-primary tracking-[0.5em]">정산완료</span>
              </div>
            )}

            {/* Main Dashboard Card */}
            <div className="bg-primary rounded-3xl p-6 text-white shadow-lg shadow-primary/20 relative overflow-hidden">
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
                        {currentGroup?.settlementStatus === "completed" ? "정산 완료" : formatMoney(Math.abs(myNetBalance))}
                      </span>
                      {myNetBalance !== 0 && (
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${myNetBalance > 0 ? "bg-white/20 text-white" : "bg-error text-white"}`}>
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
            <div className="bg-bg-base rounded-3xl p-5 shadow-sm border border-border-base">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-[15px] font-bold text-text-main">정산 결과 요약</h3>
                  {currentGroup?.settlementStatus !== "completed" && splits.some((s: any) => s.toUserId === currentUser?.uid) && (
                    <button 
                  onClick={() => {
                    setConfirmConfig({
                      isOpen: true,
                      title: "전체 정산 요청",
                      message: "받을 돈이 있는 모든 멤버에게 그룹 알림으로 정산 요청을 보내시겠습니까?",
                      confirmText: "요청하기",
                      onClose: () => setConfirmConfig({ isOpen: false }),
                      onConfirm: async () => {
                        try {
                          const myCredits = splits.filter((s: any) => s.toUserId === currentUser?.uid);
                          const recipients = myCredits.map((s: any) => ({ uid: s.fromUserId, amount: s.amount }));
                          
                          // 1. Send Notifications
                          await notificationService.sendSettlementNotifications(
                            recipients,
                            { uid: currentUser!.uid, nickname: currentUser!.displayName || "관리자", avatarUrl: currentUser!.photoURL },
                            currentGroup!.name,
                            currentGroup!.id
                          );

                          // 2. Update all states to requested
                          await Promise.all(recipients.map((r: any) =>
                            groupService.updateSplitState(currentGroup!.id, r.uid, currentUser!.uid, 'requested')
                          ));

                          setAlertConfig({ 
                            isOpen: true, title: "요청 완료", message: "모두에게 정산 요청 알림을 보냈습니다.", type: "success",
                            onClose: () => window.location.reload()
                          });
                        } catch (e) {
                          console.error(e);
                          setAlertConfig({ isOpen: true, title: "오류", message: "정산 요청 알림 전송 중 오류가 발생했습니다.", type: "error" });
                        }
                      }
                    });
                  }}
                  className="px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded-md hover:bg-error/20 transition-colors"
                >
                  전체 요청
                </button>
              )}
            </div>
            <button
              onClick={() => setShowExplanation(true)}
                  className="text-primary text-[12px] font-bold px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  상세 보기
                </button>
              </div>

              <div className="space-y-3">
                {splits.length === 0 ? (
                  <p className="text-sm font-medium text-text-sub text-center py-4">모든 정산이 완료되었습니다!</p>
                ) : (
                  splits.map((split: any, idx: number) => {
                    const fromUser = userProfiles[split.fromUserId];
                    const toUser = userProfiles[split.toUserId];

                    const fromUserName = fromUser?.nickname || split.fromUserId;
                    const toUserName = toUser?.nickname || split.toUserId;

                    const fromAvatar = fromUser?.avatarUrl || `https://ui-avatars.com/api/?name=${fromUserName}&background=var(--primary-hex)&color=fff`;
                    const toAvatar = toUser?.avatarUrl || `https://ui-avatars.com/api/?name=${toUserName}&background=var(--bg-alt-hex)&color=var(--text-sub-hex)`;
                    const isMyDebt = split.fromUserId === currentUser?.uid;
                    const isMyCredit = split.toUserId === currentUser?.uid;

                    return (
                      <div key={idx} className={`flex items-center justify-between p-3 rounded-2xl ${isMyDebt ? "bg-error/5 border border-error/10" :
                          isMyCredit ? "bg-primary/5 border border-primary/10" : "bg-bg-alt"
                        }`}>
                        <div className="flex items-center space-x-3">
                          <div className="flex -space-x-2">
                            <img src={fromAvatar} alt={fromUserName} className="w-8 h-8 rounded-full border-2 border-bg-base object-cover shadow-sm" />
                            <img src={toAvatar} alt={toUserName} className="w-8 h-8 rounded-full border-2 border-bg-base object-cover shadow-sm" />
                          </div>
                          <div className="flex items-center space-x-1.5 text-[13px] font-semibold text-text-sub">
                            <span className="text-text-main font-bold">{fromUserName.split('(')[0]}</span>
                            <ArrowRight size={14} className="text-text-sub" />
                            <span className="text-text-main font-bold">{toUserName.split('(')[0]}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end space-y-1.5 ml-2">
                          <p className="text-[14px] font-black text-text-main whitespace-nowrap">{formatMoney(split.amount)}</p>
                          {currentGroup?.settlementStatus !== "completed" && (
                            <div className="flex items-center space-x-1">

                              {/* DEBTOR ACTIONS (송금자) */}
                              {isMyDebt && (
                                <>
                                  {currentGroup?.splitStates?.[`${split.fromUserId}_${split.toUserId}`] === 'paid' ? (
                                    <div className="h-6 px-2.5 bg-bg-alt text-text-sub text-[10px] flex items-center justify-center font-bold rounded-lg cursor-not-allowed border border-border-base">
                                      입금확인 대기중
                                    </div>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        if (!currentUser || !currentGroup) return;
                                        if (!confirm("입금을 완료하셨나요? 상대방에게 알림이 전송됩니다.")) return;
                                        try {
                                          await groupService.updateSplitState(currentGroup.id, currentUser.uid, split.toUserId, 'paid');
                                          await notificationService.sendSettlementPaymentNotification(
                                            split.toUserId,
                                            { uid: currentUser.uid, nickname: currentUser.displayName || "멤버", avatarUrl: currentUser.photoURL },
                                            currentGroup.name,
                                            currentGroup.id,
                                            split.amount
                                          );
                                          alert("입금 완료 알림을 보냈습니다. 상대방이 확인하면 정산이 종료됩니다.");
                                          window.location.reload();
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                      className="h-6 px-2.5 bg-primary text-white text-[10px] flex items-center justify-center font-bold rounded-lg hover:opacity-90 transition-colors"
                                    >
                                      입금완료
                                    </button>
                                  )}
                                </>
                              )}

                              {/* CREDITOR ACTIONS (수취자) */}
                              {isMyCredit && (
                                <>
                                  {currentGroup?.splitStates?.[`${split.fromUserId}_${split.toUserId}`] === 'paid' ? (
                                    <button
                                      onClick={async () => {
                                        if (!currentUser || !currentGroup) return;
                                        if (!confirm("실제 입금을 확인하셨나요? 확인 시 최종 정산 처리됩니다.")) return;
                                        try {
                                          await handleSettleSplit(split.fromUserId, split.toUserId, split.amount);
                                          await groupService.updateSplitState(currentGroup.id, split.fromUserId, currentUser.uid, null);
                                        } catch (e) {
                                          console.error(e);
                                        }
                                      }}
                                      className="h-6 px-2.5 bg-primary text-white text-[10px] flex items-center justify-center font-bold rounded-lg hover:opacity-90 transition-colors shadow-sm ring-2 ring-primary/50 ring-offset-1 ring-offset-bg-base animate-pulse"
                                    >
                                      정산확인
                                    </button>
                                  ) : (
                                    <button
                                      onClick={async () => {
                                        if (!currentUser || !currentGroup) return;

                                        try {
                                          // 1. Send Notification Only (No Chat)
                                          const recipients = [{ uid: split.fromUserId, amount: split.amount }];
                                          await notificationService.sendSettlementNotifications(
                                            recipients,
                                            { uid: currentUser.uid, nickname: currentUser.displayName || "관리자", avatarUrl: currentUser.photoURL },
                                            currentGroup.name,
                                            currentGroup.id
                                          );

                                          // 2. Update stat to requested
                                          await groupService.updateSplitState(currentGroup.id, split.fromUserId, currentUser!.uid, 'requested');

                                          const fromUserName = userProfiles[split.fromUserId]?.nickname || split.fromUserId;
                                          alert(`${fromUserName}님에게 정산 요청 알림을 보냈습니다.`);
                                          window.location.reload();
                                        } catch (e) {
                                          console.error("Settlement request failed:", e);
                                          alert("요청 중 오류가 발생했습니다.");
                                        }
                                      }}
                                      className={`h-6 px-2.5 ${currentGroup?.splitStates?.[`${split.fromUserId}_${split.toUserId}`] === 'requested' ? 'bg-bg-alt text-text-sub border border-border-base' : 'bg-error text-white border border-transparent hover:opacity-90'} text-[10px] flex items-center justify-center font-bold rounded-lg transition-colors`}
                                    >
                                      {currentGroup?.splitStates?.[`${split.fromUserId}_${split.toUserId}`] === 'requested' ? "요청됨" : "요청"}
                                    </button>
                                  )}
                                </>
                              )}

                            </div>
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
                <h3 className="text-[15px] font-bold text-text-main flex items-center">
                  <Receipt size={18} className="mr-2 text-primary" />
                  상세 지출 내역
                </h3>
                <span className="text-[12px] font-semibold text-text-sub">집계 완료</span>
              </div>

              <div className="space-y-3">
                {aggregatedExpenses.length === 0 ? (
                  <p className="text-xs text-text-sub text-center py-8 italic bg-bg-base/50 rounded-3xl border border-dashed border-border-base">
                    아직 등록된 지출 내역이 없습니다.
                  </p>
                ) : (
                  aggregatedExpenses.map((exp: any, idx: number) => (
                    <div key={idx} className="bg-bg-base p-4 rounded-2xl border border-border-base flex items-center justify-between shadow-sm">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 ${exp.title === "정산 완료" ? "bg-primary/10" : "bg-bg-alt"} rounded-full flex items-center justify-center text-lg`}>
                          {exp.title === "정산 완료" ? "✅" : getCategoryIcon(exp.category || "기타")}
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className={`text-[14px] font-bold ${exp.title === "정산 완료" ? "text-primary" : "text-text-main"}`}>{exp.title}</h4>
                            {exp.title === "정산 완료" && (
                              <span className="bg-primary text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-tighter">정산완료</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            <span className="text-[11px] font-semibold text-text-sub">
                              {userProfiles[exp.paidBy || exp.user?.uid]?.nickname?.split('(')[0] || "관리자"} ➡️ {userProfiles[exp.participants?.[0]]?.nickname?.split('(')[0] || "상대방"}
                            </span>
                            {exp.title !== "정산 완료" && (
                              <>
                                <span className="text-[11px] text-border-base">•</span>
                                <div className="flex -space-x-1">
                                  {(exp.participants || currentGroup?.members || []).map((pId: string, pIdx: number) => (
                                    <img
                                      key={pId}
                                      src={userProfiles[pId]?.avatarUrl || `https://ui-avatars.com/api/?name=${userProfiles[pId]?.nickname || pId}&background=var(--primary-hex)&color=fff`}
                                      className="w-4 h-4 rounded-full border border-bg-base object-cover"
                                      title={userProfiles[pId]?.nickname}
                                    />
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`text-[15px] font-black ${exp.title === "정산 완료" ? "text-primary" : "text-text-main"}`}>
                          {formatMoney(exp.amount || exp.totalExpense || 0)}
                        </span>

                        {currentGroup?.settlementStatus !== "completed" && (
                          <div className="relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenExpenseMenuId(openExpenseMenuId === exp.id ? null : exp.id);
                              }}
                              className="p-1.5 text-[#ADB5BD] hover:bg-[#F8F9FA] rounded-full transition-colors"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {openExpenseMenuId === exp.id && (
                              <div className="absolute right-0 mt-1 w-32 bg-bg-base rounded-xl shadow-xl border border-border-base overflow-hidden z-[50] animate-in fade-in zoom-in-95 duration-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteExpense(exp.id, exp.type);
                                  }}
                                  className="w-full text-left px-4 py-2.5 text-[12px] font-bold text-error hover:bg-error/5 flex items-center"
                                >
                                  <X size={14} className="mr-2" />
                                  삭제하기
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Floating Action Button for New Expense */}
          {currentGroup?.settlementStatus !== "completed" && (
            <button
              onClick={() => {
                setSelectedParticipants(currentGroup?.members || []);
                setIsAddExpenseModalOpen(true);
              }}
              className="fixed bottom-28 right-6 w-14 h-14 bg-primary text-white rounded-full flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all z-40"
            >
              <Plus size={24} />
            </button>
          )}

          {/* Explanation Modal */}
          {showExplanation && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4" onClick={() => setShowExplanation(false)}>
              <div className="w-full max-w-md bg-bg-base rounded-[32px] shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden max-h-[80vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-border-base">
                  <h2 className="text-lg font-black text-text-main">정산 상세 내역</h2>
                  <button onClick={() => setShowExplanation(false)} className="p-1.5 text-text-sub hover:bg-bg-alt rounded-full">
                    <X size={22} />
                  </button>
                </div>
                <div className="overflow-y-auto p-6 space-y-6">
                  {splits.map((split: any, idx: number) => {
                    const fromName = userProfiles[split.fromUserId]?.nickname || split.fromUserId;
                    const toName = userProfiles[split.toUserId]?.nickname || split.toUserId;

                    // Find all expenses where Creditor paid and Debtor participated (excluding '정산 완료')
                    // Sort by date ascending to consume older expenses first
                    const expensesCreditorPaidForDebtor = aggregatedExpenses.filter((exp: any) => {
                      if (exp.title === "정산 완료") return false;
                      const participants = exp.participants || currentGroup?.members || [];
                      const isPaidByCreditor = (exp.paidBy || exp.user?.uid) === split.toUserId;
                      const isDebtorParticipant = participants.includes(split.fromUserId);
                      return isPaidByCreditor && isDebtorParticipant;
                    }).sort((a: any, b: any) => {
                      const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.date || 0).getTime();
                      const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.date || 0).getTime();
                      return timeA - timeB;
                    });

                    // Calculate total amount Debtor has paid that benefited the Creditor (includes previous '정산 완료')
                    let totalDebtorPaidForCreditor = 0;
                    aggregatedExpenses.forEach((exp: any) => {
                      const participants = exp.participants || currentGroup?.members || [];
                      const isPaidByDebtor = (exp.paidBy || exp.user?.uid) === split.fromUserId;
                      const isCreditorParticipant = participants.includes(split.toUserId);

                      if (isPaidByDebtor && isCreditorParticipant) {
                        const pCount = participants.length || 1;
                        totalDebtorPaidForCreditor += (exp.amount || exp.totalExpense || 0) / pCount;
                      }
                    });

                    // Consume expenses using the total paid amount
                    const displayExpenses: { exp: any, remainingShare: number }[] = [];
                    let remainingOffset = totalDebtorPaidForCreditor;

                    for (const exp of expensesCreditorPaidForDebtor) {
                      const pCount = (exp.participants || currentGroup?.members || []).length || 1;
                      let debtorShare = (exp.amount || exp.totalExpense || 0) / pCount;

                      if (remainingOffset > 0) {
                        if (remainingOffset >= debtorShare) {
                          remainingOffset -= debtorShare;
                          continue; // Fully paid off
                        } else {
                          debtorShare -= remainingOffset;
                          remainingOffset = 0;
                          displayExpenses.push({ exp, remainingShare: debtorShare }); // Partially paid off
                        }
                      } else {
                        displayExpenses.push({ exp, remainingShare: debtorShare });
                      }
                    }

                    return (
                      <div key={idx} className="space-y-3 bg-bg-alt p-4 rounded-2xl border border-border-base">
                        <div className="flex items-center justify-between font-black text-[14px]">
                          <div className="flex items-center space-x-2">
                            <span className="text-error">{fromName.split('(')[0]}</span>
                            <ArrowRight size={14} className="text-text-sub" />
                            <span className="text-primary">{toName.split('(')[0]}</span>
                          </div>
                          <span className="text-text-main">{formatMoney(split.amount)}</span>
                        </div>
                        <div className="h-px bg-border-base w-full my-2"></div>
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-text-sub mb-2">정산 근거 (관련 지출)</p>
                          {displayExpenses.length > 0 ? displayExpenses.map((item, eIdx) => {
                            return (
                              <div key={eIdx} className="flex justify-between text-[12px] font-medium text-text-main">
                                <span className="truncate flex-1 mr-2">• {item.exp.title}</span>
                                <span className="text-text-sub shrink-0">{formatMoney(item.remainingShare)}</span>
                              </div>
                            );
                          }) : (
                            <p className="text-[11px] text-text-sub">최적화된 정산 결과입니다.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-6 pt-0">
                  <button onClick={() => setShowExplanation(false)} className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all">확인</button>
                </div>
              </div>
            </div>
          )}

          {/* Add Expense Modal Overlay */}
          {isAddExpenseModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
              <div className="w-full max-w-md bg-bg-base rounded-[32px] shadow-2xl flex flex-col animate-in zoom-in-95 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-border-base">
                  <h2 className="text-lg font-black text-text-main flex items-center">
                    <Receipt size={20} className="mr-2 text-primary" />
                    새 지출 추가
                  </h2>
                  <button onClick={() => setIsAddExpenseModalOpen(false)} className="p-1.5 text-text-sub hover:bg-bg-alt rounded-full">
                    <X size={22} />
                  </button>
                </div>

                <form onSubmit={handleAddExpense} className="p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-text-sub">카테고리</label>
                    <div className="grid grid-cols-5 gap-2">
                      {["식비", "숙박", "교통", "액티비티", "기타"].map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setNewCategory(cat)}
                          className={`py-2 rounded-xl text-[12px] font-bold border transition-colors ${newCategory === cat
                              ? "bg-primary text-white border-primary"
                              : "bg-bg-alt text-text-sub border-border-base hover:border-text-sub"
                            }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[13px] font-bold text-text-sub">정산 인원 조정</label>
                      <button
                        type="button"
                        onClick={() => {
                          if (currentGroup) {
                            if (selectedParticipants.length === currentGroup.members.length) {
                              setSelectedParticipants([]);
                            } else {
                              setSelectedParticipants(currentGroup.members);
                            }
                          }
                        }}
                        className="text-[11px] font-bold text-primary"
                      >
                        {selectedParticipants.length === currentGroup?.members.length ? "전체 해제" : "전체 선택"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentGroup?.members.map(memberId => {
                        const isSelected = selectedParticipants.includes(memberId);
                        const profile = userProfiles[memberId];
                        const name = profile?.nickname?.split('(')[0] || "알 수 없음";
                        const avatar = profile?.avatarUrl || `https://ui-avatars.com/api/?name=${name}&background=2A9D8F&color=fff`;

                        return (
                          <button
                            key={memberId}
                            type="button"
                            onClick={() => {
                             setSelectedParticipants(prev =>
                                prev.includes(memberId)
                                  ? prev.filter(id => id !== memberId)
                                  : [...prev, memberId]
                              );
                            }}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-xl border transition-all ${isSelected
                                ? "bg-primary/10 border-primary text-primary"
                                : "bg-bg-alt border-border-base text-text-sub"
                              }`}
                          >
                            <img src={avatar} alt={name} className={`w-5 h-5 rounded-full object-cover ${!isSelected && "grayscale opacity-50"}`} />
                            <span className="text-[12px] font-bold">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-text-sub">지출 내역</label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="무엇을 결제하셨나요?"
                      className="w-full bg-bg-alt border border-border-base p-3.5 rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-primary/30 text-text-main focus:outline-none transition-all placeholder:text-text-sub/50"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[13px] font-bold text-text-sub">결제 금액</label>
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
                        className="w-full bg-bg-alt border border-border-base p-3.5 pr-8 rounded-2xl text-[18px] font-black tracking-tight text-text-main focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all placeholder:text-text-sub/50"
                        required
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-text-sub">원</span>
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={selectedParticipants.length === 0}
                      className={`w-full flex items-center justify-center space-x-2 bg-text-main text-bg-base py-4 rounded-2xl text-[15px] font-black shadow-xl transition-all ${selectedParticipants.length === 0 ? "opacity-30 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
                        }`}
                    >
                      <span>지출 내역 등록하기</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Shared Modals */}
          <ConfirmModal 
            {...confirmConfig} 
            onClose={() => {
              if (confirmConfig.onClose) confirmConfig.onClose();
              setConfirmConfig((prev: any) => ({ ...prev, isOpen: false }));
            }} 
          />
          <AlertModal 
            {...alertConfig} 
            onClose={() => {
              if (alertConfig.onClose) alertConfig.onClose();
              setAlertConfig((prev: any) => ({ ...prev, isOpen: false }));
            }} 
          />
        </div>
      );
}
