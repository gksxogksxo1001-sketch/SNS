"use client";

import React, { useState, useEffect } from "react";
import { X, User, Trash2, Settings, ChevronRight, UserPlus as LogPlus } from "lucide-react";
import { accountManager, StoredAccount } from "@/core/auth/accountManager";
import { AuthService } from "@/core/services/AuthService";
import { userService } from "@/core/firebase/userService";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ProfileEditModal } from "../profile/ProfileEditModal";
import { UserProfile } from "@/types/user";
import { useModalStore } from "@/store/useModalStore";

interface AccountSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  currentUid?: string;
}

export function AccountSwitcher({ isOpen, onClose, currentUid }: AccountSwitcherProps) {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null);
  const [manageUid, setManageUid] = useState<string | null>(null);
  const { showAlert, showConfirm } = useModalStore();
  const router = useRouter();

  const loadAccounts = () => {
    setAccounts(accountManager.getAccounts());
  };

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    } else {
      setManageUid(null);
    }
  }, [isOpen]);

  const handleEdit = async (uid: string) => {
    try {
      const profile = await userService.getUserProfile(uid);
      if (profile) {
        setEditingProfile(profile);
        setIsEditModalOpen(true);
        setManageUid(null);
      }
    } catch (error) {
      console.error("Failed to load profile for editing:", error);
    }
  };

  const handleUpdateComplete = () => {
    loadAccounts(); // Refresh list to show new nickname/info
    // In a real app, we might need to refresh the whole page state if nickname changed
    window.location.reload(); 
  };

  const handleWithdrawal = async (uid: string) => {
    showConfirm({
      title: "회원 탈퇴",
      message: "정말 탈퇴하시겠습니까? 모든 정보가 삭제되며 복구할 수 없습니다.",
      confirmText: "탈퇴하기",
      isDanger: true,
      onConfirm: async () => {
        try {
          await AuthService.deleteUserAccount(uid);
          onClose();
          router.push("/login"); // Redirect after withdrawal
          showAlert({ title: "탈퇴 완료", message: "계정이 정상적으로 삭제되었습니다." });
        } catch (error: any) {
          showAlert({ title: "오류", message: error.message });
        }
      }
    });
  };

  const handleSwitch = async (acc: StoredAccount) => {
    if (acc.uid === currentUid) return;
    
    try {
      await AuthService.logOut();
      onClose();
      
      // Navigate to login with pre-fill info
      const targetId = acc.loginId || acc.email;
      if (targetId) {
        router.push(`/login?loginId=${encodeURIComponent(targetId)}`);
      } else {
        router.push("/login");
      }
    } catch (error) {
      console.error("Failed to logout for switch:", error);
    }
  };

  const handleRemove = (e: React.MouseEvent, uid: string) => {
    e.stopPropagation();
    
    showConfirm({
      title: "기록 삭제",
      message: "이 기기에서 해당 계정의 로그인 기록을 삭제하시겠습니까?",
      confirmText: "삭제",
      isDanger: true,
      onConfirm: async () => {
        accountManager.removeAccount(uid);
        setAccounts(accountManager.getAccounts());
        
        // If current user is removed, logout and redirect
        if (uid === currentUid) {
          await AuthService.logOut();
          onClose();
          router.push("/login");
          showAlert({ title: "로그아웃", message: "현재 사용 중인 계정의 기록이 삭제되어 로그아웃되었습니다." });
        }
      }
    });
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
                onClick={() => handleSwitch(acc)}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-2xl border-2 transition-all cursor-pointer",
                  acc.uid === currentUid 
                    ? "border-primary bg-primary/5 shadow-sm" 
                    : "border-transparent hover:border-border-base hover:bg-bg-alt text-text-sub"
                )}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative w-11 h-11 rounded-full overflow-hidden bg-bg-alt border border-bg-base shadow-sm">
                    {acc.photoURL ? (
                      <Image 
                        src={acc.photoURL} 
                        alt="" 
                        fill
                        sizes="44px"
                        className="w-full h-full object-cover" 
                      />
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

                <div className="flex items-center space-x-1 opacity-100 group-hover:opacity-100 transition-opacity">
                  {acc.uid === currentUid && (
                    <div className="relative">
                      {manageUid === acc.uid ? (
                        <div className="absolute right-0 bottom-0 mb-10 w-24 bg-bg-base/95 backdrop-blur-md rounded-2xl border border-border-base shadow-xl py-1 animate-in zoom-in-95 fill-mode-both duration-200 z-10 overflow-hidden">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleEdit(acc.uid); }}
                            className="w-full px-4 py-2.5 text-xs font-black text-primary hover:bg-primary/5 transition-colors text-left flex items-center justify-between"
                          >
                            <span>수정</span>
                            <Settings size={12} />
                          </button>
                          <div className="h-px bg-border-base/50 mx-2"></div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleWithdrawal(acc.uid); }}
                            className="w-full px-4 py-2.5 text-xs font-black text-error hover:bg-error/5 transition-colors text-left flex items-center justify-between"
                          >
                            <span>탈퇴</span>
                            <Trash2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setManageUid(null); }}
                            className="w-full px-4 py-1.5 text-[10px] font-bold text-text-sub hover:bg-bg-alt flex items-center justify-center border-t border-border-base/50"
                          >
                            닫기
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => { e.stopPropagation(); setManageUid(acc.uid); }}
                          className="p-2 text-text-sub/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="계정 관리"
                        >
                          <Settings size={16} />
                        </button>
                      )}
                    </div>
                  )}
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

      {/* Profile Edit Modal */}
      {editingProfile && (
        <ProfileEditModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          profile={editingProfile}
          onUpdate={handleUpdateComplete}
        />
      )}
    </div>
  );
}
