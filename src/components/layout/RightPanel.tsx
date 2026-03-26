"use client";

import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "@/core/hooks/useAuth";
import { userService } from "@/core/firebase/userService";
import { DEFAULT_AVATAR } from "@/core/constants";
import Link from "next/link";
import { Search, Users, X } from "lucide-react";
import Image from "next/image";

export const RightPanel = () => {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchSuggested = async () => {
      try {
        const friends = await userService.getFriends(user.uid);
        const friendIds = new Set(friends.map((f: any) => f.uid));
        const allUsers = await userService.searchUsers("");
        const suggestions = allUsers
          .filter((u: any) => !friendIds.has(u.uid) && u.uid !== user.uid)
          .slice(0, 5);
        setSuggestedUsers(suggestions);
      } catch (e) {}
    };
    fetchSuggested();
  }, [user]);

  // 실시간 검색 (디바운스 300ms)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await userService.searchUsers(query.trim());
        setSearchResults(results.filter((u: any) => u.uid !== user?.uid).slice(0, 8));
      } catch (e) {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [query, user]);

  const clearSearch = () => {
    setQuery("");
    setSearchResults([]);
  };

  const isSearchMode = query.length > 0;

  return (
    <aside className="hidden xl:flex flex-col fixed right-0 top-0 h-full w-72 border-l border-border-base bg-bg-base px-4 py-6 z-40">
      {/* 인라인 검색 인풋 */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="사람 검색..."
          className="w-full bg-bg-alt rounded-2xl pl-9 pr-9 py-3 text-sm text-text-main placeholder:text-text-sub outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-sub hover:text-text-main">
            <X size={15} />
          </button>
        )}
      </div>

      {/* 검색 결과 */}
      {isSearchMode ? (
        <div className="flex-1 overflow-y-auto">
          {isSearching ? (
            <p className="text-[12px] text-text-sub text-center py-4">검색 중...</p>
          ) : searchResults.length > 0 ? (
            <div className="space-y-2">
              {searchResults.map((u) => (
                <Link
                  key={u.uid}
                  href={`/profile/${u.uid}`}
                  onClick={clearSearch}
                  className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-bg-alt transition-colors group"
                >
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-100 flex-shrink-0">
                    <Image
                      src={u.avatarUrl || DEFAULT_AVATAR}
                      alt={u.nickname}
                      fill
                      sizes="36px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-text-main truncate group-hover:text-primary transition-colors">{u.nickname}</p>
                    {u.bio && <p className="text-[11px] text-text-sub truncate">{u.bio}</p>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-text-sub text-center py-4">"{query}"에 대한 결과가 없습니다</p>
          )}
        </div>
      ) : (
        /* 친구 추천 (검색 안 할 때) */
        <div className="bg-bg-alt rounded-2xl p-4">
          <p className="text-[13px] font-bold text-text-main mb-4 flex items-center gap-2">
            <Users size={16} className="text-primary" />
            친구 추천
          </p>
          {suggestedUsers.length > 0 ? (
            <div className="space-y-3">
              {suggestedUsers.map((u) => (
                <div key={u.uid} className="flex items-center gap-3">
                  <Link href={`/profile/${u.uid}`}>
                    <div className="relative w-9 h-9 rounded-full overflow-hidden border border-gray-100">
                      <Image
                        src={u.avatarUrl || DEFAULT_AVATAR}
                        alt={u.nickname}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${u.uid}`}>
                      <p className="text-[13px] font-bold text-text-main truncate hover:text-primary transition-colors">{u.nickname}</p>
                    </Link>
                  </div>
                  <Link
                    href={`/profile/${u.uid}`}
                    className="text-[11px] font-bold text-primary border border-primary px-2.5 py-1 rounded-xl hover:bg-primary hover:text-white transition-colors flex-shrink-0"
                  >
                    보기
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-text-sub text-center py-4">추천 친구가 없습니다</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4">
        <p className="text-[10px] text-text-sub leading-relaxed">
          © 2024 HANS · 여행의 순간을 기록하다
        </p>
      </div>
    </aside>
  );
};
