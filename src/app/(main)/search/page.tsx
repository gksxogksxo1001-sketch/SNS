"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/hooks/useAuth";
import { userService } from "@/core/firebase/userService";
import { UserProfile } from "@/types/user";
import { Post } from "@/types/post";
import { ArrowLeft, Search as SearchIcon, UserPlus, Check, Loader2, User as UserDefaultIcon, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { postService } from "@/core/firebase/postService";
import { useModalStore } from "@/store/useModalStore";
import Image from "next/image";

export default function SearchPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { showAlert } = useModalStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "locations">("users");

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsLoading(true);
    try {
      if (activeTab === "users") {
        const users = await userService.searchUsers(searchTerm.trim());
        setUserResults(users.filter(u => u.uid !== currentUser?.uid));
      } else {
        const posts = await postService.searchPostsByLocation(searchTerm.trim());
        setPostResults(posts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendRequest = async (targetUid: string) => {
    if (!currentUser) return;
    try {
      await userService.sendFriendRequest(currentUser.uid, targetUid);
      showAlert({ title: "성공", message: "친구 요청을 보냈습니다.", type: "success" });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-bg-alt pb-20">
      <header className="sticky top-0 z-30 bg-bg-base border-b border-border-base px-4 pt-3">
        <div className="flex items-center space-x-3 mb-4">
          <button onClick={() => router.back()} className="p-1 hover:bg-bg-alt rounded-full text-text-main">
            <ArrowLeft size={20} />
          </button>
          <form onSubmit={handleSearch} className="flex-1 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === "users" ? "친구를 찾아보세요 (닉네임)" : "장소를 찾아보세요 (위치 이름)"}
              autoFocus
              className="w-full bg-bg-alt rounded-2xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border-none placeholder:text-text-sub/50 text-text-main"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" size={18} />
          </form>
        </div>

        <div className="flex border-b border-border-base">
          <button 
            onClick={() => setActiveTab("users")}
            className={cn(
              "flex-1 py-3 text-sm font-bold transition-colors relative",
              activeTab === "users" ? "text-primary" : "text-text-sub"
            )}
          >
            사용자
            {activeTab === "users" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
          <button 
            onClick={() => setActiveTab("locations")}
            className={cn(
              "flex-1 py-3 text-sm font-bold transition-colors relative",
              activeTab === "locations" ? "text-primary" : "text-text-sub"
            )}
          >
            장소
            {activeTab === "locations" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
          </button>
        </div>
      </header>

      <main className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : activeTab === "users" ? (
          userResults.length > 0 ? (
            <div className="space-y-4">
              {userResults.map((profile) => (
                <div 
                  key={profile.uid} 
                  className="flex items-center justify-between p-3 hover:bg-bg-alt rounded-2xl transition-colors cursor-pointer"
                  onClick={() => router.push(`/profile/${profile.uid}`)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 overflow-hidden rounded-full bg-bg-alt border border-border-base">
                      {profile.avatarUrl ? (
                        <Image 
                          src={profile.avatarUrl} 
                          alt={profile.nickname} 
                          fill
                          sizes="48px"
                          className="h-full w-full object-cover" 
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-text-sub">
                          <UserDefaultIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-text-main">{profile.nickname}</p>
                      <p className="text-xs text-text-sub">{profile.friends?.length || 0} 명의 친구</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendRequest(profile.uid);
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      profile.friends?.includes(currentUser?.uid || "") 
                        ? "bg-bg-alt text-text-sub" 
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    {profile.friends?.includes(currentUser?.uid || "") ? (
                      <Check size={20} />
                    ) : (
                      <UserPlus size={20} />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : searchTerm && (
            <div className="text-center py-20 text-text-sub">
              <p className="text-sm font-medium">검색 결과가 없습니다.</p>
            </div>
          )
        ) : (
          postResults.length > 0 ? (
            <div className="space-y-4">
              {postResults.map((post) => (
                <div 
                  key={post.id} 
                  className="flex items-center space-x-3 p-3 hover:bg-bg-alt rounded-2xl transition-colors cursor-pointer"
                  onClick={() => router.push(`/post/${post.id}`)}
                >
                  <div className="relative h-16 w-16 overflow-hidden rounded-xl bg-bg-alt">
                    <Image 
                      src={post.images[0]} 
                      alt={post.location?.name || ""} 
                      fill
                      sizes="64px"
                      className="h-full w-full object-cover" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-text-main truncate">{post.location?.name}</p>
                    <div className="flex items-center text-xs text-text-sub mt-0.5">
                      <MapPin size={12} className="mr-1" />
                      <span className="truncate">{post.location?.address}</span>
                    </div>
                    <p className="text-[11px] text-primary font-bold mt-1">게시물 보기 &gt;</p>
                  </div>
                </div>
              ))}
            </div>
          ) : searchTerm && (
            <div className="text-center py-20 text-text-sub">
              <p className="text-sm font-medium">검색 결과가 없습니다.</p>
            </div>
          )
        )}

        {!searchTerm && !isLoading && (
          <div className="text-center py-20 space-y-4 opacity-30">
            <div className="mx-auto w-20 h-20 bg-bg-alt rounded-full flex items-center justify-center text-text-sub">
              {activeTab === "users" ? <UserDefaultIcon size={40} /> : <MapPin size={40} />}
            </div>
            <p className="text-sm font-medium">
              {activeTab === "users" ? "여행 친구를 찾아보세요!" : "멋진 장소를 탐색해 보세요!"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
