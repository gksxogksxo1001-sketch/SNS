import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/core/hooks/useAuth";
import { notificationService } from "@/core/firebase/notificationService";
import { messageService } from "@/core/firebase/messageService";
import { Bell, Home, Map, PlusSquare, Wallet, User, Users } from "lucide-react";

export const BottomNav = () => {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const unsubNotif = notificationService.subscribeToNotifications(user.uid, (notifications) => {
      setUnreadNotifCount(notifications.filter(n => !n.isRead).length);
    });

    const unsubMsg = messageService.subscribeToTotalUnreadCount(user.uid, (count) => {
      setUnreadMsgCount(count);
    });

    return () => {
      unsubNotif();
      unsubMsg();
    };
  }, [user]);

  const navItems = [
    { icon: Home, label: "피드", href: "/feed", badge: unreadNotifCount },
    { icon: Map, label: "지도", href: "/map" },
    { icon: PlusSquare, label: "작성", href: "/post/create" },
    { icon: Users, label: "그룹", href: "/groups" },
    { icon: Wallet, label: "정산", href: "/settlement", badge: unreadMsgCount }, // Using settlement for messages/settlement activity for now
    { icon: User, label: "프로필", href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex h-16 items-center justify-around border-t border-border-base bg-bg-base px-2 pb-safe shadow-[0_-4px_6px_rgba(0,0,0,0.02)] mx-auto w-full max-w-md sm:border-x sm:border-border-base">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center space-y-1 transition-colors relative",
              isActive ? "text-primary" : "text-text-sub hover:text-primary"
            )}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              {item.badge && item.badge > 0 ? (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-error px-1 text-[8px] font-bold text-white ring-2 ring-white">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              ) : null}
            </div>
            <span className="text-[9px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
