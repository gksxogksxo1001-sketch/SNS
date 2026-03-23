"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { X, Camera, Plus, MapPin, Globe, Users, Lock, ChevronRight, Search, Loader2 } from "lucide-react";
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
    <div className="fixed inset-0 z-[100] flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
      <header className="flex items-center space-x-4 border-b px-4 py-3">
        <button onClick={onClose} className="text-[#212529]">
          <X size={24} />
        </button>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" size={18} />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="장소, 도시 검색"
            className="w-full rounded-xl bg-[#F8F9FA] py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#2A9D8F]/20"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex h-full flex-col items-center justify-center space-y-3 py-20 text-[#ADB5BD]">
            <Loader2 className="animate-spin" size={32} />
            <p className="text-sm font-medium">장소를 찾는 중...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-2">
            {results.map((res) => (
              <button
                key={res.place_id}
                onClick={() => handleSelectResult(res)}
                className="flex w-full flex-col p-3 text-left transition-colors active:bg-[#F8F9FA] rounded-xl"
              >
                <div className="flex items-center space-x-2">
                  <MapPin size={16} className="text-[#2A9D8F]" />
                  <span className="text-sm font-bold text-[#212529]">{res.structured_formatting.main_text}</span>
                </div>
                <span className="pl-6 text-xs text-[#6C757D] line-clamp-1">{res.description}</span>
              </button>
            ))}
          </div>
        ) : query ? (
          <div className="flex h-full flex-col items-center justify-center py-20 text-[#ADB5BD]">
            <p className="text-sm font-medium">검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-[#ADB5BD] space-y-2">
            <MapPin size={48} className="opacity-10" />
            <p className="text-sm font-medium">여행 중 방문한 장소를 검색해 보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CreatePostPage() {
  const router = useRouter();
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
  const [visibility, setVisibility] = useState<"public" | "friends" | "group">("public");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
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
      alert("로그인이 필요합니다. 로그인 페이지로 이동합니다.");
      router.push("/login");
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
          groupId: visibility === "group" ? selectedGroupId : null,
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
      router.push("/feed");
    } catch (error: any) {
      console.error("[CreatePost] Final Error:", error);
      alert(error.message || "게시물 등록에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="flex min-h-screen flex-col bg-white">
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
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-white px-4 py-3">
        <button onClick={() => router.back()} className="text-[#212529]">
          <X size={24} />
        </button>
        <h1 className="text-lg font-bold text-[#212529]">새 게시물</h1>
        <button
          onClick={handleRegister}
          disabled={( !content && images.length === 0 ) || isSubmitting || isAuthLoading}
          className="rounded-full bg-[#2A9D8F] px-5 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-30 flex items-center space-x-2"
        >
          {(isSubmitting || isAuthLoading) && <Loader2 size={16} className="animate-spin" />}
          <span>{isSubmitting ? "등록 중..." : isAuthLoading ? "인증 중..." : "등록"}</span>
        </button>
      </header>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto pb-10">
        {/* Image Picker Section */}
        <div className="flex space-x-3 overflow-x-auto p-4 scrollbar-hide">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-32 w-32 flex-shrink-0 flex-col items-center justify-center space-y-2 rounded-2xl border-2 border-dashed border-[#F1F3F5] bg-[#F8F9FA] text-[#6C757D] transition-colors hover:border-[#2A9D8F]/30 hover:bg-[#2A9D8F]/5"
          >
            <Camera size={24} />
            <span className="text-xs font-medium">{images.length}/10</span>
          </button>
          {images.map((img, idx) => (
            <div key={idx} className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl bg-slate-100">
              <img src={img.preview} alt={`Preview ${idx}`} className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(idx)}
                className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white backdrop-blur-sm"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        {/* Tag Input Section */}
        <div className="px-4 py-2 border-b border-[#F1F3F5]">
          <div className="flex items-center space-x-2">
            <span className="text-[#2A9D8F] font-bold text-lg">#</span>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="태그를 입력하세요 (예: 제주 바다 노을)"
              className="w-full py-2 text-sm text-[#212529] outline-none placeholder:text-[#ADB5BD] font-medium"
            />
          </div>
        </div>

        {/* Text Input Section */}
        <div className="px-4 pt-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="이번 여행은 어떠셨나요? 본문을 작성해 주세요."
            className="min-h-[200px] w-full resize-none border-none text-base text-[#212529] outline-none placeholder:text-[#ADB5BD] leading-relaxed"
          />
        </div>

        {/* Divider */}
        <div className="h-2 bg-[#F8F9FA]" />

        {/* Expense Section */}
        <div className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#212529]">여행 비용 기록</h2>
            <div className="text-right">
              <p className="text-[10px] font-medium text-[#6C757D]">총 지출액</p>
              <p className="text-base font-bold text-[#2A9D8F]">{totalExpense.toLocaleString()}원</p>
            </div>
          </div>
          <ExpenseInput expenses={expenses} onExpenseChange={handleExpenseChange} />
        </div>

        {/* Divider */}
        <div className="h-2 bg-[#F8F9FA]" />

        {/* Settings Section */}
        <div className="divide-y divide-[#F1F3F5] px-4">
          <button 
            onClick={() => setIsLocationModalOpen(true)}
            className="flex w-full items-center justify-between py-4 group"
          >
            <div className="flex items-center space-x-3">
              <div className={`rounded-xl p-2 transition-colors ${
                selectedLocation ? "bg-[#2A9D8F]/10 text-[#2A9D8F]" : "bg-[#F8F9FA] text-[#6C757D]"
              } group-hover:bg-[#2A9D8F]/10 group-hover:text-[#2A9D8F]`}>
                <MapPin size={20} />
              </div>
              <div className="flex flex-col items-start">
                <span className={`text-sm font-semibold ${selectedLocation ? "text-[#2A9D8F]" : "text-[#212529]"}`}>
                  {selectedLocation ? selectedLocation.name : "위치 추가"}
                </span>
                {selectedLocation && (
                  <span className="text-[10px] text-[#6C757D] line-clamp-1">{selectedLocation.address}</span>
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-[#ADB5BD]" />
          </button>

          <div className="flex w-full flex-col space-y-4 py-4">
            <div className="flex items-center space-x-3">
              <div className="rounded-xl bg-[#F8F9FA] p-2 text-[#6C757D]">
                <Globe size={20} />
              </div>
              <span className="text-sm font-semibold text-[#212529]">공개 범위 설정</span>
            </div>
            
            <div className="flex space-x-2">
              {[
                { id: "public", label: "전체", icon: Globe },
                { id: "friends", label: "친구", icon: Users },
                { id: "group", label: "그룹", icon: Lock },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setVisibility(item.id as any)}
                  className={`flex flex-1 items-center justify-center space-x-2 rounded-xl py-3 transition-all ${
                    visibility === item.id
                      ? "bg-[#2A9D8F] text-white shadow-lg shadow-[#2A9D8F]/20"
                      : "bg-[#F8F9FA] text-[#6C757D]"
                  }`}
                >
                  <item.icon size={16} />
                  <span className="text-xs font-bold">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {visibility === "group" && userGroups.length > 0 && (
            <div className="flex w-full flex-col space-y-3 py-4 animate-in slide-in-from-top-2">
              <span className="text-xs font-bold text-[#6C757D] ml-1">나의 여행 그룹 선택</span>
              <div className="flex flex-wrap gap-2">
                {userGroups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "px-4 py-2 rounded-xl text-xs font-bold transition-all border",
                      selectedGroupId === group.id
                        ? "bg-[#2A9D8F]/10 border-[#2A9D8F] text-[#2A9D8F]"
                        : "bg-white border-slate-100 text-slate-500 hover:border-slate-200"
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
