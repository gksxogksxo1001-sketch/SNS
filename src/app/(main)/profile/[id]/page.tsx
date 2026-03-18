"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { postService } from "@/core/firebase/postService";
import { userService } from "@/core/firebase/userService";
import { useAuth } from "@/core/hooks/useAuth";
import { UserProfile } from "@/types/user";
import { Post } from "@/types/post";
import { PostCard } from "@/components/features/feed/PostCard";
import { ChevronLeft, Grid, Heart, User as UserIcon, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params?.id as string;
  const router = useRouter();
  
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"posts" | "liked">("posts");
  
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const [requestStatus, setRequestStatus] = useState<"none" | "pending" | "friends">("none");
  const [incomingRequestId, setIncomingRequestId] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isUnfollowConfirmOpen, setIsUnfollowConfirmOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchData();
    }
  }, [userId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [profileData, allPosts] = await Promise.all([
        userService.getUserProfile(userId),
        postService.getPosts()
      ]);
      setProfile(profileData);
      setUserPosts(allPosts.filter(post => post.user.uid === userId));

      // Check friend status
      if (currentUser && profileData) {
        if (profileData.friends?.includes(currentUser.uid)) {
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
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center bg-white px-4 border-b">
        <button onClick={() => router.back()} className="mr-4 p-1 text-text-main hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">{profile.nickname}님의 프로필</h1>
      </header>

      <main className="px-5 pt-6 space-y-8">
        {/* Profile Info */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white shadow-md bg-gray-100">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.nickname} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                <UserIcon size={40} />
              </div>
            )}
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

          <div className="w-full pt-2">
            {incomingRequestId ? (
              <div className="flex space-x-2">
                <button 
                  onClick={handleAcceptFriend}
                  disabled={isRequesting}
                  className="flex-1 py-2.5 bg-[#2A9D8F] text-white rounded-xl text-[14px] font-black shadow-md shadow-[#2A9D8F]/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isRequesting ? "처리 중..." : "수락"}
                </button>
                <button 
                  onClick={handleDeclineFriend}
                  disabled={isRequesting}
                  className="flex-1 py-2.5 bg-[#F1F3F5] text-[#495057] rounded-xl text-[14px] font-black active:scale-95 transition-all disabled:opacity-50"
                >
                  거절
                </button>
              </div>
            ) : requestStatus === "friends" ? (
              <button 
                onClick={() => setIsUnfollowConfirmOpen(true)}
                className="w-full py-2.5 bg-gray-100 text-text-sub rounded-xl text-[14px] font-black hover:bg-gray-200 transition-colors active:scale-95"
              >
                팔로잉
              </button>
            ) : requestStatus === "pending" ? (
              <button className="w-full py-2.5 bg-[#F1F3F5] text-[#ADB5BD] rounded-xl text-[14px] font-black cursor-default">
                요청됨
              </button>
            ) : (
              <button 
                onClick={handleFriendRequest}
                disabled={isRequesting}
                className="w-full py-2.5 bg-[#2A9D8F] text-white rounded-xl text-[14px] font-black shadow-md shadow-[#2A9D8F]/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isRequesting ? "보내는 중..." : "친구 신청하기"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-4">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab("posts")}
              className={cn(
                "flex-1 py-3 flex items-center justify-center space-x-2 transition-colors relative",
                activeTab === "posts" ? "text-[#2A9D8F] font-bold" : "text-text-sub hover:text-text-main"
              )}
            >
              <Grid size={18} />
              <span className="text-sm">게시물</span>
              {activeTab === "posts" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2A9D8F]" />}
            </button>
            <button
              onClick={() => setActiveTab("liked")}
              className={cn(
                "flex-1 py-3 flex items-center justify-center space-x-2 transition-colors relative",
                activeTab === "liked" ? "text-[#2A9D8F] font-bold" : "text-text-sub hover:text-text-main"
              )}
            >
              <Heart size={18} />
              <span className="text-sm">좋아요</span>
              {activeTab === "liked" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2A9D8F]" />}
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 pb-6">
            {userPosts.length > 0 ? (
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
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="flex items-center text-white font-bold text-sm">
                        <Heart size={16} className="mr-1 fill-white" />
                        {post.likes}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 text-text-sub">
                게시물이 없습니다.
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Visited Countries Modal (Read-only) */}
      {isCountryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:w-[400px] h-[50vh] sm:h-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-black flex items-center">
                <Globe size={20} className="mr-2 text-primary" />
                방문한 국가
              </h3>
              <button onClick={() => setIsCountryModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={24} />
              </button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {profile.visitedCountries?.length > 0 ? (
                  profile.visitedCountries.map((country, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-center text-sm font-bold text-text-main">
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
          <div className="w-full sm:w-[400px] h-[50vh] sm:h-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-black flex items-center">
                <UserIcon size={20} className="mr-2 text-[#2A9D8F]" />
                팔로잉
              </h3>
              <button onClick={() => setIsFriendsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
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
          <div className="w-full max-w-[320px] bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full overflow-hidden border-2 border-gray-100 bg-gray-50">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <UserIcon size={32} />
                  </div>
                )}
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
            
            <div className="flex flex-col border-t divide-y">
              <button 
                onClick={handleUnfollow}
                disabled={isRequesting}
                className="w-full py-4 text-red-500 font-black text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {isRequesting ? "처리 중..." : "팔로우 취소"}
              </button>
              <button 
                onClick={() => setIsUnfollowConfirmOpen(false)}
                className="w-full py-4 text-text-main font-bold text-sm hover:bg-gray-50 transition-colors"
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
