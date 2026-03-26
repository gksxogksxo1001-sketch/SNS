"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Edit, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { messageService } from "@/core/firebase/messageService";
import { ChatRoom } from "@/types/message";
import { useAuth } from "@/core/hooks/useAuth";
import { userService } from "@/core/firebase/userService";
import { UserProfile } from "@/types/user";
import { cn } from "@/lib/utils";
import { groupService } from "@/core/firebase/groupService";
import { Group } from "@/types/group";
import { DEFAULT_AVATAR } from "@/core/constants";
import { useModalStore } from "@/store/useModalStore";
import Image from "next/image";

function SwipeableMessageItem({ 
  item, 
  title, 
  image, 
  chatUrl, 
  lastMsg, 
  lastTime, 
  activeTab,
  onDelete 
}: any) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const startX = React.useRef(0);
  const currentX = React.useRef(0);
  const SWIPE_THRESHOLD = -80;
  const isDraggingClick = React.useRef(false);

  const handleStart = (clientX: number) => {
    startX.current = clientX;
    setIsSwiping(true);
  };

  const handleMove = (clientX: number) => {
    if (!isSwiping) return;
    let diff = clientX - startX.current;
    if (isOpen) {
      diff += SWIPE_THRESHOLD;
    }
    if (diff < 0) {
      const newX = Math.max(diff, SWIPE_THRESHOLD * 1.5);
      setTranslateX(newX);
      currentX.current = newX;
    } else {
      setTranslateX(0);
      currentX.current = 0;
    }
  };

  const handleEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    
    if (Math.abs(currentX.current - (isOpen ? SWIPE_THRESHOLD : 0)) > 10) {
      isDraggingClick.current = true;
      setTimeout(() => { isDraggingClick.current = false; }, 50);
    }

    if (currentX.current <= SWIPE_THRESHOLD / 2) {
      setTranslateX(SWIPE_THRESHOLD);
      currentX.current = SWIPE_THRESHOLD;
      setIsOpen(true);
    } else {
      setTranslateX(0);
      currentX.current = 0;
      setIsOpen(false);
    }
  };

  return (
    <div className="relative w-full overflow-hidden bg-error border-b border-border-base">
      <div 
        className="absolute inset-y-0 right-0 w-24 flex items-center justify-end pr-6 text-white cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item);
          setTranslateX(0);
          setIsOpen(false);
        }}
      >
        <Trash2 size={24} />
      </div>

      <div 
        className={cn(
          "relative bg-bg-base transition-transform",
          !isSwiping && "duration-200"
        )}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onMouseDown={(e) => handleStart(e.clientX)}
        onMouseMove={(e) => isSwiping && handleMove(e.clientX)}
        onMouseUp={handleEnd}
        onMouseLeave={() => isSwiping && handleEnd()}
      >
        <Link 
          href={chatUrl}
          onClick={(e) => {
            if (isOpen || isDraggingClick.current) {
              e.preventDefault();
              setTranslateX(0);
              setIsOpen(false);
            }
          }}
          className="flex items-center justify-between px-4 py-3 hover:bg-bg-alt transition-colors active:bg-bg-base"
        >
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className={cn(
                "relative w-14 h-14 overflow-hidden border border-border-base shadow-sm",
                activeTab === "group" ? "rounded-2xl" : "rounded-full"
              )}>
                <Image 
                  src={image} 
                  alt={title} 
                  fill
                  sizes="56px"
                  className="w-full h-full object-cover" 
                  draggable={false}
                />
              </div>
            </div>
            
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-text-main">{title}</span>
              <span className="text-[13px] mt-0.5 truncate max-w-[180px] text-text-sub">
                {lastMsg}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-1">
            <span className="text-[11px] font-semibold text-text-sub">
              {lastTime}
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [travelGroups, setTravelGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<"direct" | "group">("direct");
  const { showAlert, showConfirm } = useModalStore();
  
  const currentUserId = user?.uid || "";

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      // 1. Subscribe to rooms
      const unsubscribeRooms = messageService.subscribeToUserRooms(user.uid, (newRooms) => {
        setRooms(prev => {
          const roomMap = new Map();
          // Initialize with newRooms to prioritize them
          newRooms.forEach(r => roomMap.set(r.id, r));
          return Array.from(roomMap.values());
        });
        
        const otherUids = newRooms.map(room => 
          room.participants.find(p => p !== user.uid)
        ).filter(Boolean) as string[];
        
        if (otherUids.length > 0) {
          fetchProfiles(otherUids);
        }
      });

      // 2. Fetch travel groups
      groupService.getUserGroups(user.uid).then(async (groups) => {
        setTravelGroups(groups);
        for (const group of groups) {
          const room = await messageService.getRoom(group.id);
          if (room) {
            setRooms(prev => {
              if (prev.find(r => r.id === room.id)) return prev;
              return [...prev, room];
            });
          }
        }
      });

      return () => unsubscribeRooms();
    }
  }, [user, isAuthLoading]);

  const fetchProfiles = async (uids: string[]) => {
    const profiles: Record<string, UserProfile> = { ...userProfiles };
    await Promise.all(uids.map(async (uid) => {
      if (!profiles[uid]) {
        const profile = await userService.getUserProfile(uid);
        if (profile) profiles[uid] = profile;
      }
    }));
    setUserProfiles(profiles);
  };

  const filteredUsers = Object.values(userProfiles).filter(p => 
    p.nickname.toLowerCase().includes(searchQuery.toLowerCase()) && p.uid !== currentUserId
  );

  const startChat = async (userId: string, name: string, image: string) => {
    try {
      const roomId = await messageService.createOrGetRoom(currentUserId, userId);
      router.push(`/messages/${roomId}?userId=${userId}&name=${encodeURIComponent(name)}&image=${encodeURIComponent(image)}`);
    } catch (error) {
      console.error("Failed to start chat:", error);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    try {
      await messageService.deleteRoom(roomId);
      setRooms(prev => prev.filter(r => r.id !== roomId));
    } catch (error) {
      console.error("Failed to delete room:", error);
      showAlert({ title: "오류", message: "삭제 중 오류가 발생했습니다.", type: "error" });
    }
  };

  const formatRoomTime = (dateProp: any) => {
    if (!dateProp) return '';
    let d = dateProp.toDate ? dateProp.toDate() : new Date(dateProp);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-alt">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-bg-base/80 p-4 backdrop-blur-md border-b border-border-base">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="text-text-main hover:bg-bg-alt p-1.5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-text-main tracking-tight">메시지</h1>
        </div>
        <button className="text-text-main hover:bg-bg-alt p-1.5 rounded-full transition-colors">
          <Edit size={22} className="text-primary" />
        </button>
      </header>

      {/* Search Bar */}
      <div className="p-4">
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-text-sub" />
          </div>
          <input
            id="message-search"
            name="message-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearching(e.target.value.length > 0);
            }}
            placeholder="사람 검색..."
            className="w-full bg-bg-base border-none rounded-xl py-2.5 pl-10 pr-4 text-[14px] text-text-main placeholder:text-text-sub focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
          />
        </form>
      </div>

      {/* Tabs */}
      <div className="flex px-4 border-b border-border-base bg-bg-base">
        <button
          onClick={() => setActiveTab("direct")}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition-all relative",
            activeTab === "direct" ? "text-primary" : "text-text-sub hover:text-text-main"
          )}
        >
          일반
          {activeTab === "direct" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1" />}
        </button>
        <button
          onClick={() => setActiveTab("group")}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition-all relative",
            activeTab === "group" ? "text-primary" : "text-text-sub hover:text-text-main"
          )}
        >
          그룹
          {activeTab === "group" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary animate-in fade-in slide-in-from-bottom-1" />}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="px-4 py-2">
            <h2 className="text-[12px] font-black text-text-sub uppercase tracking-wider mb-2">검색 결과</h2>
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-text-sub/50 py-4">검색 결과가 없습니다.</p>
            ) : (
              filteredUsers.map(profile => (
                <button 
                  key={profile.uid} 
                  onClick={() => startChat(profile.uid, profile.nickname, profile.avatarUrl || "")}
                  className="w-full flex items-center space-x-4 py-3 border-b border-border-base hover:bg-bg-alt transition-colors px-4"
                >
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-border-base">
                    <Image 
                      src={profile.avatarUrl || DEFAULT_AVATAR} 
                      alt={profile.nickname} 
                      fill
                      sizes="48px"
                      className="object-cover" 
                    />
                  </div>
                  <span className="text-[15px] font-bold text-text-main">{profile.nickname}</span>
                </button>
              ))
            )}
          </div>
        ) : (activeTab === "direct" 
             ? rooms.filter(r => r.type === "direct" || (!r.type && !travelGroups.some(g => g.id === r.id))) 
             : travelGroups
            ).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-text-sub space-y-2">
            <div className="w-16 h-16 bg-bg-base rounded-full flex items-center justify-center">
              <Search size={24} className="opacity-20" />
            </div>
            <span className="text-sm font-semibold">
              {activeTab === "direct" ? "진행 중인 일반 대화가 없습니다." : "참여 중인 여행 그룹이 없습니다."}
            </span>
          </div>
        ) : (
          (activeTab === "direct" 
            ? rooms.filter(r => r.type === "direct" || (!r.type && !travelGroups.some(g => g.id === r.id)))
            : travelGroups
          ).map((item: any) => {
            let title = "";
            let image = "";
            let chatUrl = "";
            let lastMsg = "최근 메시지가 없습니다.";
            let lastTime = "";

            if (activeTab === "group") {
              const group = item as Group;
              const room = rooms.find(r => r.id === group.id);
              title = room?.name || group.name;
              image = room?.groupImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=E9C46A&color=fff`;
              chatUrl = `/messages/${group.id}?name=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}&type=group`;
              if (room?.lastMessage) {
                lastMsg = room.lastMessage.text;
                lastTime = formatRoomTime(room.lastMessage.createdAt);
              } else {
                lastTime = formatRoomTime(group.updatedAt);
              }
            } else {
              const room = item as ChatRoom;
              const otherUserId = room.participants?.find(p => p !== currentUserId) || "Unknown User";
              const profile = userProfiles[otherUserId];
              title = profile?.nickname || otherUserId;
              image = profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=2A9D8F&color=fff`;
              chatUrl = `/messages/${room.id}?userId=${encodeURIComponent(otherUserId)}&name=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}&type=direct`;
              if (room.lastMessage) {
                lastMsg = room.lastMessage.text;
                lastTime = formatRoomTime(room.lastMessage.createdAt);
              } else {
                lastTime = formatRoomTime(room.updatedAt);
              }
            }

            return (
              <SwipeableMessageItem
                key={item.id}
                item={item}
                title={title}
                image={image}
                chatUrl={chatUrl}
                lastMsg={lastMsg}
                lastTime={lastTime}
                activeTab={activeTab}
                onDelete={(room: any) => showConfirm({
                  title: "대화 삭제",
                  message: "정말 이 대화방을 삭제하시겠습니까? 관련 메시지가 모두 삭제됩니다.",
                  confirmText: "삭제하기",
                  isDanger: true,
                  onConfirm: () => handleDeleteRoom(room.id)
                })}
              />
            );
          })
        )}
      </div>

    </div>
  );
}

