"use client";

import React, { useEffect, useState } from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { RightPanel } from "@/components/layout/RightPanel";
import { usePathname, useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth"; // Firebase Auth 임포트
// import { auth } from "@/lib/firebase"; // 만약 별도 설정 파일이 있다면 이걸 사용하세요

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = getAuth(); // Firebase 인증 객체 가져오기
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const isMapPage = pathname === "/map";
  const isChatRoom = pathname.startsWith("/messages/");

  useEffect(() => {
    // 1. 인증 상태 관찰자 설정
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // 2. 로그인이 필요한 페이지인데 사용자가 없는 경우 체크
      // (메인 레이아웃이 로그인/회원가입 페이지까지 감싸고 있다면 예외처리가 필요합니다)
      const isAuthPage = pathname === "/login" || pathname === "/signup";

      if (!user && !isAuthPage) {
        // 로그인 안 됨 -> 로그인 페이지로 튕겨내기
        router.replace("/login");
      } else {
        // 로그인 됨 또는 로그인 페이지임 -> 콘텐츠 보여주기
        setIsAuthChecking(false);
      }
    });

    return () => unsubscribe(); // 언마운트 시 정리
  }, [auth, pathname, router]);

  // 3. 인증 확인 중일 때 화면 깜빡임 방지 (화이트아웃 방지용 로딩)
  if (isAuthChecking && pathname !== "/login" && pathname !== "/signup") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-gray-500 animate-pulse">인증 확인 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* PC 사이드바 */}
      <SideNav />

      {/* PC 우측 패널 */}
      {!isMapPage && !isChatRoom && <RightPanel />}

      {/* 메인 콘텐츠 */}
      <main
        className={`
          w-full
          md:pl-16
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

      {/* 모바일 하단 탭 */}
      {!isChatRoom && <BottomNav />}
    </div>
  );
}