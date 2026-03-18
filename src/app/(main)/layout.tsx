"use client";

import React from "react";
import { BottomNav } from "@/components/common/BottomNav";
import { usePathname } from "next/navigation";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMapPage = pathname === "/map";

  return (
    <main className="min-h-screen bg-[#F8F9FA] pb-20">
      <div className={isMapPage ? "w-full h-[calc(100vh-80px)]" : "mx-auto max-w-2xl"}>
        {children}
      </div>
      <BottomNav />
    </main>
  );
}
