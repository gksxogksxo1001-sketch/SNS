"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/core/hooks/useAuth";
import { AuthService } from "@/core/services/AuthService";
import { postService } from "@/core/firebase/postService";
import { userService } from "@/core/firebase/userService";
import { UserProfile } from "@/types/user";
import { Post } from "@/types/post";
import { PostCard } from "@/components/features/feed/PostCard";
import { 
  Settings, LogOut, Grid, Heart, MapPin, Calendar, 
  User as UserIcon, Camera, Plus, Trash2, X, Globe, 
  Bookmark, Users, UserCog, ChevronRight 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { AccountSwitcher } from "@/components/features/auth/AccountSwitcher";
import { DEFAULT_AVATAR } from "@/core/constants";

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "liked" | "stories" | "bookmarks">("posts");
  
  // Modals state
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [newCountry, setNewCountry] = useState("");
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isUnfollowConfirmOpen, setIsUnfollowConfirmOpen] = useState(false);
  const [userToUnfollow, setUserToUnfollow] = useState<UserProfile | null>(null);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push("/login");
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (user) {
      fetchUserPosts();
      fetchUserProfile();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await AuthService.logOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    const data = await userService.getUserProfile(user.uid);
    if (!data) return;
    setProfile(data);
    
    // Fetch friend profiles if any
    if (data.friends && data.friends.length > 0) {
      const friendData = await Promise.all(
        data.friends.map(friendId => userService.getUserProfile(friendId))
      );
      // Filter out any potential nulls if a user was deleted but still in friends list
      setFriendProfiles(friendData.filter((p): p is UserProfile => p !== null));
    }
  };

  const fetchUserPosts = async () => {
    if (!user) return;
    setIsLoadingPosts(true);
    try {
      // In a real app, we'd have a getPostsByUser method
      // For now, we'll fetch all and filter client-side (not efficient but works for MVP)
      const allPosts = await postService.getPosts();
      const filteredPosts = allPosts.filter(post => post.user.uid === user.uid);
      setUserPosts(filteredPosts);
    } catch (error) {
      console.error("Failed to fetch user posts:", error);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUpdatingPhoto(true);
    try {
      const newUrl = await userService.updateProfilePhoto(user.uid, file);
      // Update local state
      setProfile(prev => prev ? { ...prev, avatarUrl: newUrl } : null);
    } catch (error) {
      console.error("Failed to update photo:", error);
    } finally {
      setIsUpdatingPhoto(false);
    }
  };

  const handleAddCountry = async () => {
    if (!newCountry.trim() || !user) return;
    try {
      await userService.addVisitedCountry(user.uid, newCountry.trim());
      setNewCountry("");
      fetchUserProfile();
    } catch (error) {
      console.error("Failed to add country:", error);
    }
  };

  const handleDeleteCountry = async (country: string) => {
    if (!user) return;
    try {
      await userService.removeVisitedCountry(user.uid, country);
      fetchUserProfile();
    } catch (error) {
      console.error("Failed to delete country:", error);
    }
  };

  const handleUnfollow = async () => {
    if (!user || !userToUnfollow) return;
    try {
      await userService.unfollowUser(user.uid, userToUnfollow.uid);
      setIsUnfollowConfirmOpen(false);
      setUserToUnfollow(null);
      // Refresh profiles
      fetchUserProfile();
    } catch (error) {
      console.error("Failed to unfollow:", error);
    }
  };

  if (isAuthLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-white px-4 border-b">
        <h1 className="text-lg font-bold">프로필</h1>
        <div className="relative flex items-center">
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={cn(
              "p-2 rounded-full transition-all",
              isSettingsOpen ? "bg-primary text-white" : "text-text-sub hover:bg-gray-100"
            )}
          >
            <Settings size={20} />
          </button>

          {/* Settings Dropdown */}
          {isSettingsOpen && (
            <>
              {/* Overlay for closing */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsSettingsOpen(false)}
              ></div>
              
              <div className="absolute top-12 right-0 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 mb-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">설정 및 관리</p>
                </div>
                
                <button 
                  onClick={() => {
                    setActiveTab("stories");
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <MapPin size={18} className="text-[#2A9D8F]" />
                  <span className="text-sm font-bold text-gray-700">보관</span>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab("bookmarks");
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <Bookmark size={18} className="text-[#2196F3]" />
                  <span className="text-sm font-bold text-gray-700">북마크</span>
                </button>

                <button 
                  onClick={() => {
                    setIsFriendsModalOpen(true);
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <Users size={18} className="text-[#E9C46A]" />
                  <span className="text-sm font-bold text-gray-700">친한친구</span>
                </button>

                <button 
                  onClick={() => {
                    setIsAccountSwitcherOpen(true);
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors group"
                >
                  <UserCog size={18} className="text-[#F4A261]" />
                  <span className="text-sm font-bold text-gray-700">계정 관리</span>
                </button>

                <div className="h-px bg-gray-100 my-1 mx-4"></div>

                <button 
                  onClick={() => {
                    handleLogout();
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="text-sm font-bold">로그아웃</span>
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      <main className="px-5 pt-6 space-y-8">
        {/* Profile Info */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative group">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md bg-gray-100 relative flex items-center justify-center">
              <img src={profile?.avatarUrl || DEFAULT_AVATAR} alt={user.displayName || ""} className="h-full w-full object-cover" />
              {isUpdatingPhoto && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-[#2A9D8F] text-white rounded-full border-2 border-white shadow-sm hover:scale-110 active:scale-95 transition-all"
            >
              <Camera size={14} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload} 
              className="hidden" 
              accept="image/*"
            />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-text-main">{user.displayName || "여행자"}</h2>
            <p className="text-sm text-text-sub">{user.email}</p>
          </div>

          <div className="flex w-full max-w-sm justify-around pt-2">
            <div className="text-center group cursor-pointer">
              <p className="text-lg font-bold text-text-main">{userPosts.length}</p>
              <p className="text-[10px] text-text-sub uppercase tracking-wider font-bold">게시물</p>
            </div>
            <div 
              onClick={() => setIsFriendsModalOpen(true)}
              className="text-center group cursor-pointer hover:opacity-70 transition-opacity"
            >
              <p className="text-lg font-bold text-text-main">{profile?.friends?.length || 0}</p>
              <p className="text-[10px] text-text-sub uppercase tracking-wider font-bold">친구</p>
            </div>
            <div 
              onClick={() => setIsCountryModalOpen(true)}
              className="text-center group cursor-pointer hover:opacity-70 transition-opacity"
            >
              <p className="text-lg font-bold text-text-main">{profile?.visitedCountries?.length || 0}</p>
              <p className="text-[10px] text-text-sub uppercase tracking-wider font-bold">방문 국가</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("posts")}
              className={cn(
                "flex-1 py-3 flex items-center justify-center space-x-2 transition-colors relative",
                activeTab === "posts" ? "text-primary font-bold" : "text-text-sub hover:text-text-main"
              )}
            >
              <Grid size={18} />
              <span className="text-sm">내 게시물</span>
              {activeTab === "posts" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
            <button
              onClick={() => setActiveTab("liked")}
              className={cn(
                "flex-1 py-3 flex items-center justify-center space-x-2 transition-colors relative",
                activeTab === "liked" ? "text-primary font-bold" : "text-text-sub hover:text-text-main"
              )}
            >
              <Heart size={18} />
              <span className="text-sm">좋아요</span>
              {activeTab === "liked" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 pb-6">
            {isLoadingPosts ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : activeTab === "posts" && userPosts.length > 0 ? (
              <div className="grid grid-cols-3 gap-[2px]">
                {userPosts.map((post) => (
                  <div 
                    key={post.id} 
                    className="aspect-square relative group cursor-pointer overflow-hidden"
                    onClick={() => router.push(`/post/${post.id}`)}
                  >
                    <img 
                      src={post.images[0]} 
                      alt="Post" 
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                  {activeTab === "posts" ? <Grid size={32} /> : 
                   activeTab === "liked" ? <Heart size={32} /> :
                   activeTab === "stories" ? <MapPin size={32} /> : <Bookmark size={32} />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-text-main">
                    {activeTab === "posts" ? "아직 게시물이 없습니다." : 
                     activeTab === "liked" ? "좋아요 표시한 게시물이 없습니다." :
                     activeTab === "stories" ? "보관된 스토리가 없습니다." : "북마크한 게시물이 없습니다."}
                  </p>
                  <p className="text-xs text-text-sub opacity-70">
                    {activeTab === "posts" ? "당신의 첫 번째 여행기를 공유해 보세요!" : 
                     activeTab === "liked" ? "관심 있는 게시물에 좋아요를 눌러보세요." :
                     activeTab === "stories" ? "설정에서 '스토리 보관'을 활성화하면 여기에 표시됩니다." : "관심 있는 게시물을 저장해 보세요!"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Visited Countries Modal */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:w-[400px] h-[70vh] sm:h-auto max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-black flex items-center">
                <Globe size={20} className="mr-2 text-primary" />
                나의 방문 국가
              </h3>
              <button onClick={() => setIsCountryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* Add Country */}
              <div className="flex items-center space-x-2">
                <input 
                  type="text" 
                  value={newCountry}
                  onChange={(e) => setNewCountry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCountry()}
                  placeholder="새로운 나라 추가 (예: 일본)" 
                  className="flex-1 bg-[#F8F9FA] border border-[#F1F3F5] p-3 rounded-2xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
                <button 
                  onClick={handleAddCountry}
                  className="p-3 bg-primary text-white rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-md shadow-primary/20"
                >
                  <Plus size={20} />
                </button>
              </div>

              {/* Country List */}
              <div className="grid grid-cols-2 gap-3">
                {profile?.visitedCountries && profile.visitedCountries.length > 0 ? (
                  profile.visitedCountries.map((country, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <span className="text-sm font-bold text-text-main">{country}</span>
                      <button 
                        onClick={() => handleDeleteCountry(country)}
                        className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 py-10 text-center space-y-2">
                    <Globe size={32} className="mx-auto text-gray-200" />
                    <p className="text-xs text-text-sub">아직 등록된 국가가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-5 border-t">
              <Button onClick={() => setIsCountryModalOpen(false)} className="w-full rounded-2xl py-6 font-black">
                확인
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {isFriendsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:w-[400px] h-[70vh] sm:h-auto max-h-[85vh] bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-black flex items-center">
                <UserIcon size={20} className="mr-2 text-[#2A9D8F]" />
                팔로잉
              </h3>
              <button onClick={() => setIsFriendsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto min-h-[300px]">
              {friendProfiles.length > 0 ? (
                <div className="space-y-4">
                  {friendProfiles.map((friend, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer"
                      onClick={() => {
                        setIsFriendsModalOpen(false);
                        router.push(`/profile/${friend.uid}`);
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-100 border flex items-center justify-center text-gray-400">
                          <img src={friend.avatarUrl || DEFAULT_AVATAR} alt={friend.nickname} className="h-full w-full object-cover" />
                        </div>
                        <span className="text-sm font-bold">{friend.nickname}</span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setUserToUnfollow(friend);
                          setIsUnfollowConfirmOpen(true);
                        }}
                        className="px-3 py-1.5 bg-gray-100 text-[12px] font-bold rounded-xl text-text-sub hover:bg-gray-200 transition-colors"
                      >
                        팔로잉
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                  <UserIcon size={40} className="text-gray-100" />
                  <p className="text-xs text-text-sub font-medium">아직 팔로우하는 친구가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unfollow Confirmation Modal */}
      {isUnfollowConfirmOpen && userToUnfollow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-[320px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full overflow-hidden border-2 border-gray-100 flex items-center justify-center">
                <img src={userToUnfollow.avatarUrl || DEFAULT_AVATAR} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-1">
                <p className="text-[15px] font-bold text-text-main">
                  @{userToUnfollow.nickname}님을 팔로우 취소하시겠습니까?
                </p>
                <p className="text-[12px] text-text-sub leading-relaxed">
                  취소하면 상대방의 소식을 피드에서 <br />
                  더 이상 받아볼 수 없습니다.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col border-t divide-y">
              <button 
                onClick={handleUnfollow}
                className="w-full py-4 text-red-500 font-black text-sm hover:bg-red-50 transition-colors"
              >
                팔로우 취소
              </button>
              <button 
                onClick={() => {
                  setIsUnfollowConfirmOpen(false);
                  setUserToUnfollow(null);
                }}
                className="w-full py-4 text-text-main font-bold text-sm hover:bg-gray-50 transition-colors"
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Account Switcher Modal */}
      <AccountSwitcher 
        isOpen={isAccountSwitcherOpen} 
        onClose={() => setIsAccountSwitcherOpen(false)} 
        currentUid={user.uid}
      />
    </div>
  );
}

