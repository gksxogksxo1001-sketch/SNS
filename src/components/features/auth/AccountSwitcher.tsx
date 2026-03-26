"use client";

import React, { useState, useEffect } from "react";
import { X, User, Trash2, Settings, ChevronRight, UserPlus as LogPlus } from "lucide-react";
import { accountManager, StoredAccount } from "@/core/auth/accountManager";
import { AuthService } from "@/core/services/AuthService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AccountSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  currentUid?: string;
}

export function AccountSwitcher({ isOpen, onClose, currentUid }: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      setAccounts(accountManager.getAccounts());
    }
  }, [isOpen]);

  const handleSwitch = async (uid: string) => {
    if (uid === currentUid) return;
    
    // In a real app, switching might require re-auth if token is expired.
    // For this prototype, we'll log out and redirect to login, 
    // but the email can be pre-filled or we can assume a simplified "Switch" for demo.
    try {
      await AuthService.logOut();
      onClose();
      router.push("/login"); // Pre-filling can be added with query params
    } catch (error) {
      console.error("Failed to logout for switch:", error);
    }
  };

  const handleRemove = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    accountManager.removeAccount(uid);
    setAccounts(accountManager.getAccounts());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-[360px] bg-bg-base rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-border-base">
        <div className="p-6 border-b border-border-base flex items-center justify-between">
          <h2 className="text-lg font-black text-text-main">계정 관리</h2>
          <button onClick={onClose} className="p-2 hover:bg-bg-alt rounded-full text-text-sub transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
          {accounts.length > 0 ? (
            accounts.map((acc) => (
              <div 
                key={acc.uid}
                onClick={() => handleSwitch(acc.uid)}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer",
                  acc.uid === currentUid 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-transparent hover:border-border-base hover:bg-bg-alt text-text-sub"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-bg-alt border border-bg-base shadow-sm">
                    {acc.photoURL ? (
                      <img src={acc.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className={cn("text-sm font-black", acc.uid === currentUid ? "text-primary" : "text-text-main")}>
                      {acc.displayName || "여행자"}
                      {acc.uid === currentUid && <span className="ml-1.5 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded-md">현재</span>}
                    </span>
                    <span className="text-[11px] font-bold text-text-sub">{acc.email || "이메일 정보 없음"}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => handleRemove(e, acc.uid)}
                    className="p-2 text-text-sub/40 hover:text-error hover:bg-error/10 rounded-xl transition-all"
                    title="기록 삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronRight size={16} className="text-text-sub/40" />
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center space-y-3">
              <div className="w-14 h-14 bg-bg-alt rounded-full flex items-center justify-center mx-auto text-text-sub/20">
                <User size={28} />
              </div>
              <p className="text-xs font-bold text-text-sub">저장된 계정이 없습니다.</p>
            </div>
          )}
        </div>

        <div className="p-4 bg-bg-alt/50 border-t border-border-base">
          <button 
            onClick={() => router.push("/login")}
            className="w-full flex items-center justify-center space-x-2 py-4 bg-bg-base border-2 border-border-base text-text-main rounded-2xl text-sm font-black hover:border-primary/50 hover:bg-bg-alt transition-all active:scale-[0.98]"
          >
            <LogPlus size={18} className="text-primary" />
            <span>다른 계정으로 로그인</span>
          </button>
        </div>
      </div>
    </div>
  );
}
