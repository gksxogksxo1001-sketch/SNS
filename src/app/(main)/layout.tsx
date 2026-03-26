"use client";

import React, { useEffect, useState } from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { RightPanel } from "@/components/layout/RightPanel";
import { usePathname, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- 1. 초간단 모달 컴포넌트 (파일 안에 같이 두셔도 됩니다) ---
const AuthModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in duration-200">
        <h3 className="text-lg font-bold text-gray-900">로그인 필요</h3>
        <p className="mt-2 text-sm text-gray-600">세션이 만료되었습니다. 다시 로그인해주세요.</p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          확인
        </button>
      </div>
    </div>
  );
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth();
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // 모달 상태 추가
  const [showModal, setShowModal] = useState(false);

  const isMapPage = pathname === "/map";
  const isChatRoom = pathname.startsWith("/messages/");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      if (!user && !isAuthPage) {
        // 바로 리다이렉트 하지 않고 모달을 띄움
        setShowModal(true);
      } else {
        setIsAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [auth, pathname, router]);

  // 모달 확인 버튼 눌렀을 때 동작
  const handleModalClose = () => {
    setShowModal(false);
    router.replace("/login");
  };

  if (isAuthChecking && pathname !== "/login" && pathname !== "/signup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-500 animate-pulse">인증 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* 2. 모달 배치 */}
      <AuthModal isOpen={showModal} onClose={handleModalClose} />

      <SideNav />
      {!isMapPage && !isChatRoom && <RightPanel />}

      <main
        className={`
          w-full md:pl-16
          ${!isMapPage && !isChatRoom ? "xl:pr-72" : ""}
          ${isChatRoom ? "" : "pb-20 md:pb-0"}
          flex justify-center
        `}
      >
        <div className={`
          w-full
          ${isMapPage
            ? "h-[calc(100vh-0px)]"
            : "max-w-2xl min-h-screen bg-white border-x border-[#F1F3F5]"
          }
        `}>
          {children}
        </div>
      </main>

      {!isChatRoom && <BottomNav />}
    </div>
  );
}