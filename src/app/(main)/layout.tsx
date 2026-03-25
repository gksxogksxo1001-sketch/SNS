"use client";

import React from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { SideNav } from "@/components/layout/SideNav";
import { RightPanel } from "@/components/layout/RightPanel";
import { usePathname } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMapPage = pathname === "/map";
  const isChatRoom = pathname.startsWith("/messages/");

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* PC 사이드바 */}
      <SideNav />

      {/* PC 우측 패널 */}
      {!isMapPage && !isChatRoom && <RightPanel />}

      {/* 메인 콘텐츠: 사이드바(64px) ~ 우측패널(288px) 사이에서 가운데 정렬 */}
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
