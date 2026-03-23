"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, Edit, Search } from "lucide-react";
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

export default function MessagesPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [travelGroups, setTravelGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<"direct" | "group">("direct");
  
  const currentUserId = user?.uid || "";

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
      return;
    }

    if (user) {
      const unsubscribe = messageService.subscribeToUserRooms(user.uid, (newRooms) => {
        setRooms(newRooms);
        
        // Fetch profiles for all participants
        const otherUids = newRooms.map(room => 
          room.participants.find(p => p !== user.uid)
        ).filter(Boolean) as string[];
        
        if (otherUids.length > 0) {
          fetchProfiles(otherUids);
        }
      });

      // Fetch travel groups
      groupService.getUserGroups(user.uid).then(groups => {
        setTravelGroups(groups);
      });

      return () => unsubscribe();
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

  // Format Helper
  const formatRoomTime = (dateProp: any) => {
    if (!dateProp) return '';
    let d = dateProp.toDate ? dateProp.toDate() : new Date(dateProp);
    if (isNaN(d.getTime())) return '';
    
    // Simplistic relative time for demo (just returning HH:MM or local string)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center justify-between bg-white/80 p-4 backdrop-blur-md border-b border-[#F1F3F5]">
        <div className="flex items-center space-x-3">
          <button onClick={() => router.back()} className="text-[#212529] hover:bg-slate-50 p-1.5 rounded-full transition-colors">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-[#212529] tracking-tight">메시지</h1>
        </div>
        <button 
          className="text-[#212529] hover:bg-slate-50 p-1.5 rounded-full transition-colors"
        >
          <Edit size={22} className="text-[#2A9D8F]" />
        </button>
      </header>

      {/* Search Bar */}
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-[#ADB5BD]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearching(e.target.value.length > 0);
            }}
            placeholder="사람 검색..."
            className="w-full bg-[#F8F9FA] border-none rounded-xl py-2.5 pl-10 pr-4 text-[14px] text-[#212529] placeholder:text-[#ADB5BD] focus:outline-none focus:ring-2 focus:ring-[#2A9D8F]/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 border-b border-[#F1F3F5]">
        <button
          onClick={() => setActiveTab("direct")}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition-all relative",
            activeTab === "direct" ? "text-[#2A9D8F]" : "text-[#ADB5BD] hover:text-[#868E96]"
          )}
        >
          일반
          {activeTab === "direct" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2A9D8F] animate-in fade-in slide-in-from-bottom-1" />}
        </button>
        <button
          onClick={() => setActiveTab("group")}
          className={cn(
            "flex-1 py-3 text-sm font-bold transition-all relative",
            activeTab === "group" ? "text-[#2A9D8F]" : "text-[#ADB5BD] hover:text-[#868E96]"
          )}
        >
          그룹
          {activeTab === "group" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2A9D8F] animate-in fade-in slide-in-from-bottom-1" />}
        </button>
      </div>

      {/* Chat List / Search Results */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="px-4 py-2">
            <h2 className="text-[12px] font-black text-[#ADB5BD] uppercase tracking-wider mb-2">검색 결과</h2>
            {filteredUsers.length === 0 ? (
              <p className="text-sm text-[#ADB5BD] py-4">검색 결과가 없습니다.</p>
            ) : (
              filteredUsers.map(profile => (
                <button 
                  key={profile.uid} 
                  onClick={() => startChat(profile.uid, profile.nickname, profile.avatarUrl || "")}
                  className="w-full flex items-center space-x-4 py-3 border-b border-[#F1F3F5] hover:bg-[#F8F9FA] transition-colors"
                >
                  <img src={profile.avatarUrl || ""} alt={profile.nickname} className="w-12 h-12 rounded-full border border-[#F1F3F5]" />
                  <span className="text-[15px] font-bold text-[#212529]">{profile.nickname}</span>
                </button>
              ))
            )}
          </div>
        ) : (activeTab === "direct" ? rooms.filter(r => r.type === "direct" || !r.type) : travelGroups).length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-[#ADB5BD] space-y-2">
            <div className="w-16 h-16 bg-[#F8F9FA] rounded-full flex items-center justify-center">
              <Search size={24} className="opacity-20" />
            </div>
            <span className="text-sm font-semibold">
              {activeTab === "direct" ? "진행 중인 일반 대화가 없습니다." : "참여 중인 여행 그룹이 없습니다."}
            </span>
          </div>
        ) : (
          (activeTab === "direct" 
            ? rooms.filter(r => r.type === "direct" || !r.type)
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
              title = group.name;
              image = `https://ui-avatars.com/api/?name=${encodeURIComponent(title)}&background=E9C46A&color=fff`;
              chatUrl = `/messages/${group.id}?name=${encodeURIComponent(title)}&image=${encodeURIComponent(image)}&type=group`;
              if (room?.lastMessage) {
                lastMsg = room.lastMessage.text;
                lastTime = formatRoomTime(room.lastMessage.createdAt);
              } else {
                lastTime = formatRoomTime(group.updatedAt);
              }
            } else {
              const room = item as ChatRoom;
              const otherUserId = room.participants.find(p => p !== currentUserId) || "Unknown User";
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
              <Link 
                key={item.id} 
                href={chatUrl}
                className="flex items-center justify-between px-4 py-3 hover:bg-[#F8F9FA] transition-colors active:bg-[#F1F3F5]"
              >
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className={cn(
                      "w-14 h-14 overflow-hidden border border-[#F1F3F5] shadow-sm",
                      activeTab === "group" ? "rounded-2xl" : "rounded-full"
                    )}>
                      <img src={image} alt={title} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[15px] font-bold text-[#212529]">{title}</span>
                    <span className="text-[13px] mt-0.5 truncate max-w-[180px] text-[#868E96]">
                      {lastMsg}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <span className="text-[11px] font-semibold text-[#ADB5BD]">
                    {lastTime}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
