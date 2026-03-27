"use client";

import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Check, Loader2, User as UserIcon } from "lucide-react";
import { userService } from "@/core/firebase/userService";
import { UserProfile } from "@/types/user";
import Image from "next/image";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { DEFAULT_AVATAR } from "@/core/constants";
import { useModalStore } from "@/store/useModalStore";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdate: () => void;
}

export function ProfileEditModal({ isOpen, onClose, profile, onUpdate }: ProfileEditModalProps) {
  const { showAlert } = useModalStore();
  const [nickname, setNickname] = useState(profile.nickname);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || DEFAULT_AVATAR);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setNickname(profile.nickname);
      setAvatarUrl(profile.avatarUrl || DEFAULT_AVATAR);
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [isOpen, profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Update Profile Photo if selected
      if (selectedFile) {
        await userService.updateProfilePhoto(profile.uid, selectedFile);
      }

      // 2. Update Nickname if changed
      if (nickname !== profile.nickname) {
        await userService.updateNickname(profile.uid, nickname);
      }

      onUpdate();
      onClose();
      showAlert({
        title: "수정 완료",
        message: "프로필 정보가 성공적으로 변경되었습니다.",
      });
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      showAlert({
        title: "오류 발생",
        message: "프로필 수정 중 문제가 발생했습니다. 다시 시도해주세요.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
      <div className="w-full max-w-[400px] bg-bg-base rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-border-base flex flex-col">
        <div className="p-6 border-b border-border-base flex items-center justify-between bg-bg-base sticky top-0 z-10">
          <h2 className="text-xl font-black text-text-main">프로필 수정</h2>
          <button onClick={onClose} className="p-2 hover:bg-bg-alt rounded-full text-text-sub transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8 overflow-y-auto">
          {/* Avatar Edit */}
          <div className="flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-bg-alt shadow-lg relative bg-bg-alt">
                <Image
                  src={previewUrl || avatarUrl}
                  alt="Profile"
                  fill
                  sizes="112px"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Camera className="text-white opacity-80" size={28} />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-primary text-white p-2 rounded-full border-4 border-bg-base shadow-md group-hover:scale-110 transition-transform">
                <Camera size={16} />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
            <p className="mt-4 text-xs font-bold text-text-sub">이미지를 눌러 사진을 변경하세요</p>
          </div>

          {/* Nickname Input */}
          <div className="space-y-3">
            <label className="text-sm font-black text-text-main px-1">닉네임</label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="멋진 닉네임을 입력하세요"
              maxLength={20}
              className="bg-bg-alt border-none h-14 rounded-2xl text-base font-bold px-5 focus:ring-2 focus:ring-primary/20"
              required
            />
            <p className="text-[11px] text-text-sub px-1">활동하시는 동안 다른 사람들에게 보여질 이름입니다.</p>
          </div>

          {/* User Info (Read only) */}
          <div className="bg-bg-alt/50 rounded-2xl p-4 space-y-2 border border-border-base/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-sub font-bold">이메일</span>
              <span className="text-text-main font-bold">{profile.email}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-text-sub font-bold">가입일</span>
              <span className="text-text-main font-bold">
                {profile.createdAt?.toDate?.() ? new Date(profile.createdAt.toDate()).toLocaleDateString() : "정보 없음"}
              </span>
            </div>
          </div>
        </form>

        <div className="p-6 pt-0 bg-bg-base">
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full h-14 rounded-2xl text-base font-black shadow-lg shadow-primary/20"
            isLoading={isSubmitting}
          >
            변경사항 저장하기
          </Button>
        </div>
      </div>
    </div>
  );
}
