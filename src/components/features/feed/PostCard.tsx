"use client";

import React, { useState, useEffect } from "react";
import { 
  Heart, MessageCircle, Share2, MoreHorizontal, Plane, Hotel, MapPin, Utensils, Wallet, Send, X, ChevronLeft, ChevronRight, Edit2, Trash2, EyeOff, Bookmark, Users, Globe, Lock 
} from "lucide-react";
import { Post, PostComment } from "@/types/post";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/core/hooks/useAuth";
import { postService } from "@/core/firebase/postService";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { useRouter } from "next/navigation";
import { DEFAULT_AVATAR } from "@/core/constants";
import { Avatar } from "@/components/common/Avatar";
import { PowerPopup } from "@/components/common/PowerPopup";
import Image from "next/image";
import { userService } from "@/core/firebase/userService";
import { UserProfile } from "@/types/user";
import { messageService } from "@/core/firebase/messageService";

import { useModalStore } from "@/store/useModalStore";

interface PostCardProps {
  post: Post;
  priority?: boolean;
}

export const PostCard = React.memo<PostCardProps>(({ post, priority = false }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModalStore();
  
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [friends, setFriends] = useState<UserProfile[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [sharingTo, setSharingTo] = useState<string | null>(null);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Slider state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  useEffect(() => {
    if (!post.id) return;
    
    const unsubscribe = postService.subscribeToPost(post.id, (updatedPost) => {
      if (updatedPost) {
        setLikeCount(updatedPost.likes || 0);
        setCommentCount(updatedPost.comments || 0);
        
        if (user) {
          if (updatedPost.likedBy) {
            setIsLiked(updatedPost.likedBy.includes(user.uid));
          }
          if (updatedPost.bookmarkedBy) {
            setIsBookmarked(updatedPost.bookmarkedBy.includes(user.uid));
          }
        }
      }
    });

    return () => unsubscribe();
  }, [post.id, user]);

  useEffect(() => {
    setLikeCount(post.likes || 0);
    setCommentCount(post.comments || 0);
  }, [post.likes, post.comments]);

  useEffect(() => {
    if (showComments && post.id) {
      const unsubscribe = postService.subscribeToComments(post.id, (fetchedComments) => {
        setComments(fetchedComments);
        setCommentCount(fetchedComments.length);
      });
      return () => unsubscribe();
    }
  }, [showComments, post.id]);

  useEffect(() => {
    if (isSharePopupOpen && user) {
      const fetchFriends = async () => {
        setIsLoadingFriends(true);
        try {
          const friendProfiles = await userService.getFriendsProfiles(user.uid);
          setFriends(friendProfiles);
        } catch (error) {
          console.error("Failed to fetch friends:", error);
        } finally {
          setIsLoadingFriends(false);
        }
      };
      fetchFriends();
    }
  }, [isSharePopupOpen, user]);



  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !post.id || !newComment.trim() || isSubmittingComment) {
      return;
    }

    setIsSubmittingComment(true);
    try {
      const commentData: Omit<PostComment, 'id' | 'createdAt' | 'postId'> = {
        user: {
          uid: user.uid,
          name: user.displayName || "Anonymous",
          image: user.photoURL || "",
        },
        content: newComment.trim(),
      };
      await postService.addComment(post.id, commentData);
      setNewComment("");
      // Real-time listener handles state updates automatically
    } catch (error) {
      console.error("Failed to add comment:", error);
      showAlert({ title: "오류", message: "댓글 추가에 실패했습니다.", type: "error" });
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!user) {
      showAlert({ title: "로그인 필요", message: "좋아요를 누르려면 로그인이 필요합니다.", type: "info" });
      return;
    }

    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    try {
      if (post.id) {
        await postService.toggleLike(post.id, user.uid, !newIsLiked);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      setIsLiked(!newIsLiked);
      setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };
  
  const handleBookmarkToggle = async () => {
    if (!user) {
      showAlert({ title: "로그인 필요", message: "게시물을 저장하려면 로그인이 필요합니다.", type: "info" });
      return;
    }

    const newIsBookmarked = !isBookmarked;
    setIsBookmarked(newIsBookmarked);

    try {
      if (post.id) {
        await postService.toggleBookmark(post.id, user.uid, !newIsBookmarked);
      }
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      setIsBookmarked(!newIsBookmarked);
    }
  };

  const handleShareClick = () => {
    if (!user) {
      showAlert({ title: "로그인 필요", message: "게시물을 공유하려면 로그인이 필요합니다.", type: "info" });
      return;
    }
    setIsSharePopupOpen(true);
  };

  const handleShareToFriend = async (friend: UserProfile) => {
    if (!user || !post.id) return;

    setSharingTo(friend.uid);
    try {
      const roomId = await messageService.createOrGetRoom(user.uid, friend.uid);
      await messageService.sendMessage(
        roomId,
        user.uid,
        `${friend.nickname}님에게 게시물을 공유했습니다.`,
        "postShare",
        undefined,
        undefined,
        undefined,
        {
          postId: post.id,
          postImage: post.images[0],
          postTitle: post.content.substring(0, 30),
          authorName: post.user.name
        }
      );
      showAlert({ title: "공유 성공", message: `${friend.nickname}님에게 게시물을 공유했습니다.`, type: "success" });
      setIsSharePopupOpen(false);
    } catch (error) {
      console.error("Failed to share post:", error);
      showAlert({ title: "오류", message: "게시물 공유에 실패했습니다.", type: "error" });
    } finally {
      setSharingTo(null);
    }
  };

  // Slider handlers
  const minSwipeDistance = 50;

  const onTouchStartSlider = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMoveSlider = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEndSlider = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentSlide < (post.images?.length || 0) - 1) {
      setCurrentSlide(prev => prev + 1);
    }
    if (isRightSwipe && currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlide < (post.images?.length || 0) - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  // Format creation date
  const getFormattedDate = () => {
    if (!post.createdAt) return "방금 전";
    
    // Check if it's a Firebase Timestamp
    const date = post.createdAt.toDate ? post.createdAt.toDate() : new Date(post.createdAt);
    
    return formatDistanceToNow(date, { addSuffix: true, locale: ko });
  };

  // Convert expenses object to displayable list
  const expenseList = post.expenses ? Object.entries(post.expenses)
    .filter(([_, amount]) => amount && amount > 0)
    .map(([category, amount]) => ({ category, amount: amount as number }))
    : [];

  const getExpenseIcon = (category: string) => {
    switch (category) {
      case "flight": return <Plane size={14} className="text-secondary" />;
      case "hotel": return <Hotel size={14} className="text-[#F4A261]" />;
      case "food": return <Utensils size={14} className="text-error" />;
      default: return <Wallet size={14} className="text-primary" />;
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const executeDelete = async () => {
    setIsDeleting(true);
    try {
      if (post.id) {
        await postService.deletePost(post.id);
        setIsDeleted(true);
      }
    } catch (error: any) {
      console.error("Failed to delete post:", error);
      showAlert({ 
        title: "삭제 실패", 
        message: "게시물 삭제 중에 오류가 발생했습니다.\n" + (error.message || ""),
        type: "error"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isDeleted) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-3xl bg-bg-base shadow-sm border border-border-base transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <button 
          onClick={() => {
            if (user && post.user.uid === user.uid) {
              router.push("/profile");
            } else {
              router.push(`/profile/${post.user.uid}`);
            }
          }}
          className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
        >
          <Avatar 
            src={post.user.image} 
            alt={post.user.name || "User"} 
            size={40}
            className="border border-border-base"
            priority={priority}
          />
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-text-main">{post.user.name || "익명 여행자"}</span>
              {post.user.group && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {post.user.group}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-[10px] font-medium text-text-sub">{getFormattedDate()}</span>
              <span className="text-[10px] text-border-base">•</span>
              <div className="flex items-center text-text-sub">
                {post.visibility === "friends" ? (
                  <Users size={10} className="mr-0.5" />
                ) : post.visibility === "close_friends" ? (
                  <Lock size={10} className="mr-0.5" />
                ) : (
                  <Globe size={10} className="mr-0.5" />
                )}
                <span className="text-[9px] font-bold">
                  {post.visibility === "friends" ? "친구만" : post.visibility === "close_friends" ? "친한친구" : "전체공개"}
                </span>
              </div>
            </div>
          </div>
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="text-text-sub p-1.5 hover:bg-bg-alt transition-colors rounded-full"
          >
            <MoreHorizontal size={20} />
          </button>
          
          {showMenu && (
            <>
              {/* Invisible overlay to close menu when clicking outside */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-36 rounded-2xl bg-bg-base shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-border-base py-1.5 z-20 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-3 py-1.5 mb-1 text-[10px] font-bold text-text-sub border-b border-border-base">
                  게시물 옵션
                </div>
                {user && post.user.uid === user.uid ? (
                  <>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowMenu(false); router.push(`/post/edit/${post.id}`); }} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-text-main hover:bg-bg-alt transition-colors"
                    >
                      <Edit2 size={15} className="mr-2 text-text-sub" /> 
                      수정하기
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        showConfirm({
                          title: "게시물을 삭제할까요?",
                          message: "이 작업은 되돌릴 수 없으며,\n피드에서 영구적으로 사라집니다.",
                          isDanger: true,
                          confirmText: "삭제하기",
                          onConfirm: executeDelete
                        });
                      }} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-error hover:bg-error/5 transition-colors"
                    >
                      <Trash2 size={15} className="mr-2" /> 
                      삭제하기
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { setShowMenu(false); showAlert({ title: "안내", message: "개발 중인 기능입니다." }); }} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-text-main hover:bg-bg-alt transition-colors"
                    >
                      <EyeOff size={15} className="mr-2 text-text-sub" /> 
                      관심 없음
                    </button>
                    <button 
                      onClick={() => { setShowMenu(false); handleBookmarkToggle(); }} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-text-main hover:bg-bg-alt transition-colors"
                    >
                      <Bookmark 
                        size={15} 
                        className={cn("mr-2", isBookmarked ? "text-primary fill-current" : "text-text-sub")} 
                      /> 
                      {isBookmarked ? "저장 취소" : "저장하기"}
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 py-2">
        <p className="text-[15px] leading-relaxed text-text-main whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Image Area with Slider */}
      {post.images && post.images.length > 0 && (
        <div className="relative w-full px-4 py-2 group select-none">
          <div 
            className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-bg-alt"
            onTouchStart={onTouchStartSlider}
            onTouchMove={onTouchMoveSlider}
            onTouchEnd={onTouchEndSlider}
          >
            {/* Images Wrapper */}
            <div 
              className="flex h-full w-full transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              {post.images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="relative h-full w-full flex-shrink-0 cursor-pointer"
                  onClick={() => setLightboxIndex(idx)}
                >
                  <Image 
                    src={img} 
                    alt={`Post Image ${idx + 1}`} 
                    fill
                    priority={priority && idx === 0}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover" 
                    draggable={false}
                  />
                </div>
              ))}
            </div>

            {/* Navigation Arrows (Desktop) */}
            {post.images.length > 1 && (
              <>
                {currentSlide > 0 && (
                  <button 
                    onClick={prevSlide}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-black/40 z-10"
                  >
                    <ChevronLeft size={20} />
                  </button>
                )}
                {currentSlide < post.images.length - 1 && (
                  <button 
                    onClick={nextSlide}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-black/40 z-10"
                  >
                    <ChevronRight size={20} />
                  </button>
                )}
              </>
            )}

            {/* Badge Indicator (Top Right) */}
            {post.images.length > 1 && (
              <div className="absolute right-4 top-4 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-md z-10">
                {currentSlide + 1} / {post.images.length}
              </div>
            )}
          </div>

          {/* Dots Indicator (Bottom) */}
          {post.images.length > 1 && (
            <div className="flex justify-center space-x-1.5 mt-3">
              {post.images.map((_, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    currentSlide === idx ? "w-4 bg-primary" : "w-1.5 bg-border-base"
                  )}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer Area */}
      <div className="p-4 pt-2">
        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[12px] font-bold text-primary">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Expense & Location */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {post.location && (
              <button 
                onClick={() => router.push(`/map?lat=${post.location!.lat}&lng=${post.location!.lng}&name=${encodeURIComponent(post.location!.name)}`)}
                className="flex items-center space-x-1.5 text-[12px] font-bold text-text-sub hover:text-primary transition-colors group cursor-pointer"
                title="지도에서 보기"
              >
                <MapPin size={14} className="text-primary group-hover:scale-110 transition-transform" />
                <span className="line-clamp-1 group-hover:underline">{post.location.name}</span>
              </button>
            )}
            {expenseList.length > 0 && (
              <div className="flex items-center space-x-2">
                {expenseList.slice(0, 3).map((exp, idx) => (
                  <div key={idx} className="flex items-center space-x-1 bg-bg-alt px-2 py-1 rounded-full border border-border-base hover:bg-bg-base hover:shadow-sm transition-all duration-300">
                    <span className="scale-90">{getExpenseIcon(exp.category)}</span>
                    <span className="text-[10px] font-bold text-text-main whitespace-nowrap">
                      {exp.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {post.totalExpense > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-text-sub uppercase tracking-tighter mb-0.5">Total</span>
              <span className="text-[16px] font-black text-text-main">
                {post.totalExpense.toLocaleString()}원
              </span>
            </div>
          )}
        </div>
 
        {/* Interaction */}
        <div className="flex items-center justify-between pt-3 border-t border-border-base">
          <div className="flex items-center space-x-5">
            <button 
              onClick={handleLikeToggle}
              className={cn(
                "flex items-center space-x-1.5 transition-colors group",
                isLiked ? "text-error" : "text-text-sub hover:text-error"
              )}
            >
              <Heart 
                size={20} 
                className={cn(
                  "transition-transform group-active:scale-125",
                  isLiked && "fill-current"
                )} 
              />
              <span className="text-xs font-bold">{likeCount}</span>
            </button>
            <button 
              onClick={() => setShowComments(!showComments)}
              className={cn(
                "flex items-center space-x-1.5 transition-colors",
                showComments ? "text-primary" : "text-text-sub hover:text-primary"
              )}
            >
              <MessageCircle size={20} />
              <span className="text-xs font-bold">{commentCount}</span>
            </button>
            <button 
              onClick={handleShareClick}
              className="flex items-center space-x-1.5 text-text-sub transition-colors hover:text-blue-500"
            >
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleBookmarkToggle}
              className={cn(
                "flex items-center space-x-1.5 transition-colors group",
                isBookmarked ? "text-primary" : "text-text-sub hover:text-primary"
              )}
            >
              <Bookmark 
                size={20} 
                className={cn(
                  "transition-transform group-active:scale-125",
                  isBookmarked && "fill-current"
                )} 
              />
            </button>
          </div>
        </div>

        {/* Comment Section */}
        {showComments && (
          <div className="mt-4 space-y-4 pt-4 border-t border-[#F8F9FA] animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Comment List */}
            <div className="max-h-60 overflow-y-auto space-y-4 pr-1 scrollbar-hide">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-bg-alt border border-border-base">
                      <Image 
                        src={comment.user.image || DEFAULT_AVATAR} 
                        alt={comment.user.name} 
                        fill
                        sizes="32px"
                        className="object-cover" 
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-main">{comment.user.name}</span>
                        <span className="text-[10px] text-text-sub">
                          {comment.createdAt && 'toDate' in comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ko }) : "방금 전"}
                        </span>
                      </div>
                      <p className="text-sm text-text-main leading-relaxed">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-text-sub py-4">첫 번째 댓글을 남겨보세요! ✈️</p>
              )}
            </div>

            {/* Comment Input */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="flex items-center space-x-2 pt-2">
                <div className="relative h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-bg-alt border border-border-base">
                  <Image 
                    src={user.photoURL || DEFAULT_AVATAR} 
                    alt={user.displayName || ""} 
                    fill
                    sizes="32px"
                    className="object-cover" 
                  />
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="w-full bg-bg-alt rounded-full py-2 px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 border-none placeholder:text-text-sub/50"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-primary disabled:text-text-sub/30 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2 px-4 bg-bg-alt rounded-xl">
                <p className="text-xs text-text-sub">
                  댓글을 달려면 <button onClick={() => showAlert({ title: "안내", message: "로그인이 필요합니다.", type: "info" })} className="text-primary font-bold">로그인</button>이 필요합니다.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxIndex !== null && post.images && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)} // Click outside to close
        >
          {/* Close Button */}
          <button 
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(null); }}
            className="absolute right-4 top-4 p-2 text-white/70 hover:text-white transition-colors z-50 rounded-full hover:bg-white/10"
          >
            <X size={28} />
          </button>

          {/* Left Arrow */}
          {lightboxIndex > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex - 1); }}
              className="absolute left-4 md:left-20 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white transition-colors z-50 rounded-full hover:bg-white/10"
            >
              <ChevronLeft size={36} />
            </button>
          )}

          {/* Image Container */}
          <div className="relative h-[80vh] w-full max-w-4xl px-16 flex items-center justify-center pointer-events-none">
            <Image 
              src={post.images[lightboxIndex]} 
              alt={`Post Image ${lightboxIndex + 1}`} 
              fill
              className="object-contain drop-shadow-2xl animate-in zoom-in-95 duration-200 pointer-events-auto" 
              onClick={(e) => e.stopPropagation()} // Prevent close when clicking directly on image
            />
            
            {/* Image Indicator */}
            {post.images.length > 1 && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                {lightboxIndex + 1} / {post.images.length}
              </div>
            )}
          </div>

          {/* Right Arrow */}
          {lightboxIndex < post.images.length - 1 && (
            <button 
              onClick={(e) => { e.stopPropagation(); setLightboxIndex(lightboxIndex + 1); }}
              className="absolute right-4 md:right-20 top-1/2 -translate-y-1/2 p-3 text-white/50 hover:text-white transition-colors z-50 rounded-full hover:bg-white/10"
            >
              <ChevronRight size={36} />
            </button>
          )}
        </div>
      )}

      {/* Share PowerPopup */}
      <PowerPopup
        isOpen={isSharePopupOpen}
        onClose={() => setIsSharePopupOpen(false)}
        title="친구에게 공유하기"
        icon={<Share2 size={22} />}
      >
        <div className="space-y-4">
          {isLoadingFriends ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : friends.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {friends.map((friend) => (
                <button
                  key={friend.uid}
                  onClick={() => handleShareToFriend(friend)}
                  disabled={sharingTo === friend.uid}
                   className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-bg-alt transition-all border border-transparent hover:border-border-base active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-bg-alt border border-border-base flex items-center justify-center">
                      <Image 
                        src={friend.avatarUrl || DEFAULT_AVATAR} 
                        alt="" 
                        fill
                        sizes="40px"
                        className="object-cover" 
                      />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-text-main">{friend.nickname}</p>
                      <p className="text-[10px] text-text-sub capitalize">{friend.travelStyle || "여행을 즐기는 중"}</p>
                    </div>
                  </div>
                  <div className="p-2 bg-primary/5 rounded-xl text-primary font-bold text-[11px]">
                    {sharingTo === friend.uid ? "보내는 중..." : "보내기"}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 space-y-3">
              <div className="mx-auto w-12 h-12 bg-bg-alt rounded-full flex items-center justify-center text-text-sub">
                <Users size={24} />
              </div>
              <p className="text-xs text-text-sub font-bold">공유할 친구가 없습니다.</p>
            </div>
          )}
        </div>
      </PowerPopup>
    </div>
  );
});

PostCard.displayName = "PostCard";
