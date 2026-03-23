"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  MoreVertical,
  Send,
  Image as ImageIcon,
  Wallet,
  X,
  Reply,
  Trash2,
  Edit2,
  Heart,
  MoreHorizontal
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { messageService } from "@/core/firebase/messageService";
import { userService } from "@/core/firebase/userService";
import { useSettlementStore } from "@/store/useSettlementStore";
import { Message } from "@/types/message";
import { UserProfile } from "@/types/user";
import { useAuth } from "@/core/hooks/useAuth";
import { DEFAULT_AVATAR } from "@/core/constants";

// Mock Messages Extended
export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params?.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const otherName = searchParams.get("name") || "채팅";
  const otherImage = searchParams.get("image") || "";
  const otherId = searchParams.get("userId") || "";

  const { user, isLoading: isAuthLoading } = useAuth();
  const currentUserId = user?.uid || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [otherProfile, setOtherProfile] = useState<UserProfile | null>(null);

  // Advanced Features State
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);

  // Settlement Form State
  const [settleTitle, setSettleTitle] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleBank, setSettleBank] = useState("");
  const [settleAccount, setSettleAccount] = useState("");

  const { addExpense, groups, addGroup } = useSettlementStore();
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time subscription to messages and other user profile
  useEffect(() => {
    if (!roomId || isAuthLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    // Subscribe to messages in this room
    const unsubscribe = messageService.subscribeToMessages(roomId, (newMessages) => {
      setMessages(newMessages);
      // Mark as read when new messages are received while in the room
      if (user?.uid) {
        messageService.markRoomAsRead(roomId, user.uid);
      }
    });

    // Mark as read immediately on entry
    if (user?.uid) {
      messageService.markRoomAsRead(roomId, user.uid);
    }

    // Fetch other user profile
    const fetchOtherProfile = async () => {
      if (otherId) {
        const profile = await userService.getUserProfile(otherId);
        setOtherProfile(profile);
      }
    };
    fetchOtherProfile();

    return () => unsubscribe();
  }, [roomId, user, isAuthLoading, otherId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !roomId || !user) return;

    try {
      if (editingMessage) {
        // Handle Edit
        await messageService.updateMessage(roomId, editingMessage.id, inputText.trim());
        setEditingMessage(null);
      } else {
        // Handle New Message or Reply
        const replyToData = replyingTo ? {
          id: replyingTo.id,
          text: replyingTo.text,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderId === currentUserId ? "나" : (otherProfile?.nickname || "상대방")
        } : undefined;

        await messageService.sendMessage(
          roomId,
          user.uid,
          inputText.trim(),
          "text",
          undefined,
          undefined,
          replyToData
        );
        setReplyingTo(null);
      }
      setInputText("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleLikeMessage = async (msg: Message) => {
    if (!roomId || !user) return;
    const isLiked = msg.likes?.includes(user.uid) || false;
    await messageService.toggleMessageLike(roomId, msg.id, user.uid, isLiked);
    setActiveMenuMessageId(null);
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!roomId) return;
    if (confirm("메시지를 삭제하시겠습니까?")) {
      await messageService.deleteMessage(roomId, msgId);
      setActiveMenuMessageId(null);
    }
  };

  const startEditMessage = (msg: Message) => {
    setEditingMessage(msg);
    setInputText(msg.text);
    setReplyingTo(null);
    setActiveMenuMessageId(null);
  };

  const startReplyMessage = (msg: Message) => {
    setReplyingTo(msg);
    setEditingMessage(null);
    setActiveMenuMessageId(null);
  };

  const handleSendSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleTitle || !settleAmount || !settleBank || !settleAccount) return;

    const totalNum = parseInt(settleAmount.replace(/[^0-9]/g, ''));
    if (isNaN(totalNum) || totalNum <= 0) return;

    const amountToPay = Math.round(totalNum / 2);

    // Use selected group or fall back to a default/temp ID if none selected
    const groupId = selectedGroupId || (showNewGroupInput && newGroupName)
      ? `g${Date.now()}` // Will be handled below if creating new
      : roomId;

    try {
      let finalGroupId = selectedGroupId;

      // 1. Create new group if requested
      if (showNewGroupInput && newGroupName.trim()) {
        const newGroup = {
          name: newGroupName,
          status: 'ongoing' as const,
          date: new Date().toLocaleDateString('ko-KR'),
          participants: [currentUserId, otherId]
        };
        const newId = `g${Date.now()}`;
        addGroup({ ...newGroup, id: newId } as any);
        finalGroupId = newId;
      }

      if (!finalGroupId) {
        alert("정산 그룹을 선택하거나 새로 만들어주세요.");
        return;
      }

      // 2. Send global expense to Zustand globally
      addExpense({
        groupId: finalGroupId,
        title: settleTitle,
        amount: totalNum,
        paidBy: currentUserId,
        participants: [currentUserId, otherId],
        category: "기타",
        date: new Date().toISOString()
      });

      // 2. Persist to Firebase Chat
      await messageService.sendMessage(
        roomId,
        currentUserId,
        "정산 요청이 도착했습니다.",
        "settlement",
        {
          title: settleTitle,
          amountToPay,
          bankAccount: `${settleBank} ${settleAccount}`
        }
      );

      setIsSettlementModalOpen(false);
      setSettleTitle("");
      setSettleAmount("");
      setSettleBank("");
      setSettleAccount("");
      setSelectedGroupId("");
      setShowNewGroupInput(false);
      setNewGroupName("");
    } catch (error) {
      console.error("Failed to send settlement:", error);
    }
  };

  const handleSettleMoney = async (messageId: string) => {
    if (!roomId) return;
    try {
      await messageService.markSettlementAsPaid(roomId, messageId);
    } catch (error) {
      console.error("Failed to settle money:", error);
    }
  };

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(val) + '원';
  };

  const formatMessageTime = (dateProp: any) => {
    if (!dateProp) return '';
    let d = dateProp.toDate ? dateProp.toDate() : new Date(dateProp);
    if (isNaN(d.getTime())) d = new Date();
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatMessageDate = (dateProp: any) => {
    if (!dateProp) return '';
    const d = dateProp.toDate ? dateProp.toDate() : new Date(dateProp);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  };

  if (!isHydrated) return null;

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] pb-safe">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-white/90 p-3 backdrop-blur-md border-b border-[#F1F3F5] shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="text-[#212529] hover:bg-slate-50 p-1.5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={() => otherId && router.push(`/profile/${otherId}`)}
            className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity text-left"
          >
            <img src={otherProfile?.avatarUrl || otherImage || DEFAULT_AVATAR} alt={otherProfile?.nickname || otherName} className="w-9 h-9 rounded-full object-cover border border-[#F1F3F5]" />
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-[#212529] leading-tight">{otherProfile?.nickname || otherName}</span>
              <span className="text-[11px] font-semibold text-[#2A9D8F]">현재 접속 중</span>
            </div>
          </button>
        </div>
        <button className="text-[#212529] hover:bg-slate-50 p-1.5 rounded-full transition-colors">
          <MoreVertical size={20} />
        </button>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUserId;

          // Date Grouping Logic
          const currentDate = formatMessageDate(msg.createdAt);
          const prevDate = idx > 0 ? formatMessageDate(messages[idx - 1].createdAt) : null;
          const showDateHeader = currentDate !== prevDate;

          return (
            <React.Fragment key={msg.id}>
              {showDateHeader && currentDate && (
                <div className="flex justify-center my-6 animate-in fade-in slide-in-from-top-1 duration-300">
                  <span className="bg-[#F8F9FA] px-4 py-1.5 rounded-full text-[11px] font-bold text-[#ADB5BD] border border-[#F1F3F5] shadow-sm">
                    {currentDate}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}>
                <div className={`flex items-end max-w-[75%] ${isMe ? "flex-row-reverse space-x-reverse" : "space-x-2"}`}>

                  {/* Avatar for other user */}
                  {!isMe && (
                    <button
                      onClick={() => otherId && router.push(`/profile/${otherId}`)}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      <img src={otherProfile?.avatarUrl || otherImage || DEFAULT_AVATAR} alt={otherProfile?.nickname || otherName} className="w-7 h-7 rounded-full object-cover border border-[#F1F3F5] mb-1" />
                    </button>
                  )}

                  {/* Bubble */}
                  <div className="flex flex-col space-y-1 relative">
                    {/* Reply To Reference */}
                    {msg.replyTo && (
                      <div className={`text-[12px] opacity-70 mb-1 px-3 py-1.5 rounded-xl border ${isMe ? "bg-white/10 border-white/20 text-white" : "bg-black/5 border-black/10 text-[#495057]"
                        } flex flex-col`}>
                        <span className="font-bold text-[10px] mb-0.5">{msg.replyTo.senderName}</span>
                        <span className="line-clamp-1">{msg.replyTo.text}</span>
                      </div>
                    )}

                    <div className={`px-4 py-2.5 rounded-2xl shadow-sm max-w-[260px] relative group ${isMe
                      ? "bg-[#2A9D8F] text-white rounded-br-sm"
                      : "bg-[#F8F9FA] text-[#212529] rounded-bl-sm border border-[#F1F3F5]"
                      } ${msg.isDeleted ? "opacity-60 italic" : ""}`}>

                      {/* Message Context Menu Trigger (Only for non-deleted) */}
                      {!msg.isDeleted && (
                        <button
                          onClick={() => setActiveMenuMessageId(activeMenuMessageId === msg.id ? null : msg.id)}
                          className={`absolute -top-2 ${isMe ? "-left-6" : "-right-6"} p-1 text-[#ADB5BD] opacity-0 group-hover:opacity-100 transition-opacity`}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      )}

                      {/* Context Menu Popover */}
                      {activeMenuMessageId === msg.id && (
                        <div className={`absolute z-10 top-0 ${isMe ? "right-full mr-2" : "left-full ml-2"} bg-white border border-[#F1F3F5] rounded-xl shadow-xl py-1 flex flex-col w-[80px] animate-in fade-in zoom-in-95 duration-100`}>
                          <button onClick={() => startReplyMessage(msg)} className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#F8F9FA] text-[12px] font-bold text-[#495057]">
                            <Reply size={12} /> <span>답글</span>
                          </button>
                          <button onClick={() => handleLikeMessage(msg)} className={`flex items-center space-x-2 px-3 py-1.5 hover:bg-[#F8F9FA] text-[12px] font-bold ${msg.likes?.includes(currentUserId) ? "text-[#E63946]" : "text-[#495057]"}`}>
                            <Heart size={12} fill={msg.likes?.includes(currentUserId) ? "#E63946" : "none"} /> <span>좋아요</span>
                          </button>
                          {isMe && !msg.isDeleted && (
                            <>
                              <button onClick={() => startEditMessage(msg)} className="flex items-center space-x-2 px-3 py-1.5 hover:bg-[#F8F9FA] text-[12px] font-bold text-[#495057]">
                                <Edit2 size={12} /> <span>수정</span>
                              </button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="flex items-center space-x-2 px-3 py-1.5 hover:bg-red-50 text-[12px] font-bold text-[#E63946]">
                                <Trash2 size={12} /> <span>삭제</span>
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {msg.type === "settlement" && msg.settlementData ? (
                        <div className="flex flex-col space-y-3 pt-1">
                          <div className="flex items-center space-x-2 text-white pb-3 border-b border-white/20">
                            <Wallet size={18} />
                            <span className="text-[14px] font-black">정산 요청</span>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[12px] font-medium text-white/80">{msg.settlementData.title}</p>
                            <p className="text-[20px] font-black tracking-tight">{formatMoney(msg.settlementData.amountToPay)}</p>
                          </div>
                          <div className="bg-white/10 p-2.5 rounded-xl border border-white/20 mt-2">
                            <p className="text-[10px] font-semibold text-white/70 mb-0.5">입금 계좌</p>
                            <p className="text-[12px] font-bold tracking-wide">{msg.settlementData.bankAccount}</p>
                          </div>
                          {/* Only show 'Send Money' if I am receiving the request. Since I am sending it, show 'Sent' */}
                          <button
                            onClick={() => !msg.settlementData?.isSettled && !isMe && handleSettleMoney(msg.id)}
                            className={`w-full mt-2 py-2.5 text-[13px] font-black rounded-xl shadow-sm transition-colors active:scale-95 ${msg.settlementData?.isSettled
                              ? "bg-white/20 text-white cursor-default"
                              : "bg-white text-[#2A9D8F] hover:bg-slate-50"
                              }`}
                          >
                            {msg.settlementData?.isSettled ? "송금 완료" : (isMe ? "요청 완료" : "송금하기")}
                          </button>
                        </div>
                      ) : msg.type === "storyReply" && msg.storyData ? (
                        <div className="flex flex-col space-y-2">
                          <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-black/5 bg-gray-100">
                            <img
                              src={msg.storyData.mediaUrl}
                              alt="Story Preview"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/20 to-transparent h-12"></div>
                          </div>
                          <p className="text-[14px] leading-relaxed font-medium">
                            {msg.text}
                          </p>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <p className="whitespace-pre-wrap leading-relaxed text-[14px]">
                            {msg.isDeleted ? "삭제된 메시지입니다." : msg.text}
                          </p>
                          {msg.isEdited && !msg.isDeleted && (
                            <span className={`text-[9px] mt-1 ${isMe ? "text-white/60" : "text-[#ADB5BD]"}`}>(수정됨)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Likes Indicator */}
                    {msg.likes && msg.likes.length > 0 && (
                      <div className={`absolute -bottom-2 ${isMe ? "left-0" : "right-0"} bg-white border border-[#F1F3F5] rounded-full px-1.5 py-0.5 flex items-center space-x-1 shadow-sm`}>
                        <Heart size={10} fill="#E63946" className="text-[#E63946]" />
                        <span className="text-[9px] font-black text-[#495057]">{msg.likes.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-[10px] font-semibold text-[#ADB5BD] px-1 mb-1 whitespace-nowrap">
                    {formatMessageTime(msg.createdAt)}
                  </span>


                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (with Reply/Edit Preview) */}
      <div className="bg-white border-t border-[#F1F3F5] p-3 pb-6 sm:pb-3">
        {/* Reply/Edit Overlay */}
        {(replyingTo || editingMessage) && (
          <div className="flex items-center justify-between bg-[#F1F3F5]/60 px-4 py-2 mb-2 rounded-xl border-l-4 border-[#2A9D8F] animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold text-[#2A9D8F]">
                {editingMessage ? "메시지 수정" : `${replyingTo?.senderId === currentUserId ? "나" : (otherProfile?.nickname || "상대방")}에게 답글 남기는 중`}
              </span>
              <p className="text-[12px] text-[#495057] line-clamp-1 italic">
                {editingMessage ? editingMessage.text : replyingTo?.text}
              </p>
            </div>
            <button
              onClick={() => {
                setReplyingTo(null);
                setEditingMessage(null);
                if (editingMessage) setInputText("");
              }}
              className="p-1 text-[#ADB5BD] hover:text-[#212529]"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center space-x-1 sm:space-x-2">
          <button type="button" className="p-2 sm:p-2.5 text-[#ADB5BD] hover:text-[#2A9D8F] bg-[#F8F9FA] rounded-full transition-colors">
            <ImageIcon size={22} />
          </button>
          <button
            type="button"
            onClick={() => setIsSettlementModalOpen(true)}
            className="p-2 sm:p-2.5 text-white bg-[#2A9D8F] hover:bg-[#21867a] shadow-md shadow-[#2A9D8F]/20 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 mr-1"
          >
            <Wallet size={20} className="mr-0.5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지 입력..."
              className="w-full bg-[#F8F9FA] border border-[#F1F3F5] rounded-full py-2.5 pl-4 pr-12 text-[14px] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/30 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-white bg-[#2A9D8F] rounded-full disabled:bg-[#DEE2E6] disabled:text-[#868E96] transition-colors"
            >
              <Send size={16} className="-rotate-12 ml-px" />
            </button>
          </div>
        </form>
      </div>

      {/* Settlement Modal Overlay */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:w-[400px] h-[85vh] sm:h-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col slide-in-from-bottom-full sm:slide-in-from-bottom-0 overflow-hidden">

            <div className="flex items-center justify-between p-5 border-b border-[#F1F3F5]">
              <h2 className="text-lg font-black text-[#212529] flex items-center">
                <Wallet size={20} className="mr-2 text-[#2A9D8F]" />
                정산 요청하기
              </h2>
              <button onClick={() => setIsSettlementModalOpen(false)} className="p-1.5 text-[#ADB5BD] hover:bg-slate-50 rounded-full">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSendSettlement} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Group Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-[#495057]">정산 그룹 선택</label>
                  <Link href="/settlement" className="text-[11px] font-bold text-[#2A9D8F] hover:underline flex items-center">
                    대시보드 가기 <ChevronLeft size={12} className="rotate-180 ml-0.5" />
                  </Link>
                </div>

                {!showNewGroupInput ? (
                  <div className="space-y-2">
                    <select
                      value={selectedGroupId}
                      onChange={(e) => {
                        if (e.target.value === "new") {
                          setShowNewGroupInput(true);
                          setSelectedGroupId("");
                        } else {
                          setSelectedGroupId(e.target.value);
                        }
                      }}
                      className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3.5 rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none transition-all appearance-none cursor-pointer"
                      required={!showNewGroupInput}
                    >
                      <option value="" disabled>기존 그룹에서 선택</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                      <option value="new" className="text-[#2A9D8F] font-bold">+ 새 정산 그룹 만들기</option>
                    </select>
                    <p className="text-[11px] text-[#868E96] pl-2 font-medium">* 이 정산 내역이 기록될 그룹을 선택하세요.</p>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="새 그룹 이름 (예: 제주도 여행)"
                        className="flex-1 bg-[#F8F9FA] border border-[#2A9D8F]/30 p-3.5 rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none transition-all"
                        required={showNewGroupInput}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewGroupInput(false);
                          setNewGroupName("");
                        }}
                        className="p-3.5 text-[#ADB5BD] hover:bg-slate-50 rounded-2xl transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-[#F1F3F5] w-full"></div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#495057]">결제 내역</label>
                <input
                  type="text"
                  value={settleTitle}
                  onChange={(e) => setSettleTitle(e.target.value)}
                  placeholder="예: 흑돼지 삼겹살"
                  className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3.5 rounded-2xl text-[14px] font-medium focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none transition-all placeholder:text-[#ADB5BD]"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-[#495057]">총 결제 금액</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={settleAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '');
                      setSettleAmount(val ? parseInt(val).toLocaleString('ko-KR') : '');
                    }}
                    placeholder="0"
                    className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3.5 pr-8 rounded-2xl text-[18px] font-black tracking-tight focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none transition-all placeholder:text-[#ADB5BD]"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-[#495057]">원</span>
                </div>
                {settleAmount && (
                  <p className="text-[12px] font-bold text-[#2A9D8F] text-right mt-1.5 animate-in slide-in-from-top-1">
                    인당 청구 금액: {formatMoney(Math.round(parseInt(settleAmount.replace(/[^0-9]/g, '')) / 2))}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-dashed border-[#DEE2E6]">
                <h3 className="text-[14px] font-bold text-[#212529] mb-4">입금 받을 계좌 정보</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-2">
                    <label className="text-[11px] font-semibold text-[#868E96]">은행</label>
                    <input
                      type="text"
                      value={settleBank}
                      onChange={(e) => setSettleBank(e.target.value)}
                      placeholder="신한은행"
                      className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none"
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[11px] font-semibold text-[#868E96]">계좌번호</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={settleAccount}
                      onChange={(e) => setSettleAccount(e.target.value.replace(/[^0-9-]/g, ''))}
                      placeholder="- 없이 입력"
                      className="w-full bg-[#F8F9FA] border border-[#F1F3F5] p-3 rounded-xl text-[13px] font-medium focus:ring-2 focus:ring-[#2A9D8F]/30 focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 pb-4 sm:pb-0">
                <button
                  type="submit"
                  className="w-full flex items-center justify-center space-x-2 bg-[#212529] text-white py-4 rounded-2xl text-[15px] font-black shadow-xl hover:bg-[#343a40] active:scale-95 transition-all"
                >
                  <Send size={18} className="-rotate-12" />
                  <span>정산 요청 보내기</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
