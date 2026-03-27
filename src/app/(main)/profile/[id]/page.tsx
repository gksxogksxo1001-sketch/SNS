"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { postService } from "@/core/firebase/postService";
import { userService } from "@/core/firebase/userService";
import { messageService } from "@/core/firebase/messageService";
import { useAuth } from "@/core/hooks/useAuth";
import { UserProfile } from "@/types/user";
import { Post } from "@/types/post";
import { PostCard } from "@/components/features/feed/PostCard";
import { ChevronLeft, Grid, Heart, User as UserIcon, Globe, X, Send, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_AVATAR } from "@/core/constants";
import Image from "next/image";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params?.id as string;
  const router = useRouter();
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "liked">("posts");
  
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const [requestStatus, setRequestStatus] = useState<"none" | "pending" | "friends">("none");
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUnfollowConfirmOpen, setIsUnfollowConfirmOpen] = useState(false);
  const [isEnteringChat, setIsEnteringChat] = useState(false);

  useEffect(() => {
    if (userId && !isAuthLoading) {
      fetchData();
    }
  }, [userId, isAuthLoading, currentUser?.uid]);

  const handleMessageClick = async () => {
    if (!currentUser || !userId || isEnteringChat) return;
    setIsEnteringChat(true);
    try {
      const roomId = await messageService.createOrGetRoom(currentUser.uid, userId);
      const name = profile?.nickname || "";
      const image = profile?.avatarUrl || "";
      router.push(`/messages/${roomId}?userId=${userId}&name=${encodeURIComponent(name)}&image=${encodeURIComponent(image)}`);
    } catch (error) {
      console.error("Failed to enter chat:", error);
      setIsEnteringChat(false);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profileData, allPosts, myProfile] = await Promise.all([
        userService.getUserProfile(userId),
        postService.getPosts(),
        currentUser ? userService.getUserProfile(currentUser.uid) : Promise.resolve(null)
      ]);
      const filteredPosts = allPosts.filter(post => post.user.uid === userId);
      setUserPosts(filteredPosts);
      setLikedPosts(allPosts.filter(post => post.likedBy?.includes(userId)));

      let finalProfile = profileData;
      if (!finalProfile && filteredPosts.length > 0) {
        const postUser = filteredPosts[0].user;
        finalProfile = {
          uid: userId,
          email: "이메일 정보 없음",
          nickname: postUser.name || "알 수 없는 사용자",
          avatarUrl: postUser.image || "",
          friends: [],
          visitedCountries: [],
        } as unknown as UserProfile;
      }
      setProfile(finalProfile);

      // Check friend status
      if (currentUser && finalProfile) {
        if (myProfile?.friends?.includes(userId)) {
          setRequestStatus("friends");
        } else {
          // Check if I sent a request (Pending)
          const requestsToThem = await userService.getPendingRequests(userId);
          if (requestsToThem.some(p => p.fromUid === currentUser.uid)) {
            setRequestStatus("pending");
          }

          // Check if they sent ME a request (Incoming)
          const requestsToMe = await userService.getPendingRequests(currentUser.uid);
          const incoming = requestsToMe.find(p => p.fromUid === userId);
          if (incoming) {
            setIncomingRequestId(incoming.id);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch public profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFriendRequest = async () => {
    if (!currentUser || !userId || isRequesting) return;
    
    setIsRequesting(true);
    try {
      await userService.sendFriendRequest(currentUser.uid, userId);
      setRequestStatus("pending");
    } catch (error) {
      console.error("Friend request failed:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleAcceptFriend = async () => {
    if (!incomingRequestId || isRequesting) return;
    setIsRequesting(true);
    try {
      await userService.acceptFriendRequest(incomingRequestId);
      setRequestStatus("friends");
      setIncomingRequestId(null);
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDeclineFriend = async () => {
    if (!incomingRequestId || isRequesting) return;
    setIsRequesting(true);
    try {
      await userService.declineFriendRequest(incomingRequestId);
      setIncomingRequestId(null);
    } catch (error) {
      console.error("Failed to decline friend request:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleUnfollow = async () => {
    if (!currentUser || !userId || isRequesting) return;
    setIsRequesting(true);
    try {
      await userService.unfollowUser(currentUser.uid, userId);
      setRequestStatus("none");
      setIsUnfollowConfirmOpen(false);
    } catch (error) {
      console.error("Failed to unfollow:", error);
    } finally {
      setIsRequesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4">
        <p className="text-text-sub">사용자를 찾을 수 없습니다.</p>
        <button onClick={() => router.back()} className="text-primary font-bold">뒤로 가기</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-alt pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center bg-bg-base px-4 border-b border-border-base">
        <button onClick={() => router.back()} className="mr-4 p-1 text-text-main hover:bg-bg-alt rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">{profile.nickname}님의 프로필</h1>
      </header>

      <main className="px-5 pt-6 space-y-8">
        {/* Profile Info */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-bg-base shadow-md bg-bg-alt flex items-center justify-center">
            <Image 
              src={profile.avatarUrl || DEFAULT_AVATAR} 
              alt={profile.nickname} 
              fill
              sizes="96px"
              className="h-full w-full object-cover" 
            />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-text-main">{profile.nickname}</h2>
            <p className="text-sm text-text-sub">{profile.email}</p>
          </div>

          <div className="flex w-full max-w-sm justify-around pt-2">
            <div className="text-center group">
              <p className="text-lg font-bold text-text-main">{userPosts.length}</p>
              <p className="text-[10px] text-text-sub uppercase tracking-wider font-bold">게시물</p>
            </div>
            <div 
              onClick={() => setIsFriendsModalOpen(true)}
              className="text-center group cursor-pointer hover:opacity-70"
            >
              <p className="text-lg font-bold text-text-main">{profile.friends?.length || 0}</p>
              <p className="text-[10px] text-text-sub uppercase tracking-wider font-bold">친구</p>
            </div>
            <div 
              onClick={() => setIsCountryModalOpen(true)}
              className="text-center group cursor-pointer hover:opacity-70"
            >
              <p className="text-lg font-bold text-text-main">{profile.visitedCountries?.length || 0}</p>
              <p className="text-[10px] text-text-sub uppercase tracking-wider font-bold">방문 국가</p>
            </div>
          </div>

          <div className="w-full pt-2 flex space-x-2">
            <button 
              onClick={handleMessageClick}
              disabled={isEnteringChat}
              className="flex-1 py-2.5 bg-bg-alt text-text-main rounded-xl text-[14px] font-black hover:bg-border-base transition-colors active:scale-95 border border-border-base flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <Send size={16} className="-rotate-12" />
              <span>메시지</span>
            </button>

            {incomingRequestId ? (
              <div className="flex-[2] flex space-x-2">
                <button 
                  onClick={handleAcceptFriend}
                  disabled={isRequesting}
                  className="flex-1 py-2.5 bg-primary text-white rounded-xl text-[14px] font-black shadow-md shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isRequesting ? "처리 중..." : "수락"}
                </button>
                <button 
                  onClick={handleDeclineFriend}
                  disabled={isRequesting}
                  className="flex-1 py-2.5 bg-bg-alt text-text-main rounded-xl text-[14px] font-black active:scale-95 transition-all disabled:opacity-50 border border-border-base"
                >
                  거절
                </button>
              </div>
            ) : requestStatus === "friends" ? (
              <button 
                onClick={() => setIsUnfollowConfirmOpen(true)}
                className="flex-[2] py-2.5 bg-primary text-white rounded-xl text-[14px] font-black shadow-md shadow-primary/20 transition-colors active:scale-95 flex items-center justify-center space-x-1.5"
              >
                <UserCheck size={16} />
                <span className="hidden sm:inline">친구 (팔로잉)</span>
                <span className="sm:hidden">친구</span>
              </button>
            ) : requestStatus === "pending" ? (
              <button className="flex-[2] py-2.5 bg-bg-alt text-text-sub/50 rounded-xl text-[14px] font-black cursor-default border border-border-base">
                요청됨
              </button>
            ) : (
              <button 
                onClick={handleFriendRequest}
                disabled={isRequesting}
                className="flex-[2] py-2.5 bg-primary text-white rounded-xl text-[14px] font-black shadow-md shadow-primary/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isRequesting ? "보내는 중..." : "친구 신청하기"}
              </button>
            )}
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
              <span className="text-sm">게시물</span>
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
            {(() => {
              const currentPosts = activeTab === "posts" ? userPosts : likedPosts;
              
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
                          sizes="(max-width: 768px) 33vw, 250px"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110" 
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="flex items-center text-white font-bold text-sm">
                            <Heart size={16} className="mr-1 fill-white" />
                            {post.likes}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              }

              return (
                <div className="text-center py-20 text-text-sub">
                  {activeTab === "posts" ? "게시물이 없습니다." : "좋아요한 게시물이 없습니다."}
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      {/* Visited Countries Modal (Read-only) */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:w-[400px] h-[50vh] sm:h-auto bg-bg-base rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b border-border-base">
              <h3 className="text-lg font-black flex items-center">
                <Globe size={20} className="mr-2 text-primary" />
                방문한 국가
              </h3>
              <button onClick={() => setIsCountryModalOpen(false)} className="p-2 hover:bg-bg-alt rounded-full text-text-sub">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {profile.visitedCountries?.length > 0 ? (
                  profile.visitedCountries.map((country, idx) => (
                    <div key={idx} className="p-3 bg-bg-alt rounded-2xl border border-border-base text-center text-sm font-bold text-text-main">
                      {country}
                    </div>
                  ))
                ) : (
                  <p className="col-span-2 text-center text-text-sub py-10">등록된 국가가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Friends Modal */}
      {isFriendsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:w-[400px] h-[50vh] sm:h-auto bg-bg-base rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b border-border-base">
              <h3 className="text-lg font-black flex items-center">
                <UserIcon size={20} className="mr-2 text-primary" />
                팔로잉
              </h3>
              <button onClick={() => setIsFriendsModalOpen(false)} className="p-2 hover:bg-bg-alt rounded-full text-text-sub">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
                <p className="text-center text-text-sub py-10">비공개 정보입니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* Unfollow Confirmation Modal */}
      {isUnfollowConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="w-full max-w-[320px] bg-bg-base rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="relative mx-auto h-20 w-20 rounded-full overflow-hidden border-2 border-border-base bg-bg-alt flex items-center justify-center">
                <Image 
                  src={profile.avatarUrl || DEFAULT_AVATAR} 
                  alt="" 
                  fill
                  sizes="80px"
                  className="h-full w-full object-cover" 
                />
              </div>
              <div className="space-y-1">
                <p className="text-[15px] font-bold text-text-main">
                  @{profile.nickname}님을 팔로우 취소하시겠습니까?
                </p>
                <p className="text-[12px] text-text-sub leading-relaxed">
                  취소하면 상대방의 소식을 피드에서 <br />
                  더 이상 받아볼 수 없습니다.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col border-t border-border-base divide-y divide-border-base">
              <button 
                onClick={handleUnfollow}
                disabled={isRequesting}
                className="w-full py-4 text-error font-black text-sm hover:bg-error/5 transition-colors disabled:opacity-50"
              >
                {isRequesting ? "처리 중..." : "팔로우 취소"}
              </button>
              <button 
                onClick={() => setIsUnfollowConfirmOpen(false)}
                className="w-full py-4 text-text-main font-bold text-sm hover:bg-bg-alt transition-colors"
              >
                아니요
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
