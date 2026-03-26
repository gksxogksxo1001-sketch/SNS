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
  MoreHorizontal,
  Camera,
  Check,
  LogOut,
  Settings,
  MessageCircle
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { messageService } from "@/core/firebase/messageService";
import { notificationService } from "@/core/firebase/notificationService";
import { settlementService } from "@/core/firebase/settlementService";
import { userService } from "@/core/firebase/userService";
import { groupService } from "@/core/firebase/groupService";
import { postService } from "@/core/firebase/postService";
import { useSettlementStore } from "@/store/useSettlementStore";
import { Message, ChatRoom } from "@/types/message";
import { UserProfile } from "@/types/user";
import { Group } from "@/types/group";
import { useAuth } from "@/core/hooks/useAuth";
import { DEFAULT_AVATAR } from "@/core/constants";
import { cn } from "@/lib/utils";
import { ConfirmModal, AlertModal } from "@/components/common/UIModals";

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
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [roomData, setRoomData] = useState<ChatRoom | null>(null);
  const [groupData, setGroupData] = useState<any | null>(null);
  const [allUserGroups, setAllUserGroups] = useState<Group[]>([]);
  const [isGroupProfileModalOpen, setIsGroupProfileModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [isUpdatingRoom, setIsUpdatingRoom] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedNewOwner, setSelectedNewOwner] = useState<string>("");
  const [confirmConfig, setConfirmConfig] = useState<any>({ isOpen: false });
  const [alertConfig, setAlertConfig] = useState<any>({ isOpen: false });

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
      } else {
        // Group chat - fetch room data
        const room = await messageService.getRoom(roomId);
        if (room) {
          setRoomData(room);
          setNewRoomName(room.name || "");
        }
        
        // Also fetch travel group data for precise member count
        const group = await groupService.getGroup(roomId);
        if (group) {
          setGroupData(group);
          // Fetch profiles for all group members for the transfer modal
          if (group.members && group.members.length > 0) {
            const memberProfiles: Record<string, UserProfile> = {};
            await Promise.all(
              group.members.map(async (uid: string) => {
                const p = await userService.getUserProfile(uid);
                if (p) memberProfiles[uid] = p;
              })
            );
            setProfiles(prev => ({ ...prev, ...memberProfiles }));
          }
        }
      }

      // Fetch all user groups for settlement selection
      if (user?.uid) {
        const groups = await groupService.getUserGroups(user.uid);
        // Filter for ongoing groups only
        setAllUserGroups(groups.filter(g => g.status !== "completed"));
      }
    };
    fetchOtherProfile();

    return () => unsubscribe();
  }, [roomId, user, isAuthLoading, otherId]);

  useEffect(() => {
    const fetchMissingProfiles = async () => {
      const missingIds = new Set<string>();
      messages.forEach(m => {
        if (!profiles[m.senderId] && m.senderId !== currentUserId) {
          missingIds.add(m.senderId);
        }
      });
      if (missingIds.size > 0) {
        const newProfiles = { ...profiles };
        await Promise.all(
          Array.from(missingIds).map(async (uid) => {
            const p = await userService.getUserProfile(uid);
            // Must assign a fallback to prevent infinite loop on missing profiles (ghost users)
            newProfiles[uid] = p || { uid, nickname: "알 수 없는 사용자", avatarUrl: "" } as any;
          })
        );
        setProfiles(newProfiles);
      }
    };
    if (messages.length > 0) {
      fetchMissingProfiles();
    }
  }, [messages, currentUserId, profiles]);

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

      // 2. Persist to Firebase Expenses Collection (Shared)
      await settlementService.addExpense({
        groupId: finalGroupId,
        title: settleTitle,
        amount: totalNum,
        paidBy: currentUserId,
        participants: [currentUserId, ... (otherId ? [otherId] : [])],
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
    if (!roomId || !user) return;
    try {
      // Find the message to get senderId (the person who requested the settlement)
      const msg = messages.find(m => m.id === messageId);
      if (!msg || !msg.settlementData) return;

      await messageService.markSettlementAsPaid(roomId, messageId);

      // Send notification to the requester (sender of the message)
      await notificationService.sendSettlementPaymentNotification(
        msg.senderId,
        { uid: user.uid, nickname: user.displayName || "관리자", avatarUrl: user.photoURL },
        msg.settlementData.title.split(' 정산')[0], // Extract group name if it was "Group 정산"
        roomId, // roomId is often the groupId or related
        msg.settlementData.amountToPay
      );

      alert("정산 완료됐습니다.");
    } catch (error) {
      console.error("Failed to settle money:", error);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateGroupProfile = async (file?: File) => {
    if (!roomId || !user) return;
    setIsUpdatingRoom(true);
    try {
      let imageUrl = roomData?.groupImage;
      if (file) {
        const urls = await postService.uploadImages([file], user.uid);
        imageUrl = urls[0];
      }

      const updateData: { name?: string; groupImage?: string } = {};
      if (newRoomName.trim()) updateData.name = newRoomName.trim();
      if (imageUrl !== undefined) updateData.groupImage = imageUrl || "";

      if (Object.keys(updateData).length === 0) {
        setIsGroupProfileModalOpen(false);
        return;
      }

      await messageService.updateRoomProfile(roomId, updateData);
      
      // Also update the travel group if it exists ( roomId === groupId )
      try {
        await groupService.updateGroup(roomId, {
          name: updateData.name || roomData?.name,
        });
      } catch (e) {
        // Might fail if it's just a chat room not a travel group
      }

      setRoomData(prev => prev ? { ...prev, ...updateData } : null);
      setIsGroupProfileModalOpen(false);
      setAlertConfig({ isOpen: true, title: "성공", message: "그룹 정보가 수정되었습니다.", type: "success" });
    } catch (error) {
      console.error("Failed to update group profile:", error);
      setAlertConfig({ isOpen: true, title: "오류", message: "수정 중 오류가 발생했습니다.", type: "error" });
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  const executeDeleteGroup = async () => {
    if (!roomId) return;
    try {
      await groupService.deleteGroup(roomId);
      setAlertConfig({ 
        isOpen: true, title: "성공", message: "정산 그룹이 삭제되었습니다.", type: "success", 
        onClose: () => { window.location.href = "/messages"; } 
      });
    } catch (e) {
      console.error("Delete failed:", e);
      setAlertConfig({ isOpen: true, title: "오류", message: "삭제 중 오류가 발생했습니다.", type: "error" });
    }
  };

  const handleDeleteGroup = () => {
    setConfirmConfig({
      isOpen: true,
      title: "그룹 삭제하기",
      message: "정말 이 정산 그룹을 삭제하시겠습니까?\n채팅방과 정산 내역이 모두 완전히 삭제됩니다.",
      isDanger: true,
      confirmText: "삭제하기",
      onClose: () => setConfirmConfig({ isOpen: false }),
      onConfirm: executeDeleteGroup
    });
  };

  const handleLeaveGroup = async () => {
    if (!roomId || !currentUserId || !groupData) return;
    
    // Check if user is the admin
    if (groupData.ownerId === currentUserId) {
      if (groupData.members?.length > 1) {
        setAlertConfig({ isOpen: true, title: "안내", message: "이 그룹의 관리자이시군요!\n그룹을 나가려면 먼저 다른 멤버에게 관리자 권한을 위임해야 합니다.", type: "info" });
        setIsMenuOpen(false);
        setIsTransferModalOpen(true);
        return;
      } else {
        // Only member left is admin
        setConfirmConfig({
          isOpen: true,
          title: "그룹 파기",
          message: "혼자 남은 그룹입니다.\n나가시면 해당 그룹은 완전히 삭제됩니다.\n그래도 진행하시겠습니까?",
          isDanger: true,
          confirmText: "삭제 후 나가기",
          onClose: () => setConfirmConfig({ isOpen: false }),
          onConfirm: executeDeleteGroup
        });
        return;
      }
    }

    setConfirmConfig({
      isOpen: true,
      title: "그룹 나가기",
      message: "정말 이 정산 그룹에서 나가시겠습니까?\n향후 여기의 정산 내역 및 알림을 받을 수 없습니다.",
      isDanger: true,
      confirmText: "나가기",
      onClose: () => setConfirmConfig({ isOpen: false }),
      onConfirm: async () => {
        try {
          await groupService.leaveGroup(roomId, currentUserId);
          setAlertConfig({ 
            isOpen: true, title: "성공", message: "정상적으로 그룹에서 나갔습니다.", type: "success",
            onClose: () => router.push("/messages")
          });
        } catch (e) {
          console.error(e);
          setAlertConfig({ isOpen: true, title: "오류", message: "요청 처리 중 오류가 발생했습니다.", type: "error" });
        }
      }
    });
  };

  const handleTransferOwner = async () => {
    if (!roomId || !selectedNewOwner || !groupData || !currentUserId) return;
    try {
      await groupService.transferGroupOwner(roomId, selectedNewOwner);
      // Immediately leave group after transfer
      await groupService.leaveGroup(roomId, currentUserId);
      setAlertConfig({ 
        isOpen: true, title: "성공", message: "관리자 권한을 성공적으로 위임하고 그룹에서 나갔습니다.", type: "success",
        onClose: () => router.push("/messages")
      });
    } catch (e) {
      console.error(e);
      setAlertConfig({ isOpen: true, title: "오류", message: "권한 위임 및 나가기 중 오류가 발생했습니다.", type: "error" });
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
    <>
      <div className="flex flex-col h-screen bg-bg-alt pb-safe" onClick={() => { if(isMenuOpen) setIsMenuOpen(false) }}>
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-bg-base/90 p-3 backdrop-blur-md border-b border-border-base shadow-sm">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="text-text-main hover:bg-bg-alt p-1.5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          
          {otherId ? (
            <button
              onClick={() => router.push(`/profile/${otherId}`)}
              className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity text-left"
            >
              <img src={otherProfile?.avatarUrl || otherImage || DEFAULT_AVATAR} alt={otherProfile?.nickname || otherName} className="w-9 h-9 rounded-full object-cover border border-border-base" />
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-text-main leading-tight">{otherProfile?.nickname || otherName}</span>
                <span className="text-[11px] font-semibold text-primary">현재 접속 중</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setIsGroupProfileModalOpen(true)}
              className="flex items-center space-x-2.5 hover:opacity-80 transition-opacity text-left"
            >
              <div className="relative">
                <img src={roomData?.groupImage || DEFAULT_AVATAR} alt={roomData?.name} className="w-9 h-9 rounded-full object-cover border border-border-base" />
                <div className="absolute -bottom-1 -right-1 bg-bg-base p-0.5 rounded-full border border-border-base">
                  <Camera size={10} className="text-text-sub" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[15px] font-bold text-text-main leading-tight">{roomData?.name || otherName}</span>
                <span className="text-[11px] font-semibold text-text-sub">
                  멤버 {groupData?.members?.length || roomData?.participants?.length || 0}명
                </span>
              </div>
            </button>
          )}
        </div>
        <div className="relative">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen)
            }}
            className={`p-1.5 rounded-full transition-colors ${isMenuOpen ? "bg-bg-alt text-primary" : "text-text-main hover:bg-bg-alt"}`}
          >
            <Settings size={20} />
          </button>
          
          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-bg-base rounded-2xl shadow-xl shadow-black/5 border border-border-base overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="py-2">
                {!otherId && groupData && (
                  <>
                    {groupData.ownerId === currentUserId ? (
                      <>
                        {(groupData.members?.length || 0) > 1 && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsMenuOpen(false);
                              handleLeaveGroup();
                            }}
                            className="w-full text-left px-4 py-3 text-[13px] font-bold text-text-sub hover:bg-bg-alt flex items-center transition-colors"
                          >
                            <LogOut size={16} className="mr-2.5" />
                            그룹 나가기
                          </button>
                        )}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsMenuOpen(false);
                            handleDeleteGroup();
                          }}
                          className="w-full text-left px-4 py-3 text-[13px] font-bold text-error hover:bg-error/10 flex items-center transition-colors border-t border-border-base"
                        >
                          <Trash2 size={16} className="mr-2.5" />
                          그룹 삭제하기
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          handleLeaveGroup();
                        }}
                        className="w-full text-left px-4 py-3 text-[13px] font-bold text-error hover:bg-error/10 flex items-center transition-colors"
                      >
                        <LogOut size={16} className="mr-2.5" />
                        그룹 나가기
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-alt">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-90 mt-20 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-bg-base rounded-3xl rotate-12 flex items-center justify-center shadow-lg shadow-black/5 mb-3 text-text-sub">
              <MessageCircle size={36} className="-rotate-12" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-black text-text-sub tracking-tight">
              아직 메시지가 없습니다.<br/>
              <span className="text-[13px] font-medium text-text-sub/50">따뜻한 첫 인사를 건네며 대화를 시작해보세요! 👋</span>
            </p>
          </div>
        )}
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
                  <span className="bg-bg-alt px-4 py-1.5 rounded-full text-[11px] font-bold text-text-sub border border-border-base shadow-sm">
                    {currentDate}
                  </span>
                </div>
              )}
              <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-4`}>
                <div className={`flex items-end max-w-[75%] ${isMe ? "flex-row-reverse space-x-reverse" : "space-x-2"}`}>

                  {/* Avatar for other user */}
                  {!isMe && (
                    <button
                      onClick={() => router.push(`/profile/${msg.senderId}`)}
                      className="flex-shrink-0 hover:opacity-80 transition-opacity flex items-end"
                    >
                      <img 
                        src={profiles[msg.senderId]?.avatarUrl || (otherId ? otherImage : DEFAULT_AVATAR)} 
                        alt={profiles[msg.senderId]?.nickname || otherName} 
                        className="w-7 h-7 rounded-full object-cover border border-border-base mb-1" 
                      />
                    </button>
                  )}

                  {/* Bubble & Sender Name Container */}
                  <div className="flex flex-col space-y-1 relative">
                    {!isMe && !otherId && (
                       <span className="text-[10px] font-bold text-text-sub ml-1">{profiles[msg.senderId]?.nickname || "멤버"}</span>
                    )}

                    {/* Reply To Reference */}
                    {msg.replyTo && (
                      <div className={`text-[12px] opacity-70 mb-1 px-3 py-1.5 rounded-xl border ${isMe ? "bg-white/10 border-white/20 text-white" : "bg-bg-alt border-border-base text-text-sub"
                        } flex flex-col`}>
                        <span className="font-bold text-[10px] mb-0.5">{msg.replyTo.senderName}</span>
                        <span className="line-clamp-1">{msg.replyTo.text}</span>
                      </div>
                    )}

                    <div className={`px-4 py-2.5 rounded-2xl max-w-[260px] relative group ${isMe
                      ? "bg-primary text-white rounded-br-[4px] shadow-[0_2px_12px_rgba(42,157,143,0.2)]"
                      : "bg-bg-base text-text-main rounded-bl-[4px] shadow-sm border border-border-base/50"
                      } ${msg.isDeleted ? "opacity-60 italic" : ""}`}>

                      {/* Message Context Menu Trigger (Only for non-deleted) */}
                      {!msg.isDeleted && (
                        <button
                          onClick={() => setActiveMenuMessageId(activeMenuMessageId === msg.id ? null : msg.id)}
                          className={`absolute -top-2 ${isMe ? "-left-6" : "-right-6"} p-1 text-text-sub opacity-0 group-hover:opacity-100 transition-opacity`}
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      )}

                      {/* Context Menu Popover */}
                      {activeMenuMessageId === msg.id && (
                        <div className={`absolute z-10 top-0 ${isMe ? "right-full mr-2" : "left-full ml-2"} bg-bg-base border border-border-base rounded-xl shadow-xl py-1 flex flex-col min-w-[94px] animate-in fade-in zoom-in-95 duration-100`}>
                          <button onClick={() => startReplyMessage(msg)} className="flex items-center space-x-2 px-3 py-1.5 hover:bg-bg-alt text-[12px] font-bold text-text-sub whitespace-nowrap text-left">
                            <Reply size={12} /> <span>답글</span>
                          </button>
                          <button onClick={() => handleLikeMessage(msg)} className={`flex items-center space-x-2 px-3 py-1.5 text-left hover:bg-bg-alt text-[12px] font-bold whitespace-nowrap ${msg.likes?.includes(currentUserId) ? "text-error" : "text-text-sub"}`}>
                            <Heart size={12} fill={msg.likes?.includes(currentUserId) ? "currentColor" : "none"} /> <span>좋아요</span>
                          </button>
                          {isMe && !msg.isDeleted && (
                            <>
                              <button onClick={() => startEditMessage(msg)} className="flex items-center space-x-2 px-3 py-1.5 hover:bg-bg-alt text-[12px] font-bold text-text-sub whitespace-nowrap text-left">
                                <Edit2 size={12} /> <span>수정</span>
                              </button>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="flex items-center space-x-2 px-3 py-1.5 hover:bg-error/10 text-[12px] font-bold text-error whitespace-nowrap text-left">
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
                              : "bg-white text-primary hover:bg-bg-alt"
                              }`}
                          >
                            {msg.settlementData?.isSettled ? "송금 완료" : (isMe ? "요청 완료" : "송금하기")}
                          </button>
                        </div>
                      ) : msg.type === "storyReply" && msg.storyData ? (
                        <div className="flex flex-col space-y-2">
                          <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden border border-border-base bg-bg-alt">
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
                      ) : msg.type === "postShare" && msg.postShareData ? (
                          <div 
                           onClick={() => router.push(`/post/${msg.postShareData!.postId}`)}
                           className="flex flex-col space-y-2 cursor-pointer group/post min-w-[200px]"
                         >
                           <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-border-base bg-bg-alt">
                            <img 
                              src={msg.postShareData.postImage} 
                              alt="Shared Post" 
                              className="w-full h-full object-cover group-hover/post:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent h-12"></div>
                            <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
                              게시물 공유
                            </div>
                          </div>
                          <div className="px-1 py-1">
                            <p className={cn("text-[10px] font-black mb-0.5", isMe ? "text-white/80" : "text-primary")}>
                              {msg.postShareData.authorName}님의 게시물
                            </p>
                            <p className={cn("text-[13px] leading-tight font-bold line-clamp-2", isMe ? "text-white" : "text-text-main")}>
                              {msg.postShareData.postTitle}...
                            </p>
                            <div className={cn("mt-2 flex items-center text-[10px] font-bold", isMe ? "text-white/60" : "text-text-sub")}>
                              자세히 보기 <ChevronLeft size={10} className="rotate-180 ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : msg.type === "settlementSummary" && msg.settlementSummaryData ? (
                        <div className="flex flex-col space-y-3 min-w-[220px]">
                          <div className={`flex items-center space-x-2 pb-2 border-b ${isMe ? "border-white/20 text-white" : "border-border-base text-primary"}`}>
                            <Wallet size={16} />
                            <span className="text-[12px] font-black">정산 결과 요약</span>
                          </div>
                          <div className="space-y-1">
                            <p className={`text-[11px] font-bold ${isMe ? "text-white/80" : "text-text-sub"}`}>
                              {msg.settlementSummaryData.groupName}
                            </p>
                            <p className={`text-[20px] font-black tracking-tight ${isMe ? "text-white" : "text-text-main"}`}>
                              {formatMoney(msg.settlementSummaryData.totalAmount)}
                            </p>
                          </div>
                          <div className={`p-3 rounded-xl border text-[12px] leading-relaxed ${isMe ? "bg-white/10 border-white/20 text-white" : "bg-bg-alt border-border-base text-text-sub"}`}>
                            <p className="font-medium whitespace-pre-wrap">{msg.text}</p>
                          </div>

                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <p className="whitespace-pre-wrap leading-relaxed text-[14px]">
                            {msg.isDeleted ? "삭제된 메시지입니다." : msg.text}
                          </p>
                          {msg.isEdited && !msg.isDeleted && (
                            <span className={`text-[9px] mt-1 ${isMe ? "text-white/60" : "text-text-sub/50"}`}>(수정됨)</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Likes Indicator */}
                    {msg.likes && msg.likes.length > 0 && (
                      <div className={`absolute -bottom-2 ${isMe ? "left-0" : "right-0"} bg-bg-base border border-border-base rounded-full px-1.5 py-0.5 flex items-center space-x-1 shadow-sm`}>
                        <Heart size={10} fill="#E63946" className="text-[#E63946]" />
                        <span className="text-[9px] font-black text-text-sub">{msg.likes.length}</span>
                      </div>
                    )}
                  </div>

                  {/* Time */}
                  <span className="text-[10px] font-semibold text-text-sub px-1 mb-1 whitespace-nowrap">
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
      <div className="bg-bg-base border-t border-border-base p-3 pb-6 sm:pb-3 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-10 relative">
        {/* Reply/Edit Overlay */}
        {(replyingTo || editingMessage) && (
          <div className="flex items-center justify-between bg-bg-alt/60 px-4 py-2 mb-2 rounded-xl border-l-4 border-primary animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold text-primary">
                {editingMessage ? "메시지 수정" : `${replyingTo?.senderId === currentUserId ? "나" : (otherProfile?.nickname || "상대방")}에게 답글 남기는 중`}
              </span>
              <p className="text-[12px] text-text-sub line-clamp-1 italic">
                {editingMessage ? editingMessage.text : replyingTo?.text}
              </p>
            </div>
            <button
              onClick={() => {
                setReplyingTo(null);
                setEditingMessage(null);
                if (editingMessage) setInputText("");
              }}
              className="p-1 text-text-sub hover:text-text-main"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center space-x-1 sm:space-x-2">
          <button type="button" className="p-2 sm:p-2.5 text-text-sub hover:text-primary bg-bg-alt rounded-full transition-colors">
            <ImageIcon size={22} />
          </button>
          <button
            type="button"
            onClick={() => setIsSettlementModalOpen(true)}
            className="p-2 sm:p-2.5 text-white bg-primary hover:opacity-90 shadow-md shadow-primary/20 rounded-full transition-all active:scale-95 flex items-center justify-center shrink-0 mr-1"
          >
            <Wallet size={20} className="mr-0.5" />
          </button>

          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="메시지 입력..."
              className="w-full bg-bg-alt border border-border-base rounded-full py-2.5 pl-4 pr-12 text-[14px] text-text-main focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-medium"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-white bg-primary rounded-full disabled:bg-bg-alt disabled:text-text-sub transition-colors"
            >
              <Send size={16} className="-rotate-12 ml-px" />
            </button>
          </div>
        </form>
      </div>

      {/* Settlement Modal Overlay */}
      {isSettlementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full sm:w-[400px] h-[85vh] sm:h-auto bg-bg-base rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col slide-in-from-bottom-full sm:slide-in-from-bottom-0 overflow-hidden">

            <div className="flex items-center justify-between p-5 border-b border-border-base">
              <h2 className="text-lg font-black text-text-main flex items-center">
                <Wallet size={20} className="mr-2 text-primary" />
                정산 요청하기
              </h2>
              <button onClick={() => setIsSettlementModalOpen(false)} className="p-1.5 text-text-sub hover:bg-bg-alt rounded-full">
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSendSettlement} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Group Selection Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[13px] font-bold text-text-sub">정산 그룹 선택</label>
                  <Link href="/settlement" className="text-[11px] font-bold text-primary hover:underline flex items-center">
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
                      className="w-full bg-bg-alt border border-border-base p-3.5 rounded-2xl text-[14px] font-medium text-text-main focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all appearance-none cursor-pointer"
                      required={!showNewGroupInput}
                    >
                      <option value="" disabled>기존 그룹에서 선택</option>
                      {allUserGroups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                      <option value="new" className="text-primary font-bold">+ 새 정산 그룹 만들기</option>
                    </select>
                    <p className="text-[11px] text-text-sub pl-2 font-medium">* 이 정산 내역이 기록될 그룹을 선택하세요.</p>
                  </div>
                ) : (
                  <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="새 그룹 이름 (예: 제주도 여행)"
                        className="flex-1 bg-bg-alt border border-primary/30 p-3.5 rounded-2xl text-[14px] font-medium text-text-main focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all"
                        required={showNewGroupInput}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewGroupInput(false);
                          setNewGroupName("");
                        }}
                        className="p-3.5 text-text-sub hover:bg-bg-alt rounded-2xl transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-border-base w-full"></div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-text-sub">결제 내역</label>
                <input
                  type="text"
                  value={settleTitle}
                  onChange={(e) => setSettleTitle(e.target.value)}
                  placeholder="예: 흑돼지 삼겹살"
                  className="w-full bg-bg-alt border border-border-base p-3.5 rounded-2xl text-[14px] font-medium text-text-main focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all placeholder:text-text-sub"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-[13px] font-bold text-text-sub">총 결제 금액</label>
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
                    className="w-full bg-bg-alt border border-border-base p-3.5 pr-8 rounded-2xl text-[18px] font-black tracking-tight text-text-main focus:ring-2 focus:ring-primary/30 focus:outline-none transition-all placeholder:text-text-sub"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-bold text-text-sub">원</span>
                </div>
                {settleAmount && (
                  <p className="text-[12px] font-bold text-primary text-right mt-1.5 animate-in slide-in-from-top-1">
                    인당 청구 금액: {formatMoney(Math.round(parseInt(settleAmount.replace(/[^0-9]/g, '')) / 2))}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-dashed border-border-base">
                <h3 className="text-[14px] font-bold text-text-main mb-4">입금 받을 계좌 정보</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-1 space-y-2">
                    <label className="text-[11px] font-semibold text-text-sub">은행</label>
                    <input
                      type="text"
                      value={settleBank}
                      onChange={(e) => setSettleBank(e.target.value)}
                      placeholder="신한은행"
                      className="w-full bg-bg-alt border border-border-base p-3 rounded-xl text-[13px] font-medium text-text-main focus:ring-2 focus:ring-primary/30 focus:outline-none placeholder:text-text-sub"
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-[11px] font-semibold text-text-sub">계좌번호</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={settleAccount}
                      onChange={(e) => setSettleAccount(e.target.value.replace(/[^0-9-]/g, ''))}
                      placeholder="- 없이 입력"
                      className="w-full bg-bg-alt border border-border-base p-3 rounded-xl text-[13px] font-medium text-text-main focus:ring-2 focus:ring-primary/30 focus:outline-none placeholder:text-text-sub"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 pb-4 sm:pb-0">
                 <button
                   type="submit"
                   className="w-full flex items-center justify-center space-x-2 bg-text-main text-bg-base py-4 rounded-2xl text-[15px] font-black shadow-xl hover:opacity-90 active:scale-95 transition-all"
                 >
                   <Send size={18} className="-rotate-12" />
                   <span>정산 요청 보내기</span>
                 </button>
              </div>
            </form>

          </div>
        </div>
      )}
      {/* Group Profile Modal */}
      {isGroupProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in" onClick={() => setIsGroupProfileModalOpen(false)}>
          <div className="w-[90%] max-w-[400px] bg-bg-base rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-text-main">그룹 정보 수정</h3>
              <button onClick={() => setIsGroupProfileModalOpen(false)} className="text-text-sub hover:bg-bg-alt p-1 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById("room-image-input")?.click()}>
                <img src={roomData?.groupImage || DEFAULT_AVATAR} alt="group" className="w-24 h-24 rounded-full object-cover border-4 border-bg-alt shadow-md" />
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={24} className="text-white" />
                </div>
                <input 
                  id="room-image-input" 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUpdateGroupProfile(file);
                  }}
                />
              </div>
              <p className="text-[11px] font-bold text-text-sub mt-3">이미지 클릭하여 변경</p>
            </div>

            <div className="space-y-4 mb-8">
              <div>
                <label className="text-xs font-bold text-text-sub mb-1 block ml-1">그룹 이름</label>
                <input 
                  type="text" 
                  value={newRoomName} 
                  onChange={(e) => setNewRoomName(e.target.value)} 
                  className="w-full bg-bg-alt border-none rounded-2xl p-4 text-sm font-bold text-text-main focus:ring-2 focus:ring-primary/30 outline-none" 
                  placeholder="그룹 이름을 입력하세요"
                />
              </div>
            </div>

            <button 
              onClick={() => handleUpdateGroupProfile()}
              disabled={isUpdatingRoom}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              {isUpdatingRoom ? (
                <MoreHorizontal className="animate-pulse" />
              ) : (
                <>
                  <Check size={20} />
                  <span>수정 완료</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>

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

      {/* Manager Transfer Modal */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4">
          <div className="w-full max-w-sm bg-bg-base rounded-t-[32px] sm:rounded-[32px] shadow-2xl flex flex-col p-6 animate-in slide-in-from-bottom-[100%] sm:zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-black text-text-main">관리자 위임</h2>
              <button onClick={() => setIsTransferModalOpen(false)} className="text-text-sub hover:text-text-main">
                <X size={24} />
              </button>
            </div>
            <p className="text-[13px] text-text-sub mb-6">
              그룹을 나가기 위해 새로운 관리자를 지정해주세요.
            </p>
            <div className="space-y-3 max-h-[40vh] overflow-y-auto mb-6">
              {groupData?.members?.filter((m: string) => m !== currentUserId).map((uid: string) => {
                const isSelected = selectedNewOwner === uid;
                // ChatRoomPage uses `profiles` dictionary, but members might not be fully loaded there
                // We'll use a fallback text or whatever is available in profiles
                const profile = profiles[uid];
                return (
                  <button
                    key={uid}
                    onClick={() => setSelectedNewOwner(uid)}
                    className={`w-full flex items-center p-3 rounded-2xl border-2 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border-base hover:bg-bg-alt'
                    }`}
                  >
                    <img 
                      src={profile?.avatarUrl || `https://ui-avatars.com/api/?name=${profile?.nickname || uid}&background=F1F3F5&color=6C757D`} 
                      alt="Profile" 
                      className="w-10 h-10 rounded-full object-cover mr-3"
                    />
                    <span className={`font-bold text-[14px] ${isSelected ? 'text-primary' : 'text-text-main'}`}>
                      {profile?.nickname?.split('(')[0] || "알 수 없는 유저"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex space-x-3">
              <button 
                onClick={() => setIsTransferModalOpen(false)}
                className="flex-1 py-3.5 bg-bg-alt text-text-sub font-bold rounded-2xl"
              >
                취소
              </button>
              <button 
                onClick={handleTransferOwner}
                disabled={!selectedNewOwner}
                className="flex-1 py-3.5 bg-primary text-white font-bold rounded-2xl hover:opacity-90 disabled:bg-bg-alt disabled:text-text-sub"
              >
                위임 및 나가기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

