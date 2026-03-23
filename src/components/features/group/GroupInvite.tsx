"use client";

import React, { useState } from "react";
import { Mail, Plus, X, Loader2, Check, AlertCircle } from "lucide-react";
import { groupService } from "@/core/firebase/groupService";
import { auth } from "@/core/firebase/config";
import { cn } from "@/lib/utils";

interface GroupInviteProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

export const GroupInvite = ({ groupId, groupName, onClose }: GroupInviteProps) => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;

    const user = auth.currentUser;
    if (!user) return;

    setIsSubmitting(true);
    setStatus('idle');
    
    try {
      await groupService.inviteMemberByEmail(groupId, email, user.uid);
      setStatus('success');
      setMessage(`${email}님에게 초대 알림을 보냈습니다.`);
      setEmail("");
      // Briefly show success then close or reset
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      console.error("Failed to invite member:", err);
      setStatus('error');
      setMessage(err.message || "초대 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 bg-slate-50 rounded-[28px] border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <Mail size={18} className="text-[#2A9D8F]" />
          멤버 초대하기
        </h4>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg text-slate-400 transition-colors">
          <X size={18} />
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-4">
        함께 여행할 친구의 이메일을 입력하세요. <br/>
        가입된 사용자라면 실시간 알림이 발송됩니다.
      </p>

      <form onSubmit={handleInvite} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            disabled={status === 'success'}
            className={cn(
              "w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2A9D8F] outline-none transition-all",
              status === 'success' && "border-emerald-200 bg-emerald-50 text-emerald-700"
            )}
            required
          />
          {status === 'success' && (
            <Check size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" />
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !email.trim() || status === 'success'}
          className={cn(
            "px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2",
            isSubmitting || !email.trim() || status === 'success'
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-[#2A9D8F] text-white hover:bg-[#264653] shadow-md shadow-[#2A9D8F]/10 active:scale-95"
          )}
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          초대
        </button>
      </form>

      {status === 'error' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-rose-500 font-medium animate-in slide-in-from-top-1">
          <AlertCircle size={14} />
          {message}
        </div>
      )}
      
      {status === 'success' && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-600 font-medium animate-in slide-in-from-top-1">
          <Check size={14} />
          {message}
        </div>
      )}
    </div>
  );
};
