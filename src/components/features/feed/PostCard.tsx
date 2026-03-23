"use client";

import React, { useState, useEffect } from "react";
import { Heart, MessageCircle, Share2, MoreHorizontal, Plane, Hotel, MapPin, Utensils, Wallet, Send, X, ChevronLeft, ChevronRight, Edit2, Trash2, EyeOff, Bookmark } from "lucide-react";
import { Post, PostComment } from "@/types/post";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/core/hooks/useAuth";
import { postService } from "@/core/firebase/postService";
import { cn } from "@/lib/utils";
import { Button } from "@/components/common/Button";
import { useRouter } from "next/navigation";
import { DEFAULT_AVATAR } from "@/core/constants";

interface PostCardProps {
  post: Post;
}

export const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const router = useRouter();
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comments || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    if (user) {
      if (post.likedBy) {
        setIsLiked(post.likedBy.includes(user.uid));
      }
      if (post.bookmarkedBy) {
        setIsBookmarked(post.bookmarkedBy.includes(user.uid));
      }
    }
  }, [user, post.likedBy, post.bookmarkedBy]);

  useEffect(() => {
    if (showComments && post.id) {
      fetchComments();
    }
  }, [showComments, post.id]);

  const fetchComments = async () => {
    if (!post.id) return;
    try {
      const fetchedComments = await postService.getComments(post.id);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    }
  };

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
      setCommentCount(prev => prev + 1);
      fetchComments(); // Re-fetch comments to include the new one
    } catch (error) {
      console.error("Failed to add comment:", error);
      alert("댓글 추가에 실패했습니다.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleLikeToggle = async () => {
    if (!user) {
      alert("좋아요를 누르려면 로그인이 필요합니다.");
      return;
    }

    // Optimistic Update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount(prev => newIsLiked ? prev + 1 : prev - 1);
    try {
      if (post.id) {
        await postService.toggleLike(post.id, user.uid, !newIsLiked);
      }
    } catch (error) {
      console.error("Failed to toggle like:", error);
      // Rollback on failure
      setIsLiked(!newIsLiked);
      setLikeCount(prev => !newIsLiked ? prev + 1 : prev - 1);
    }
  };
  
  const handleBookmarkToggle = async () => {
    if (!user) {
      alert("게시물을 저장하려면 로그인이 필요합니다.");
      return;
    }

    // Optimistic Update
    const newIsBookmarked = !isBookmarked;
    setIsBookmarked(newIsBookmarked);

    try {
      if (post.id) {
        await postService.toggleBookmark(post.id, user.uid, !newIsBookmarked);
      }
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      // Rollback on failure
      setIsBookmarked(!newIsBookmarked);
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
      case "flight": return <Plane size={14} className="text-[#2A9D8F]" />;
      case "hotel": return <Hotel size={14} className="text-[#F4A261]" />;
      case "food": return <Utensils size={14} className="text-[#E76F51]" />;
      default: return <Wallet size={14} className="text-[#264653]" />;
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    if (!window.confirm("이 게시물을 정말 삭제하시겠습니까?")) return;
    
    try {
      if (post.id) {
        await postService.deletePost(post.id);
        setIsDeleted(true);
      }
    } catch (error) {
      console.error("Failed to delete post:", error);
      alert("게시물 삭제에 실패했습니다.");
    }
  };

  if (isDeleted) return null;

  return (
    <div className="mb-4 overflow-hidden rounded-3xl bg-white shadow-sm border border-[#F1F3F5] transition-all hover:shadow-md">
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
          <div className="h-10 w-10 overflow-hidden rounded-full bg-[#F8F9FA] border border-[#F1F3F5]">
            <img src={post.user.image || DEFAULT_AVATAR} alt={post.user.name || "User"} className="h-full w-full object-cover" />
          </div>
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-[#212529]">{post.user.name || "익명 여행자"}</span>
              {post.user.group && (
                <span className="rounded-full bg-[#2A9D8F]/10 px-2 py-0.5 text-[10px] font-bold text-[#2A9D8F]">
                  {post.user.group}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium text-[#ADB5BD] block">{getFormattedDate()}</span>
          </div>
        </button>
        <div className="relative">
          <button 
            onClick={() => setShowMenu(!showMenu)} 
            className="text-[#ADB5BD] p-1.5 hover:bg-slate-50 transition-colors rounded-full"
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
              <div className="absolute right-0 top-full mt-1 w-36 rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-[#F1F3F5] py-1.5 z-20 animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                <div className="px-3 py-1.5 mb-1 text-[10px] font-bold text-[#ADB5BD] border-b border-[#F8F9FA]">
                  게시물 옵션
                </div>
                {user && post.user.uid === user.uid ? (
                  <>
                    <button 
                      onClick={() => { setShowMenu(false); alert("개발 중인 기능입니다."); /* Edit logic */ }} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-[#495057] hover:bg-[#F8F9FA] transition-colors"
                    >
                      <Edit2 size={15} className="mr-2 text-[#ADB5BD]" /> 
                      수정하기
                    </button>
                    <button 
                      onClick={handleDelete} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-[#e74c3c] hover:bg-[#e74c3c]/5 transition-colors"
                    >
                      <Trash2 size={15} className="mr-2" /> 
                      삭제하기
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { setShowMenu(false); alert("개발 중인 기능입니다."); }} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-[#495057] hover:bg-[#F8F9FA] transition-colors"
                    >
                      <EyeOff size={15} className="mr-2 text-[#ADB5BD]" /> 
                      관심 없음
                    </button>
                    <button 
                      onClick={() => { setShowMenu(false); handleBookmarkToggle(); }} 
                      className="flex w-full items-center px-4 py-2.5 text-[13px] font-semibold text-[#495057] hover:bg-[#F8F9FA] transition-colors"
                    >
                      <Bookmark 
                        size={15} 
                        className={cn("mr-2", isBookmarked ? "text-[#F4A261] fill-current" : "text-[#ADB5BD]")} 
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
        <p className="text-[15px] leading-relaxed text-[#212529] whitespace-pre-wrap">
          {post.content}
        </p>
      </div>

      {/* Image Area */}
      {post.images && post.images.length > 0 && (
        <div 
          className="relative aspect-[4/3] w-full px-4 py-2 cursor-pointer group"
          onClick={() => setLightboxIndex(0)}
        >
          <div className="h-full w-full overflow-hidden rounded-2xl bg-[#F8F9FA]">
            <img src={post.images[0]} alt="Post" className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
          {post.images.length > 1 && (
            <div className="absolute right-6 top-4 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
              +{post.images.length - 1}
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
              <span key={tag} className="text-[12px] font-bold text-[#2A9D8F]">
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
                className="flex items-center space-x-1.5 text-[12px] font-bold text-[#6C757D] hover:text-[#2A9D8F] transition-colors group cursor-pointer"
                title="지도에서 보기"
              >
                <MapPin size={14} className="text-[#2A9D8F] group-hover:scale-110 transition-transform" />
                <span className="line-clamp-1 group-hover:underline">{post.location.name}</span>
              </button>
            )}
            {expenseList.length > 0 && (
              <div className="flex items-center space-x-2">
                {expenseList.slice(0, 3).map((exp, idx) => (
                  <div key={idx} className="flex items-center space-x-1 bg-[#F8F9FA] px-2 py-1 rounded-full border border-[#F1F3F5] hover:bg-white hover:shadow-sm transition-all duration-300">
                    <span className="scale-90">{getExpenseIcon(exp.category)}</span>
                    <span className="text-[10px] font-bold text-[#495057] whitespace-nowrap">
                      {exp.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {post.totalExpense > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-[#ADB5BD] uppercase tracking-tighter mb-0.5">Total</span>
              <span className="text-[16px] font-black text-[#264653]">
                {post.totalExpense.toLocaleString()}원
              </span>
            </div>
          )}
        </div>
 
        {/* Interaction */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F8F9FA]">
          <div className="flex items-center space-x-5">
            <button 
              onClick={handleLikeToggle}
              className={cn(
                "flex items-center space-x-1.5 transition-colors group",
                isLiked ? "text-[#e74c3c]" : "text-[#6C757D] hover:text-[#e74c3c]"
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
                showComments ? "text-[#2A9D8F]" : "text-[#6C757D] hover:text-[#2A9D8F]"
              )}
            >
              <MessageCircle size={20} />
              <span className="text-xs font-bold">{commentCount}</span>
            </button>
            <button className="flex items-center space-x-1.5 text-[#6C757D] transition-colors hover:text-[#3498db]">
              <Share2 size={20} />
            </button>
            <button 
              onClick={handleBookmarkToggle}
              className={cn(
                "flex items-center space-x-1.5 transition-colors group",
                isBookmarked ? "text-[#F4A261]" : "text-[#6C757D] hover:text-[#F4A261]"
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
                    <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-100">
                      <img src={comment.user.image || DEFAULT_AVATAR} alt={comment.user.name} className="h-full w-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-text-main">{comment.user.name}</span>
                        <span className="text-[10px] text-text-sub">
                          {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ko }) : "방금 전"}
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
                <div className="h-8 w-8 flex-shrink-0 overflow-hidden rounded-full bg-gray-100 border border-gray-100">
                  <img src={user.photoURL || DEFAULT_AVATAR} alt={user.displayName || ""} className="h-full w-full object-cover" />
                </div>
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="댓글을 입력하세요..."
                    className="w-full bg-[#F8F9FA] rounded-full py-2 px-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#2A9D8F]/30 border-none placeholder:text-text-sub/50"
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#2A9D8F] disabled:text-text-sub/30 transition-colors"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2 px-4 bg-[#F8F9FA] rounded-xl">
                <p className="text-xs text-text-sub">
                  댓글을 달려면 <button onClick={() => alert("로그인이 필요합니다.")} className="text-primary font-bold">로그인</button>이 필요합니다.
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
            <img 
              src={post.images[lightboxIndex]} 
              alt={`Post Image ${lightboxIndex + 1}`} 
              className="max-h-full max-w-full object-contain drop-shadow-2xl animate-in zoom-in-95 duration-200 pointer-events-auto" 
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
    </div>
  );
};

// Placeholder for User icon if image fails
const User = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
