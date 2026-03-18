"use client";

import React, { useState, useRef } from "react";
import { ChevronLeft, Camera, Image as ImageIcon, Send, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/core/firebase/config";
import { storyService } from "@/core/firebase/storyService";

export default function StoryCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setSelectedFiles(prev => [...prev, ...files]);
    
    // Create previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !auth.currentUser) return;

    setIsUploading(true);
    try {
      const user = auth.currentUser;
      const userData = {
        name: user.displayName || "User",
        image: user.photoURL || ""
      };

      // Upload each story
      await Promise.all(selectedFiles.map(file => 
        storyService.uploadStory(user.uid, file, userData)
      ));

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
    <div className="flex flex-col min-h-screen bg-black text-white p-0">
      {/* Header */}
      <header className="flex items-center justify-between p-5 z-10 sticky top-0 bg-gradient-to-b from-black/50 to-transparent">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-lg font-bold">스토리 만들기</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-transparent to-black/80">
        {previews.length === 0 ? (
          <div className="flex flex-col items-center space-y-6 text-center">
            <div className="w-24 h-24 rounded-full bg-white/10 flex items-center justify-center border-2 border-dashed border-white/30">
              <Camera size={40} className="text-white/50" />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">특별한 순간을 공유하세요</h2>
              <p className="text-white/60 text-sm">24시간 동안 소중한 사람들과 소통할 수 있습니다.</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 bg-white text-black px-8 py-4 rounded-2xl font-black flex items-center space-x-2 active:scale-95 transition-transform"
            >
              <ImageIcon size={20} />
              <span>사진/동영상 선택</span>
            </button>
          </div>
        ) : (
          <div className="w-full h-full max-w-md flex flex-col">
            {/* Multi Preview Grid */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 px-2 custom-scrollbar">
              {previews.map((preview, idx) => (
                <div key={idx} className="relative aspect-[9/16] w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                  <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => removeFile(idx)}
                    className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <X size={20} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                    <span className="text-xs font-bold text-white/80">{idx + 1}번째 스토리</span>
                  </div>
                </div>
              ))}
              
              {/* Add More Button */}
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-10 border-2 border-dashed border-white/20 rounded-3xl flex flex-col items-center justify-center space-y-2 hover:bg-white/5 transition-colors"
              >
                <Plus size={24} className="text-white/40" />
                <span className="text-sm font-bold text-white/40">스토리 더 추가하기</span>
              </button>
            </div>

            {/* Bottom Action Bar */}
            <div className="p-4 bg-black/80 backdrop-blur-lg border-t border-white/10 mt-auto">
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full bg-[#2A9D8F] text-white py-4 rounded-2xl font-black flex items-center justify-center space-x-2 shadow-lg shadow-[#2A9D8F]/20 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>업로드 중...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>{selectedFiles.length}개의 스토리 공유하기</span>
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
        multiple
        accept="image/*"
        className="hidden"
      />

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}

// Fixed missing Plus icon
import { Plus } from "lucide-react";
