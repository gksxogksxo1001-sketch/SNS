"use client";

import React, { useState } from "react";
import { Users, X, Plus, Mail, Loader2, Check } from "lucide-react";
import { groupService } from "@/core/firebase/groupService";
import { auth } from "@/core/firebase/config";
import { cn } from "@/lib/utils";

interface GroupCreateProps {
  onClose: () => void;
  onSuccess: (groupId: string) => void;
}

export const GroupCreate = ({ onClose, onSuccess }: GroupCreateProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const groupId = await groupService.createGroup(user.uid, name, description, startDate, endDate);
      onSuccess(groupId);
    } catch (err: any) {
      console.error("Failed to create group:", err);
      setError(err.message || "그룹 생성 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-bg-base w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="px-8 pt-8 pb-6 flex justify-between items-center bg-gradient-to-r from-primary to-primary/80 text-white">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users size={24} />
              새 여행 그룹 만들기
            </h2>
            <p className="text-white/70 text-sm mt-1">동행자들과 함께 여행을 기록하세요</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-text-main ml-1">그룹 이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 2026 제주도 우정여행"
              className="w-full px-5 py-4 bg-bg-alt border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none text-text-main"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-text-main ml-1">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이번 여행의 목적이나 간단한 설명을 적어주세요"
              className="w-full px-5 py-4 bg-bg-alt border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none resize-none h-20 text-text-main"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main ml-1">가는 날</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-5 py-3.5 bg-bg-alt border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none text-text-main"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-text-main ml-1">오는 날</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full px-5 py-3.5 bg-bg-alt border-none rounded-2xl focus:ring-2 focus:ring-primary transition-all outline-none text-text-main"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-error/10 text-error text-sm rounded-xl border border-error/20 animate-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold text-text-sub bg-bg-alt rounded-2xl hover:bg-border-base transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className={cn(
                "flex-[2] py-4 font-bold text-white rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2",
                isSubmitting || !name.trim() 
                  ? "bg-text-sub/30 cursor-not-allowed" 
                  : "bg-gradient-to-r from-primary to-primary/80 hover:scale-[1.02] active:scale-95 shadow-primary/20"
              )}
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  <Plus size={20} />
                  그룹 생성하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
