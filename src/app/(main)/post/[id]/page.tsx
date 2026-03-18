"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { postService } from "@/core/firebase/postService";
import { Post } from "@/types/post";
import { PostCard } from "@/components/features/feed/PostCard";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";

export default function PostDetailPage() {
  const params = useParams();
  const postId = params?.id as string;
  const router = useRouter();
  
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    setIsLoading(true);
    try {
      const data = await postService.getPostById(postId);
      if (data) {
        setPost(data);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to fetch post:", err);
      setError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-4 bg-white">
        <Loader2 className="animate-spin text-primary" size={32} />
        <p className="text-sm font-medium text-text-sub">게시물을 불러오는 중...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center space-y-6 bg-white px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-red-50 flex items-center justify-center text-red-500">
          <AlertCircle size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">게시물을 찾을 수 없습니다</h2>
          <p className="text-sm text-text-sub">게시물이 삭제되었거나 권한이 없을 수 있습니다.</p>
        </div>
        <button 
          onClick={() => router.back()}
          className="bg-primary text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-primary/20"
        >
          뒤로 가기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 flex h-14 items-center bg-white px-4 border-b">
        <button onClick={() => router.back()} className="mr-4 p-1 text-text-main hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">게시물</h1>
      </header>

      <main className="p-4">
        <PostCard post={post} />
      </main>
    </div>
  );
}
