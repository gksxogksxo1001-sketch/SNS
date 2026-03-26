"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { X, Camera, Plus, MapPin, Globe, Users, Lock, ChevronRight, Search, Loader2, Wallet } from "lucide-react";
import { ExpenseInput } from "@/components/features/post/ExpenseInput";
import { postService } from "@/core/firebase/postService";
import { auth } from "@/core/firebase/config";
import { useAuth } from "@/core/hooks/useAuth";
import { groupService } from "@/core/firebase/groupService";
import { Group } from "@/types/group";
import { cn } from "@/lib/utils";
import { useModalStore } from "@/store/useModalStore";
import Image from "next/image";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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
      <header className="flex items-center space-x-4 border-b border-border-base px-4 py-3 bg-bg-base">
        <button onClick={onClose} className="text-text-main">
          <X size={24} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub/50" size={18} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="장소, 도시 검색"
            className="w-full rounded-xl bg-bg-alt py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/20 text-text-main"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 py-20 text-text-sub">
            <Loader2 className="animate-spin text-primary" size={32} />
            <p className="text-sm font-medium">장소를 찾는 중...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            {results.map((res) => (
              <button
                key={res.place_id}
                onClick={() => handleSelectResult(res)}
                className="flex w-full flex-col p-3 text-left transition-colors active:bg-bg-alt rounded-xl hover:bg-bg-alt/50"
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
          <div className="flex h-full flex-col items-center justify-center py-20 text-[#ADB5BD]">
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

export default function EditPostPage() {
  const router = useRouter();
  const { showAlert } = useModalStore();
  const params = useParams();
  const postId = params.id as string;
  
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [images, setImages] = useState<{ file?: File; preview: string; isExisting?: boolean }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{ name: string; address: string; lat: number; lng: number } | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [expenses, setExpenses] = useState({
    plane: "",
    stay: "",
    transport: "",
    food: "",
    other: "",
  });
  const [visibility, setVisibility] = useState<"public" | "friends" | "close_friends">("public");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const { user: currentUser, isLoading: isAuthLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const fetchGroups = async () => {
      if (currentUser) {
        try {
          const groups = await groupService.getUserGroups(currentUser.uid);
          setUserGroups(groups);
        } catch (error) {
          console.error("[EditPost] Failed to fetch groups:", error);
        }
      }
    };
    fetchGroups();
  }, [currentUser]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!postId || !currentUser) return;
      try {
        setIsFetching(true);
        const post = await postService.getPostById(postId);
        if (post) {
          if (post.user.uid !== currentUser.uid) {
            showAlert({ title: "권한 없음", message: "수정 권한이 없습니다.", type: "error" });
            router.push("/feed");
            return;
          }
          setContent(post.content || "");
          setTags(post.tags?.join(" ") || "");
          if (post.images) {
            setImages(post.images.map(url => ({ preview: url, isExisting: true })));
          }
          if (post.location) setSelectedLocation(post.location as any);
          if (post.expenses) {
            setExpenses({
              plane: post.expenses.plane?.toString() || "",
              stay: post.expenses.stay?.toString() || "",
              transport: post.expenses.transport?.toString() || "",
              food: post.expenses.food?.toString() || "",
              other: post.expenses.other?.toString() || "",
            });
          }
          setVisibility(post.visibility as any || "public");
          if (post.groupId) setSelectedGroupId(post.groupId);
        } else {
          showAlert({ title: "안내", message: "게시물을 찾을 수 없습니다.", type: "warning" });
          router.push("/feed");
        }
      } catch (error) {
        console.error("Failed to fetch post", error);
        showAlert({ title: "오류", message: "게시물 정보를 불러오는데 실패했습니다.", type: "error" });
      } finally {
        setIsFetching(false);
      }
    };

    if (!isAuthLoading) {
        fetchPost();
    }
  }, [postId, currentUser, isAuthLoading, router]);

  // Handle auto location tagging from content or tags
  useEffect(() => {
    const triggerAutoTag = async () => {
      if (!isFetching && !selectedLocation && (content.includes("#") || tags.includes("#"))) {
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
  }, [content, tags, selectedLocation, isFetching]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const totalExpense = Object.values(expenses).reduce((acc, val) => acc + (Number(val) || 0), 0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages = Array.from(files).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      isExisting: false
    }));

    setImages((prev) => [...prev, ...newImages].slice(0, 10));
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const updated = [...prev];
      if (!updated[index].isExisting) {
        URL.revokeObjectURL(updated[index].preview);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleExpenseChange = (category: string, value: string) => {
    setExpenses((prev) => ({ ...prev, [category]: value }));
  };

  const handleUpdate = async () => {
    if (isSubmitting || isAuthLoading || isFetching) return;
    
    if (!currentUser) {
      return;
    }

    setIsSubmitting(true);
    try {
      const tagList = tags.split(/\s+/).filter(t => t.startsWith("#") || t.length > 0).map(t => t.startsWith("#") ? t : `#${t}`);
      
      const newImageFiles = images.filter(i => !i.isExisting && i.file).map(i => i.file as File);
      let uploadedUrls: string[] = [];
      
      if (newImageFiles.length > 0) {
        try {
          uploadedUrls = await postService.uploadImages(newImageFiles, currentUser.uid);
        } catch (uploadError: any) {
          throw new Error("이미지 업로드 중 오류가 발생했습니다.");
        }
      }

      const finalImageUrls = [
        ...images.filter(i => i.isExisting).map(i => i.preview),
        ...uploadedUrls
      ];

      await postService.updatePost(postId, {
        content,
        tags: tagList,
        images: finalImageUrls,
        location: selectedLocation || null,
        groupId: visibility === "close_friends" ? selectedGroupId : null,
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

      images.filter(img => !img.isExisting).forEach(img => URL.revokeObjectURL(img.preview));
      showAlert({ 
        title: "성공", 
        message: "게시물이 성공적으로 수정되었습니다! 🎉", 
        type: "success",
        onClose: () => router.push("/feed")
      });
    } catch (error: any) {
      console.error("[EditPost] Update Error:", error);
      showAlert({ 
        title: "오류", 
        message: error.message || "게시물 수정에 실패했습니다. 다시 시도해 주세요.", 
        type: "error" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isFetching || isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-alt">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-bg-base text-text-sub shadow-sm hover:bg-bg-alt hover:scale-105 transition-all"
        >
          <X size={20} />
        </button>
        <h1 className="text-lg font-black tracking-tight text-text-main">게시물 수정</h1>
        <button
          onClick={handleUpdate}
          disabled={images.length === 0 || isSubmitting}
          className="rounded-2xl bg-primary px-6 py-2.5 text-sm font-bold text-white transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:shadow-none hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center space-x-2"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          <span>{isSubmitting ? "수정 중..." : "수정하기"}</span>
        </button>
      </header>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-6">
        {/* Section: Images */}
        <div className="mb-6 overflow-hidden rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[15px] font-black tracking-tight text-text-main flex items-center space-x-2">
               <Camera size={18} className="text-primary" />
               <span>여행 사진 <span className="text-error">*</span></span>
            </h2>
            <span className="rounded-full bg-bg-base px-3 py-1 text-[11px] font-bold text-text-sub shadow-sm">
              <span className={images.length > 0 ? "text-primary" : ""}>{images.length}</span> / 10
            </span>
          </div>
          
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide pt-2 px-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex h-36 w-32 flex-shrink-0 flex-col items-center justify-center space-y-3 rounded-[24px] border-2 border-dashed border-border-base bg-bg-base/50 text-text-sub transition-all duration-300 hover:border-primary/50 hover:bg-bg-alt/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-primary opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-10 rounded-[24px]" />
              <div className="relative rounded-full bg-bg-base p-3 shadow-md transition-transform duration-300 group-hover:scale-110 group-hover:text-primary">
                <Plus size={26} strokeWidth={2.5} />
              </div>
              <span className="relative text-[11px] font-bold tracking-wide group-hover:text-primary">추가하기</span>
            </button>
            {images.map((img, idx) => (
              <div key={idx} className="group relative h-36 w-32 flex-shrink-0 overflow-hidden rounded-[24px] bg-bg-alt shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <Image 
                  src={img.preview} 
                  alt={`Preview ${idx}`} 
                  fill
                  sizes="128px"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
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
        <div className="mb-6 rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-[0_8px_30px_rgb(0,0,0,0.06)] group/content transition-all focus-within:shadow-[0_8px_30px_rgb(42,157,143,0.12)]">
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
        <div className="mb-6 rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
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
        <div className="mb-6 space-y-4 rounded-[32px] bg-bg-base/60 p-6 backdrop-blur-xl backdrop-saturate-150 border border-border-base shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
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

          {visibility === "close_friends" && userGroups.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-5 animate-in slide-in-from-top-4 duration-300">
              <p className="mb-3 text-[12px] font-bold text-[#6C757D] ml-1 flex items-center space-x-1.5">
                <Users size={14} />
                <span>친한 친구 그룹 선택</span>
              </p>
              <div className="flex flex-wrap gap-2">
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
