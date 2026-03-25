"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, Camera, Image as ImageIcon, Send, X, Loader2, Globe, Users, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/core/firebase/config";
import { storyService } from "@/core/firebase/storyService";

export default function StoryCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [visibility, setVisibility] = useState<"friends" | "close_friends">("friends");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke old preview if exists
    if (preview) URL.revokeObjectURL(preview);

    setSelectedFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const user = auth.currentUser;
      const userData = {
        name: user.displayName || "User",
        image: user.photoURL || ""
      };

      await storyService.uploadStory(user.uid, selectedFile, userData, visibility);

      // Success - go back to feed
      router.push("/feed");
    } catch (error) {
      console.error("Story upload failed:", error);
      alert("스토리 업로드에 실패했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] text-[#212529] p-0">
      {/* Header */}
      <header className="flex items-center justify-between p-5 z-10 sticky top-0 bg-white/80 backdrop-blur-md border-b">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={28} className="text-[#495057]" />
        </button>
        <h1 className="text-lg font-black tracking-tight">새 스토리</h1>
        <div className="w-10"></div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 space-y-8">
        {!preview ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center bg-white rounded-[40px] border border-gray-100 shadow-sm border-dashed p-10">
            <div className="w-24 h-24 rounded-[32px] bg-[#F1F3F5] flex items-center justify-center text-[#ADB5BD]">
              <Camera size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#212529]">일상을 공유하세요</h2>
              <p className="text-[#868E96] text-sm font-medium">당신의 팔로워들과 24시간 동안<br />소중한 순간을 공유할 수 있습니다.</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-[#2A9D8F] text-white px-10 py-4 rounded-2xl font-black flex items-center space-x-2 shadow-lg shadow-[#2A9D8F]/20 active:scale-95 transition-all"
            >
              <ImageIcon size={20} />
              <span>사진 선택하기</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-6">
            <div className="relative aspect-[9/16] w-full max-w-sm mx-auto rounded-[40px] overflow-hidden shadow-2xl border-4 border-white">
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              <button 
                onClick={removeFile}
                className="absolute top-5 right-5 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors border border-white/20"
              >
                <X size={20} />
              </button>
            </div>

            {/* Privacy Section */}
            <div className="space-y-4 pt-4">
              <p className="text-xs font-black text-[#495057] ml-1 uppercase tracking-widest">공유 대상</p>
              <div className="flex p-1.5 bg-white rounded-3xl border border-gray-200 shadow-sm">
                {[
                  { id: "friends", label: "친구만", icon: Users },
                  { id: "close_friends", label: "친한친구", icon: Star },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setVisibility(item.id as any)}
                    className={`flex-1 flex items-center justify-center space-x-2 py-4 rounded-[22px] text-sm font-black transition-all ${
                      visibility === item.id 
                        ? (item.id === "close_friends" 
                            ? "bg-[#2ECC71] text-white shadow-md shadow-[#2ECC71]/20" 
                            : "bg-[#212529] text-white shadow-md shadow-black/20")
                        : "text-[#ADB5BD] hover:text-[#495057]"
                    }`}
                  >
                    <item.icon size={16} className={visibility === item.id && item.id === "close_friends" ? "fill-current" : ""} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-4">
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-[#2A9D8F] text-white py-5 rounded-[26px] font-black flex items-center justify-center space-x-2 shadow-xl shadow-[#2A9D8F]/20 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>업로드 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>스토리 공유하기</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
