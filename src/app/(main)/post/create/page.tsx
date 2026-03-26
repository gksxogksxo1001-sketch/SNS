"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { X, Camera, Plus, MapPin, Globe, Users, Lock, ChevronRight, Search, Loader2, Wallet } from "lucide-react";
import { ExpenseInput } from "@/components/features/post/ExpenseInput";
import { postService } from "@/core/firebase/postService";
import { auth } from "@/core/firebase/config";
import { useAuth } from "@/core/hooks/useAuth";
import { groupService } from "@/core/firebase/groupService";
import { Group } from "@/types/group";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Location Search Modal Component
function LocationSearchModal({ 
  onClose, 
  onSelect 
}: { 
  onClose: () => void; 
  onSelect: (loc: { name: string; address: string; lat: number; lng: number }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const placesLibrary = useMapsLibrary("places");
  const [autocompleteService, setAutocompleteService] = useState<google.maps.places.AutocompleteService | null>(null);
  const [placesService, setPlacesService] = useState<google.maps.places.PlacesService | null>(null);

  useEffect(() => {
    if (!placesLibrary) return;
    setAutocompleteService(new placesLibrary.AutocompleteService());
    // PlacesService requires a dummy div or map instance
    const dummyDiv = document.createElement("div");
    setPlacesService(new placesLibrary.PlacesService(dummyDiv));
  }, [placesLibrary]);

  const handleSearch = (val: string) => {
    setQuery(val);
    if (!val || !autocompleteService) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    autocompleteService.getPlacePredictions({ input: val }, (predictions) => {
      setResults(predictions || []);
      setIsLoading(false);
    });
  };

  const handleSelectResult = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesService) return;

    placesService.getDetails({ placeId: prediction.place_id }, (place, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry?.location) {
        onSelect({
          name: place.name || prediction.structured_formatting.main_text,
          address: place.formatted_address || prediction.description,
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        });
        onClose();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-bg-base animate-in slide-in-from-bottom duration-300">
      <header className="flex items-center space-x-4 border-b border-border-base px-4 py-3">
        <button onClick={onClose} className="text-text-main">
          <X size={24} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub" size={18} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="장소, 도시 검색"
            className="w-full rounded-xl bg-bg-alt py-2 pl-10 pr-4 text-sm text-text-main outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 bg-bg-base">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 py-20 text-text-sub">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">장소를 찾는 중...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            {results.map((res) => (
              <button
                key={res.place_id}
                onClick={() => handleSelectResult(res)}
                className="flex w-full flex-col p-3 text-left transition-colors active:bg-bg-alt rounded-xl"
              >
                <div className="flex items-center space-x-2">
                  <MapPin size={16} className="text-primary" />
                  <span className="text-sm font-bold text-text-main">{res.structured_formatting.main_text}</span>
                </div>
                <span className="pl-6 text-xs text-text-sub line-clamp-1">{res.description}</span>
              </button>
            ))}
          </div>
        ) : query ? (
          <div className="flex h-full flex-col items-center justify-center py-20 text-text-sub">
            <p className="text-sm font-medium">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-text-sub space-y-2">
            <MapPin size={48} className="opacity-10" />
            <p className="text-sm font-medium">여행 중 방문한 장소를 검색해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-sub">Loading...</div>}>
      <CreatePostContent />
    </Suspense>
  );
}

function CreatePostContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlGroupId = searchParams?.get("groupId");
  
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [expenses, setExpenses] = useState({
    plane: "",
    stay: "",
    transport: "",
    food: "",
    other: "",
  });
  const [visibility, setVisibility] = useState<"public" | "friends" | "close_friends">(urlGroupId ? "close_friends" : "public");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(urlGroupId || null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      if (currentUser) {
        try {
          const groups = await groupService.getUserGroups(currentUser.uid);
          setUserGroups(groups);
        } catch (error) {
          console.error("[CreatePost] Failed to fetch groups:", error);
        }
      }
    };
    fetchGroups();
  }, [currentUser]);

  // Handle auto location tagging from content or tags
  useEffect(() => {
    const triggerAutoTag = async () => {
      if (!selectedLocation && (content.includes("#") || tags.includes("#"))) {
        const fullText = `${content} ${tags}`;
        const extracted = await postService.extractLocationFromTags(fullText);
        if (extracted) {
          setSelectedLocation({
            name: extracted.name,
            address: "태그에서 자동 추출됨",
            lat: extracted.lat || 0,
            lng: extracted.lng || 0
          });
        }
      }
    };
    
    const timeoutId = setTimeout(triggerAutoTag, 1000);
    return () => clearTimeout(timeoutId);
  }, [content, tags, selectedLocation]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const totalExpense = Object.values(expenses).reduce((acc, val) => acc + (Number(val) || 0), 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...newImages].slice(0, 10));
    
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleExpenseChange = (category: string, value: string) => {
    setExpenses((prev) => ({ ...prev, [category]: value }));
  };

  const handleRegister = async () => {
    console.log("[CreatePost] 🚀 등록 시도 중...", { 
      uid: currentUser?.uid, 
      isAuthLoading,
      contentLength: content.length,
      imagesCount: images.length 
    });

    if (isSubmitting || isAuthLoading) {
      console.warn("[CreatePost] 제출 중이거나 인증 로딩 중입니다. 요청을 중단합니다.");
      return;
    }
    
    if (!currentUser) {
      console.error("[CreatePost] 사용자가 로그인되어 있지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Tags processing
      const tagList = tags.split(/\s+/).filter(t => t.startsWith("#") || t.length > 0).map(t => t.startsWith("#") ? t : `#${t}`);
      
      // 2. Upload images
      const imageFiles = images.map(i => i.file);
      let imageUrls: string[] = [];
      
      if (imageFiles.length > 0) {
        console.log("[CreatePost] 1단계: 이미지 업로드 시작...", imageFiles.length, "개의 파일");
        try {
          imageUrls = await postService.uploadImages(imageFiles, currentUser.uid);
          console.log("[CreatePost] 1단계 성공: 이미지 URL 획득");
        } catch (uploadError: any) {
          console.error("[CreatePost] 1단계 실패 (이미지 업로드):", uploadError);
          let errorMsg = "이미지 업로드 중 오류가 발생했습니다.";
          
          if (uploadError.code === "storage/unauthorized") {
            errorMsg = "📷 이미지 업로드 권한이 없습니다.\n\n[해결 방법]\n1. Firebase 콘솔 -> Storage -> Rules(규칙)로 이동\n2. 'allow read, write: if request.auth != null;' 로 규칙을 수정하고 [게시]를 눌러주세요.";
          } else {
            errorMsg += `\n(${uploadError.message})`;
          }
          throw new Error(errorMsg);
        }
      }

      // 3. Create post data
      console.log("[CreatePost] 2단계: Firestore 데이터 저장 시작...");
      try {
        await postService.createPost({
          user: {
            uid: currentUser.uid,
            name: currentUser.displayName || "Anonymous",
            image: currentUser.photoURL || null, // undefined 대신 null 사용
          },
          content,
          tags: tagList,
          images: imageUrls,
          location: selectedLocation || null, // undefined 대신 null 사용
          groupId: visibility === "close_friends" ? (selectedGroupId || urlGroupId || null) : null,
          expenses: {
            plane: Number(expenses.plane) || 0,
            stay: Number(expenses.stay) || 0,
            transport: Number(expenses.transport) || 0,
            food: Number(expenses.food) || 0,
            other: Number(expenses.other) || 0,
          },
          totalExpense,
          visibility,
        });
        console.log("[CreatePost] 2단계 성공: 게시물 등록 완료");
      } catch (dbError: any) {
        console.error("[CreatePost] 2단계 실패 (데이터베이스):", dbError);
        let errorMsg = "게시물 저장 중 오류가 발생했습니다.";
        
        if (dbError.code === "permission-denied") {
          errorMsg = "🚫 데이터베이스 쓰기 권한이 없습니다.\n\n[해결 방법]\n1. Firebase 콘솔 -> Firestore Database -> Rules(규칙)로 이동\n2. 'allow write: if request.auth != null;' 가 포함된 규칙으로 수정하고 [게시]를 눌러주세요.";
        } else {
          errorMsg += `\n(${dbError.message})`;
        }
        throw new Error(errorMsg);
      }

      // 4. Success cleanup
      images.forEach(img => URL.revokeObjectURL(img.preview));
      alert("게시물이 성공적으로 등록되었습니다! 🎉");
      router.push(urlGroupId ? "/groups" : "/feed");
    } catch (error: any) {
      console.error("[CreatePost] Final Error:", error);
      alert(error.message || "게시물 등록에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="flex min-h-screen flex-col bg-bg-alt pb-10">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        multiple
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-bg-base/70 px-5 py-4 backdrop-blur-xl backdrop-saturate-150 border-b border-border-base shadow-sm">
        <button 
          onClick={() => router.back()} 
          className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-base text-text-main shadow-sm hover:bg-bg-alt hover:scale-105 transition-all"
        >
          <X size={20} />
        </button>
        <h1 className="text-lg font-black tracking-tight text-text-main">새 게시물</h1>
        <button
          onClick={handleRegister}
          disabled={images.length === 0 || isSubmitting || isAuthLoading}
          className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center space-x-2"
        >
          {(isSubmitting || isAuthLoading) && <Loader2 size={16} className="animate-spin" />}
          <span>{isSubmitting ? "등록 중..." : isAuthLoading ? "인증 중..." : "등록하기"}</span>
        </button>
      </header>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-6">
        {/* Section: Images */}
        <div className="mb-6 overflow-hidden rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[15px] font-black tracking-tight text-text-main flex items-center space-x-2">
               <Camera size={18} className="text-primary" />
               <span>여행 사진 <span className="text-error">*</span></span>
            </h2>
            <span className="rounded-full bg-bg-alt px-3 py-1 text-[11px] font-bold text-text-sub shadow-sm">
              <span className={images.length > 0 ? "text-primary" : ""}>{images.length}</span> / 10
            </span>
          </div>
          
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide pt-2 px-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-36 w-32 flex-shrink-0 flex-col items-center justify-center space-y-3 rounded-[24px] border-2 border-dashed border-border-base bg-bg-base/50 text-text-sub transition-all duration-300 hover:border-primary/50 hover:bg-bg-alt hover:shadow-lg hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-primary opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-10 rounded-[24px]" />
              <div className="relative rounded-full bg-bg-base p-3 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:text-primary">
                <Plus size={26} strokeWidth={2.5} />
              </div>
              <span className="relative text-[11px] font-bold tracking-wide group-hover:text-primary">추가하기</span>
            </button>
            {images.map((img, idx) => (
              <div key={idx} className="group relative h-36 w-32 flex-shrink-0 overflow-hidden rounded-[24px] bg-bg-alt shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <img src={img.preview} alt={`Preview ${idx}`} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white backdrop-blur-md transition-all hover:bg-error hover:scale-110 shadow-sm"
                >
                  <X size={14} strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
          {images.length === 0 && (
            <div className="mt-2 text-center rounded-2xl bg-error/10 p-3">
              <p className="text-[12px] font-bold text-error">
                최소 1장 이상의 사진을 등록해 주세요.
              </p>
            </div>
          )}
        </div>

        {/* Section: Content */}
        <div className="mb-6 rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-sm group/content transition-all focus-within:shadow-primary/10">
          <div className="mb-4 border-b border-border-base pb-3 transition-colors group-focus-within/content:border-primary/30">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <span className="text-lg font-black leading-none flex items-center justify-center">#</span>
              </div>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="태그를 입력하세요 (예: 제주 바다 노을)"
                className="w-full bg-transparent py-1 text-[15px] font-bold text-text-main outline-none placeholder:text-text-sub transition-all"
              />
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="이번 여행은 어떠셨나요? 이야기를 들려주세요..."
            className="min-h-[180px] w-full resize-none bg-bg-base/40 p-4 rounded-2xl text-[15px] leading-relaxed text-text-main outline-none placeholder:text-text-sub/50 transition-all focus:bg-bg-base focus:shadow-inner focus:ring-1 focus:ring-primary/30"
          />
        </div>

        {/* Section: Expenses */}
        <div className="mb-6 rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-sm">
           <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-gradient-to-br from-point to-secondary p-2 text-white shadow-sm">
                <Wallet size={18} />
              </div>
              <h2 className="text-[15px] font-black tracking-tight text-text-main">여행 비용 기록</h2>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-text-sub">총 지출액</p>
              <p className="text-lg font-black text-error">{totalExpense.toLocaleString()}원</p>
            </div>
          </div>
          <div className="rounded-2xl bg-bg-base/50 p-4 border border-border-base shadow-inner">
            <ExpenseInput expenses={expenses} onExpenseChange={handleExpenseChange} />
          </div>
        </div>

        {/* Section: Settings */}
        <div className="mb-6 space-y-4 rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-sm">
          <button 
            onClick={() => setIsLocationModalOpen(true)}
            className="group relative flex w-full items-center justify-between rounded-2xl bg-bg-base p-4 transition-all hover:shadow-md border border-transparent hover:border-border-base active:scale-[0.98]"
          >
            <div className="flex items-center space-x-4 text-left">
              <div className={`rounded-xl p-3 shadow-sm transition-colors ${
                selectedLocation ? "bg-primary text-white" : "bg-bg-alt text-text-sub group-hover:text-primary"
              }`}>
                <MapPin size={22} className={selectedLocation ? "animate-bounce" : ""} style={{ animationIterationCount: 1 }} />
              </div>
              <div>
                <p className={`text-[14px] font-black tracking-tight ${selectedLocation ? "text-primary" : "text-text-main"}`}>
                  {selectedLocation ? selectedLocation.name : "위치 추가하기"}
                </p>
                {selectedLocation && (
                  <p className="text-[11px] font-medium text-text-sub line-clamp-1 mt-0.5">{selectedLocation.address}</p>
                )}
              </div>
            </div>
            <div className="h-8 w-8 rounded-full bg-bg-alt flex items-center justify-center text-text-sub group-hover:bg-primary/10 group-hover:text-primary transition-colors">
              <ChevronRight size={18} />
            </div>
          </button>

          <div className="pt-2">
            <div className="mb-4 flex items-center space-x-2 px-1">
              <div className="rounded-lg bg-bg-alt p-1.5 text-text-sub">
                <Globe size={16} />
              </div>
              <span className="text-[13px] font-black text-text-main">누구와 공유할까요?</span>
            </div>
            
            <div className="flex space-x-3">
              {[
                { id: "public", label: "전체 공개", icon: Globe, color: "from-primary to-secondary" },
                { id: "friends", label: "친구만", icon: Users, color: "from-secondary to-point" },
                { id: "close_friends", label: "친한 친구만", icon: Lock, color: "from-error to-point" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVisibility(item.id as any)}
                  className={`relative flex flex-1 flex-col items-center justify-center py-4 rounded-2xl transition-all border overflow-hidden ${
                    visibility === item.id
                      ? "border-transparent shadow-lg transform -translate-y-1 bg-gradient-to-br text-white " + item.color
                      : "bg-bg-base text-text-sub border-border-base hover:border-text-sub hover:shadow-sm hover:text-text-main"
                  }`}
                >
                  <item.icon size={20} className="mb-2 z-10" />
                  <span className="text-[12px] font-black z-10">{item.label}</span>
                  {visibility === item.id && (
                    <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {visibility === "close_friends" && (
            <div className="mt-4 border-t border-border-base pt-5 animate-in slide-in-from-top-4 duration-300">
              <p className="mb-3 text-[12px] font-bold text-text-sub ml-1 flex items-center space-x-1.5">
                <Users size={14} />
                <span>공유 대상 선택</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGroupId(null)}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all shadow-sm",
                    selectedGroupId === null
                      ? "bg-error text-white border-transparent shadow-md shadow-error/20 -translate-y-0.5"
                      : "bg-bg-base border border-border-base text-text-sub hover:bg-bg-alt hover:text-text-main"
                  )}
                >
                  ⭐ 내 친한친구 리스트
                </button>
                {userGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "px-5 py-2.5 rounded-full text-[13px] font-extrabold transition-all shadow-sm",
                      selectedGroupId === group.id
                        ? "bg-error text-white border-transparent shadow-md shadow-error/20 -translate-y-0.5"
                        : "bg-bg-base border border-border-base text-text-sub hover:bg-bg-alt hover:text-text-main"
                    )}
                  >
                    {group.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location Search Modal */}
        {isLocationModalOpen && (
          <LocationSearchModal
            onClose={() => setIsLocationModalOpen(false)}
            onSelect={(loc) => setSelectedLocation(loc)}
          />
        )}
      </div>
    </div>
    </APIProvider>
  );
}
