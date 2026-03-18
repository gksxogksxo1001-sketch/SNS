"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PlusSquare, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "피드", href: "/feed" },
  { icon: Map, label: "지도", href: "/map" },
  { icon: PlusSquare, label: "작성", href: "/post/create" },
  { icon: Wallet, label: "정산", href: "/settlement" },
  { icon: User, label: "프로필", href: "/profile" },
];

export const BottomNav = () => {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t bg-white px-2 pb-safe shadow-[0_-4px_6px_rgba(0,0,0,0.02)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-colors",
              isActive ? "text-[#2A9D8F]" : "text-[#6C757D] hover:text-[#2A9D8F]"
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
