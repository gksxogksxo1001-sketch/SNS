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
  Loader2,
  User as UserIcon, Camera, Plus, Trash2, X, Globe,
  Bookmark, Users, UserCog, ChevronRight, History, Star,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { useModalStore } from "@/store/useModalStore";
import { AccountSwitcher } from "@/components/features/auth/AccountSwitcher";
import { DEFAULT_AVATAR } from "@/core/constants";
import { PowerPopup } from "@/components/common/PowerPopup";
import { storyService } from "@/core/firebase/storyService";
import { Story } from "@/types/story";

export default function ProfilePage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { showConfirm } = useModalStore();
  const router = useRouter();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "liked">("posts");

  // Modals state
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [newCountry, setNewCountry] = useState("");
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userToUnfollow, setUserToUnfollow] = useState<UserProfile | null>(null);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isBookmarkPopupOpen, setIsBookmarkPopupOpen] = useState(false);
  const [isStoryPopupOpen, setIsStoryPopupOpen] = useState(false);
  const [archivedStories, setArchivedStories] = useState<Story[]>([]);
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [friendsModalTab, setFriendsModalTab] = useState<"all" | "close">("all");

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

  const toggleCloseFriend = async (targetUid: string) => {
    if (!user || !profile) return;
    const isClose = profile.closeFriends?.includes(targetUid) || false;
    try {
      await userService.toggleCloseFriend(user.uid, targetUid, isClose);
      // Update local state for immediate feedback
      setProfile(prev => {
        if (!prev) return null;
        const currentClose = prev.closeFriends || [];
        return {
          ...prev,
          closeFriends: isClose
            ? currentClose.filter(id => id !== targetUid)
            : [...currentClose, targetUid]
        };
      });
    } catch (error) {
      console.error("Failed to toggle close friend:", error);
    }
  };

  const fetchUserPosts = async () => {
    if (!user) return;
    setIsLoadingPosts(true);
    try {
      const allPosts = await postService.getPosts(user.uid);

      // Filter for each tab
      setUserPosts(allPosts.filter(post => post.user.uid === user.uid));
      setLikedPosts(allPosts.filter(post => post.likedBy?.includes(user.uid)));
      setBookmarkedPosts(allPosts.filter(post => post.bookmarkedBy?.includes(user.uid)));

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
    <div className="min-h-screen bg-bg-alt pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-bg-base px-4 border-b border-border-base">
        <h1 className="text-lg font-bold">프로필</h1>
        <div className="relative flex items-center">
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={cn(
              "p-2 rounded-full transition-all",
              isSettingsOpen ? "bg-primary text-white" : "text-text-sub hover:bg-bg-alt"
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

              <div className="absolute top-12 right-0 w-56 bg-bg-base rounded-2xl shadow-xl border border-border-base py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 mb-1">
                  <p className="text-[10px] font-black text-text-sub uppercase tracking-widest">설정 및 관리</p>
                </div>

                <button
                  onClick={async () => {
                    setIsSettingsOpen(false);
                    setIsStoryPopupOpen(true);
                    if (user) {
                      setIsLoadingStories(true);
                      setStoryError(null);
                      try {
                        const stories = await storyService.getUserStories(user.uid);
                        setArchivedStories(stories);
                      } catch (error: any) {
                        console.error("Failed to fetch archived stories:", error);
                        setStoryError(error.message || "스토리를 불러오는데 실패했습니다.");
                      } finally {
                        setIsLoadingStories(false);
                      }
                    }
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-bg-alt transition-colors group"
                >
                  <History size={18} className="text-primary" />
                  <span className="text-sm font-bold text-text-main">스토리 보관함</span>
                </button>

                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setIsBookmarkPopupOpen(true);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-bg-alt transition-colors group"
                >
                  <Bookmark size={18} className="text-primary" />
                  <span className="text-sm font-bold text-text-main">북마크</span>
                </button>

                <button
                  onClick={() => {
                    setFriendsModalTab("close"); // Default to Close Friends tab
                    setIsFriendsModalOpen(true);
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-bg-alt transition-colors group"
                >
                  <Users size={18} className="text-secondary" />
                  <span className="text-sm font-bold text-text-main">친한친구</span>
                </button>

                <button
                  onClick={() => {
                    setIsAccountSwitcherOpen(true);
                    setIsSettingsOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-bg-alt transition-colors group"
                >
                  <UserCog size={18} className="text-point" />
                  <span className="text-sm font-bold text-text-main">계정 관리</span>
                </button>

                <div className="h-px bg-border-base my-1 mx-4"></div>

                <button
                  onClick={() => {
                    setIsSettingsOpen(false);
                    showConfirm({
                      title: "로그아웃",
                      message: "정말 로그아웃 하시겠습니까?",
                      confirmText: "로그아웃",
                      isDanger: true,
                      onConfirm: handleLogout
                    });
                  }}
                  className="w-full flex items-center space-x-3 px-4 py-3 text-error hover:bg-error/5 transition-colors"
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
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-bg-base shadow-md bg-bg-alt flex items-center justify-center">
              {/* Next/Image 대신 일반 img 태그를 사용합니다 */}
              <img
                src={profile?.avatarUrl || DEFAULT_AVATAR}
                alt={profile?.nickname || "프로필"}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}

                onError={(e) => {
                  e.currentTarget.src = DEFAULT_AVATAR;
                }}
              />

              {isUpdatingPhoto && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <div className="h-5 w-5 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full border-2 border-bg-base shadow-sm hover:scale-110 active:scale-95 transition-all"
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
              onClick={() => {
                setFriendsModalTab("all"); // Default to All Following tab
                setIsFriendsModalOpen(true);
              }}
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
          <div className="flex border-b border-border-base">
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
            ) : (
              (() => {
                const currentPosts = activeTab === "posts" ? userPosts :
                  activeTab === "liked" ? likedPosts :
                    activeTab === "bookmarks" ? bookmarkedPosts : [];

                if (currentPosts.length > 0) {
                  return (
                    <div className="grid grid-cols-3 gap-[2px]">
                      {currentPosts.map((post) => (
                        <div
                          key={post.id}
                          className="aspect-square relative group cursor-pointer overflow-hidden"
                          onClick={() => router.push(`/post/${post.id}`)}
                        >
                          <Image
                            src={post.images[0]}
                            alt="Post"
                            fill
                            sizes="33vw"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="text-center py-20 space-y-4">
                    <div className="mx-auto w-16 h-16 bg-bg-alt rounded-full flex items-center justify-center text-text-sub/50">
                      {activeTab === "posts" ? <Grid size={32} /> : <Heart size={32} />}
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-text-main">
                        {activeTab === "posts" ? "아직 게시물이 없습니다." : "좋아요 표시한 게시물이 없습니다."}
                      </p>
                      <p className="text-xs text-text-sub opacity-70">
                        {activeTab === "posts" ? "당신의 첫 번째 여행기를 공유해 보세요!" : "관심 있는 게시물에 좋아요를 눌러보세요."}
                      </p>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </main>

      {/* Visited Countries Modal */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:w-[400px] h-[70vh] sm:h-auto max-h-[85vh] bg-bg-base rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b border-border-base">
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
                  className="flex-1 bg-bg-alt border border-border-base p-3 rounded-2xl text-[14px] focus:ring-2 focus:ring-primary/20 focus:outline-none text-text-main"
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
                    <div key={idx} className="flex items-center justify-between p-3 bg-bg-alt rounded-2xl border border-border-base group">
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
                    <Globe size={32} className="mx-auto text-text-sub/30" />
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
          <div className="w-full sm:w-[400px] h-[70vh] sm:h-auto max-h-[85vh] bg-bg-base rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-black flex items-center">
                {friendsModalTab === "all" ? (
                  <UserIcon size={20} className="mr-2 text-[#2A9D8F]" />
                ) : (
                  <Star size={20} className="mr-2 text-[#E76F51] fill-current" />
                )}
                {friendsModalTab === "all" ? "팔로잉" : "친한 친구"}
              </h3>
              <button onClick={() => setIsFriendsModalOpen(false)} className="p-2 hover:bg-bg-alt rounded-full text-text-sub">
                <X size={24} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-border-base">
              <button
                onClick={() => setFriendsModalTab("all")}
                className={cn(
                  "flex-1 py-3 text-[13px] font-bold transition-all relative",
                  friendsModalTab === "all" ? "text-primary" : "text-text-sub hover:text-text-main"
                )}
              >
                전체 팔로잉
                {friendsModalTab === "all" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
              <button
                onClick={() => setFriendsModalTab("close")}
                className={cn(
                  "flex-1 py-3 text-[13px] font-bold transition-all relative",
                  friendsModalTab === "close" ? "text-success" : "text-text-sub hover:text-text-main"
                )}
              >
                친한 친구 ⭐
                {friendsModalTab === "close" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-success" />}
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto min-h-[300px]">
              {(() => {
                const displayedFriends = friendsModalTab === "all"
                  ? friendProfiles
                  : friendProfiles.filter(f => profile?.closeFriends?.includes(f.uid));

                if (displayedFriends.length > 0) {
                  return (
                    <div className="space-y-4">
                      {displayedFriends.map((friend, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 hover:bg-bg-alt rounded-2xl transition-colors cursor-pointer group"
                          onClick={() => {
                            setIsFriendsModalOpen(false);
                            router.push(`/profile/${friend.uid}`);
                          }}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-bg-alt border border-border-base flex items-center justify-center text-text-sub">
                              <Image
                                src={friend.avatarUrl || DEFAULT_AVATAR}
                                alt={friend.nickname}
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            </div>
                            <div className="flex flex-col text-left">
                              <span className="text-sm font-bold text-text-main">{friend.nickname}</span>
                              {profile?.closeFriends?.includes(friend.uid) && (
                                <span className="text-[9px] font-black text-success flex items-center">
                                  <Star size={8} className="mr-0.5 fill-current" /> 친한친구
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCloseFriend(friend.uid);
                              }}
                              className={cn(
                                "p-2 rounded-xl transition-all active:scale-95",
                                profile?.closeFriends?.includes(friend.uid)
                                  ? "bg-success/10 text-success"
                                  : "bg-bg-alt text-text-sub hover:bg-border-base"
                              )}
                              title={profile?.closeFriends?.includes(friend.uid) ? "친한친구 해제" : "친한친구 추가"}
                            >
                              <Star size={16} className={cn(profile?.closeFriends?.includes(friend.uid) && "fill-current")} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                showConfirm({
                                  title: "팔로우 취소",
                                  message: `@${friend.nickname}님을 팔로우 취소하시겠습니까?\n취소하면 상대방의 소식을 피드에서 더 이상 받아볼 수 없습니다.`,
                                  confirmText: "팔로우 취소",
                                  isDanger: true,
                                  onConfirm: async () => {
                                    if (!user) return;
                                    await userService.unfollowUser(user.uid, friend.uid);
                                    fetchUserProfile();
                                  }
                                });
                              }}
                              className="px-3 py-1.5 bg-bg-alt text-[12px] font-bold rounded-xl text-text-sub hover:bg-border-base transition-colors"
                            >
                              팔로잉
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    {friendsModalTab === "all" ? <UserIcon size={40} className="text-text-sub/20" /> : <Star size={40} className="text-text-sub/20" />}
                    <p className="text-xs text-text-sub font-medium">
                      {friendsModalTab === "all" ? "아직 팔로우하는 친구가 없습니다." : "친한 친구로 등록된 친구가 없습니다."}
                    </p>
                  </div>
                );
              })()}
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

      {/* Bookmarks PowerPopup */}
      <PowerPopup
        isOpen={isBookmarkPopupOpen}
        onClose={() => setIsBookmarkPopupOpen(false)}
        title="나의 북마크"
        icon={<Bookmark size={22} fill="currentColor" />}
        contentClassName="p-6"
      >
        {bookmarkedPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {bookmarkedPosts.map((post) => (
              <div
                key={post.id}
                className="aspect-square relative group cursor-pointer overflow-hidden rounded-[20px] bg-bg-alt border border-border-base shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1"
                onClick={() => {
                  setIsBookmarkPopupOpen(false);
                  router.push(`/post/${post.id}`);
                }}
              >
                {post.images && post.images.length > 0 ? (
                  <Image
                    src={post.images[0]}
                    alt=""
                    fill
                    sizes="100px"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-gray-300">
                    <Camera size={20} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="p-6 bg-bg-alt rounded-full text-text-sub/30">
              <Bookmark size={48} />
            </div>
            <p className="text-sm font-bold text-text-sub/50">저장된 게시물이 없습니다.</p>
          </div>
        )}
      </PowerPopup>

      {/* Story Archive PowerPopup */}
      <PowerPopup
        isOpen={isStoryPopupOpen}
        onClose={() => setIsStoryPopupOpen(false)}
        title="스토리 보관함"
        icon={<History size={22} />}
        contentClassName="p-6"
      >
        {isLoadingStories ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm font-medium text-text-sub">보관함을 불러오는 중...</p>
          </div>
        ) : storyError ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center space-y-5">
            <div className="p-4 bg-red-50 rounded-full text-red-500">
              <X size={32} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-bold text-red-600">불러오기 실패</p>
              <p className="text-xs text-text-sub leading-relaxed">
                데이터베이스 설정(인덱스)이 완료되지 않았거나<br />
                네트워크 오류가 발생했습니다.
              </p>
            </div>
            {storyError.includes("index") && (
              <p className="text-[10px] text-primary font-bold underline cursor-pointer">
                콘솔창의 링크를 눌러 인덱스를 생성해주세요.
              </p>
            )}
          </div>
        ) : archivedStories.length > 0 ? (
          <div className="grid grid-cols-3 gap-4">
            {archivedStories.map((story) => (
              <div
                key={story.id}
                className="group relative aspect-[9/16] rounded-[20px] overflow-hidden bg-bg-alt border border-border-base cursor-pointer shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                {story.mediaUrl ? (
                  <Image
                    src={story.mediaUrl}
                    alt=""
                    fill
                    sizes="150px"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-text-sub/50">
                    <Camera size={20} />
                  </div>
                )}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur-md rounded-lg text-[8px] font-bold text-white">
                  {story.createdAt?.toDate?.() ? new Date(story.createdAt.toDate()).toLocaleDateString() : "방금 전"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="p-6 bg-bg-alt rounded-full text-text-sub/30">
              <History size={48} />
            </div>
            <p className="text-sm font-bold text-text-sub/50">보관된 스토리가 없습니다.</p>
          </div>
        )}
      </PowerPopup>
    </div>
  );
}
