"use client";

import React, { useEffect, useState } from "react";
import "@/lib/firebase";
import { BottomNav } from "@/components/common/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { RightPanel } from "@/components/layout/RightPanel";
import { usePathname, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// --- 모달 컴포넌트 (디자인 강화) ---
const AuthModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-black/5 animate-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-gray-900">로그인이 필요합니다</h3>
          <p className="mt-2 text-sm text-gray-500">여행의 순간을 기록하려면<br />먼저 로그인을 해주세요.</p>
          <button
            onClick={onClose}
            className="mt-8 w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth();

  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const isMapPage = pathname === "/map";
  const isChatRoom = pathname.startsWith("/messages/");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      if (!user && !isAuthPage) {
        // [중요] 리다이렉트 하지 않고 모달만 띄움
        setShowModal(true);
        setIsAuthChecking(false); // 로딩은 풀어줘야 모달이 보임
      } else {
        setShowModal(false);
        setIsAuthChecking(false);
      }
    });

    return () => unsubscribe();
  }, [auth, pathname]);

  const handleModalClose = () => {
    setShowModal(false);
    router.replace("/login"); // 확인을 누를 때만 이동!
  };

  // 인증 확인 중일 때 (모달이 뜨기 전 잠깐의 찰나)
  if (isAuthChecking && !showModal && pathname !== "/login" && pathname !== "/signup") {
    return <div className="min-h-screen bg-white" />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <AuthModal isOpen={showModal} onClose={handleModalClose} />

      <SideNav />
      {!isMapPage && !isChatRoom && <RightPanel />}

      <main className={`w-full md:pl-16 ${!isMapPage && !isChatRoom ? "xl:pr-72" : ""} ${isChatRoom ? "" : "pb-20 md:pb-0"} flex justify-center`}>
        <div className={`w-full ${isMapPage ? "h-[calc(100vh-0px)]" : "max-w-2xl min-h-screen bg-white border-x border-[#F1F3F5]"}`}>
          {children}
        </div>
      </main>

      {!isChatRoom && <BottomNav />}
    </div>
  );
}