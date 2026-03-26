"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PlusSquare, Wallet, User, Users, Bell, Send, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/core/hooks/useAuth";
import { notificationService } from "@/core/firebase/notificationService";
import { messageService } from "@/core/firebase/messageService";
import { DEFAULT_AVATAR } from "@/core/constants";
import Image from "next/image";

const navItems = [
  { icon: Home, label: "피드", href: "/feed" },
  { icon: Bell, label: "알림", href: "/notifications" },
  { icon: Send, label: "메시지", href: "/messages", iconClass: "-rotate-12" },
  { icon: Map, label: "지도", href: "/map" },
  { icon: PlusSquare, label: "글 작성", href: "/post/create" },
  { icon: Users, label: "그룹", href: "/groups" },
  { icon: Wallet, label: "정산", href: "/settlement" },
  { icon: User, label: "프로필", href: "/profile" },
];

const DRAWER_WIDTH = 260;

export const SideNav = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  // Drawer state (for mobile + explicit open)
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Touch drag state
  const dragging = useRef(false);
  const startX = useRef(0);
  const [dragX, setDragX] = useState(-DRAWER_WIDTH);

  useEffect(() => {
    if (!user) return;
    const unsubNotif = notificationService.subscribeToNotifications(user.uid, (notifications) => {
      setUnreadNotifCount(notifications.filter(n => !n.isRead).length);
    });
    const unsubMsg = messageService.subscribeToTotalUnreadCount(user.uid, (count: number) => {
      setUnreadMsgCount(count);
    });
    return () => { unsubNotif(); unsubMsg(); };
  }, [user]);

  // Touch drag from left edge
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!drawerOpen && touch.clientX < 30) {
        startX.current = touch.clientX;
        dragging.current = true;
        setDragX(-DRAWER_WIDTH);
      } else if (drawerOpen) {
        startX.current = touch.clientX;
        dragging.current = true;
        setDragX(0);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return;
      const touch = e.touches[0];
      const diff = touch.clientX - startX.current;
      const base = drawerOpen ? 0 : -DRAWER_WIDTH;
      setDragX(Math.min(0, Math.max(-DRAWER_WIDTH, base + diff)));
    };
    const onTouchEnd = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (dragX > -DRAWER_WIDTH / 2) {
        setDrawerOpen(true);
        setDragX(0);
      } else {
        setDrawerOpen(false);
        setDragX(-DRAWER_WIDTH);
      }
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [drawerOpen, dragX]);

  // Close drawer on route change
  useEffect(() => {
    setDrawerOpen(false);
    setDragX(-DRAWER_WIDTH);
  }, [pathname]);

  const openDrawer = () => {
    setDrawerOpen(true);
    setDragX(0);
  };
  const closeDrawer = () => {
    setDrawerOpen(false);
    setDragX(-DRAWER_WIDTH);
  };

  const getBadge = (href: string) => {
    if (href === "/notifications" && unreadNotifCount > 0) return unreadNotifCount;
    if (href === "/messages" && unreadMsgCount > 0) return unreadMsgCount;
    return null;
  };

  // 내비게이션 아이템 렌더
  const NavItem = ({ item, showLabel, onClick }: { item: typeof navItems[0]; showLabel: boolean; onClick?: () => void }) => {
    const isActive = pathname === item.href || (item.href !== "/feed" && pathname.startsWith(item.href));
    const Icon = item.icon;
    const badge = getBadge(item.href);

    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "relative flex items-center gap-4 px-3 py-3 rounded-2xl font-medium group overflow-hidden transition-all duration-200",
          isActive ? "bg-primary/10 text-primary" : "text-text-main hover:bg-primary/5 hover:text-primary"
        )}
      >
        {/* 활성 사이드바 */}
        {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-full" />}

        {/* 아이콘 */}
        <div className={cn(
          "relative flex-shrink-0 transition-transform duration-200",
          !isActive && "group-hover:scale-110"
        )}>
          <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={item.iconClass} />
          {badge && (
            <span className="absolute -right-1.5 -top-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-error text-[8px] font-bold text-white">
              {badge >= 10 ? "10+" : badge}
            </span>
          )}
        </div>

        {/* 레이블 */}
        {showLabel && (
          <span className="text-[15px] transition-all duration-200 group-hover:font-semibold">
            {item.label}
          </span>
        )}
      </Link>
    );
  };

  const isDrawerActuallyOpen = drawerOpen || dragX > -DRAWER_WIDTH;
  const openFraction = Math.max(0, Math.min(1, (dragX + DRAWER_WIDTH) / DRAWER_WIDTH));

  return (
    <>
      {/* ───── PC 고정 사이드바 (md 이상에서 보임) ───── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full z-50 border-r border-border-base bg-bg-base py-6 transition-all duration-200 overflow-hidden"
        style={{ width: "64px" }}
      >
        {/* 로고 / 열기 버튼 */}
        <div className="mb-6 flex justify-center px-1">
          <button
            onClick={openDrawer}
            className="flex flex-col items-center gap-0.5 group"
            title="메뉴 열기"
          >
            <span className="text-xl font-black text-primary group-hover:opacity-70 transition-opacity">H</span>
            <ChevronRight size={12} className="text-text-sub group-hover:text-primary transition-colors" />
          </button>
        </div>

        {/* 아이콘만 */}
        <nav className="flex flex-col gap-1 flex-1 px-2">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} showLabel={false} />
          ))}
        </nav>

        {user && (
          <div className="px-2 mt-4">
            <button onClick={openDrawer} className="relative w-full flex justify-center py-1">
              <div className="relative w-9 h-9 rounded-full overflow-hidden border border-border-base hover:scale-105 transition-transform">
                <Image 
                  src={user.photoURL || DEFAULT_AVATAR} 
                  alt="profile" 
                  fill
                  sizes="36px"
                  className="object-cover" 
                />
              </div>
            </button>
          </div>
        )}
      </aside>

      {/* ───── 드로어 백드롭 ───── */}
      <div
        className={cn(
          "fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300",
          isDrawerActuallyOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        style={dragging.current ? { opacity: openFraction, transition: "none" } : undefined}
        onClick={closeDrawer}
      />

      {/* ───── 드로어 패널 ───── */}
      <aside
        className="fixed top-0 left-0 h-full z-[70] bg-bg-base flex flex-col px-4 py-6 shadow-2xl"
        style={{
          width: DRAWER_WIDTH,
          transform: dragging.current
            ? `translateX(${dragX}px)`
            : `translateX(${drawerOpen ? 0 : -DRAWER_WIDTH}px)`,
          transition: dragging.current ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <span className="text-2xl font-black text-primary">HANS</span>
          <button onClick={closeDrawer} className="p-1.5 rounded-full hover:bg-bg-alt transition-colors">
            <X size={20} className="text-text-sub" />
          </button>
        </div>

        {/* 내비게이션 */}
        <nav className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} showLabel={true} onClick={closeDrawer} />
          ))}
        </nav>

        {/* 사용자 프로필 */}
        {user && (
          <Link
            href="/profile"
            onClick={closeDrawer}
            className="group flex items-center gap-3 px-3 py-3 rounded-2xl mt-4 transition-all duration-200 hover:bg-bg-alt"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0 border border-border-base group-hover:scale-105 transition-transform duration-200">
              <Image
                src={user.photoURL || DEFAULT_AVATAR}
                alt="profile"
                fill
                sizes="36px"
                className="object-cover"
              />
            </div>
            <div className="overflow-hidden">
              <p className="text-[13px] font-bold text-text-main truncate">{user.displayName || "사용자"}</p>
              <p className="text-[11px] text-text-sub truncate">{user.email}</p>
            </div>
          </Link>
        )}
      </aside>

      {/* ───── 모바일 전용: 좌측 엣지 드래그 힌트 탭 ───── */}
      <div
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[55] md:hidden"
        style={{ width: 4, height: 48, background: "rgba(var(--primary-rgb), 0.3)", borderRadius: "0 4px 4px 0" }}
      />
    </>
  );
};
