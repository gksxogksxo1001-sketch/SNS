"use client";

import React, { useState, useEffect, Suspense } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { ChevronLeft, X, Search, Map as MapIcon, Compass, Layers } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { postService } from "@/core/firebase/postService";
import { Post } from "@/types/post";
import { useAuth } from "@/core/hooks/useAuth";
import { cn } from "@/lib/utils";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

// Type for places used in directions and rendering
type MapPlace = {
  id: string;
  name: string;
  image: string;
  tags: string[];
  order: number;
  description: string;
  lat: number;
  lng: number;
};

// Helper component to capture map instance
const MapInstanceHandler = ({ setMap }: { setMap: (map: google.maps.Map | null) => void }) => {
  const map = useMap();
  useEffect(() => {
    if (map) setMap(map);
  }, [map, setMap]);
  return null;
};

function MapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetLat = searchParams.get('lat');
  const targetLng = searchParams.get('lng');
  const targetName = searchParams.get('name');
  
  const isSingleView = !!(targetLat && targetLng);
  const singlePlace = isSingleView ? {
    id: "single-target",
    name: decodeURIComponent(targetName || "선택한 장소"),
    lat: parseFloat(targetLat!),
    lng: parseFloat(targetLng!),
  } : null;

  const { user } = useAuth();
  const [activeIndex, setActiveIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [places, setPlaces] = useState<MapPlace[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    if (!user) return;
    if (isSingleView) {
      setIsLoading(false);
      return;
    }

    // Real-time subscription
    const unsubscribe = postService.subscribeToPosts((allPosts) => {
      try {
        // Filter posts: My posts OR posts bookmarked by me
        const filteredPosts = allPosts.filter(p => 
          p.location && (p.user.uid === user.uid || (p.bookmarkedBy && p.bookmarkedBy.includes(user.uid)))
        );

        const mappedPlaces = filteredPosts.map((p, idx) => ({
          id: p.id || `temp-${idx}`,
          name: p.location!.name,
          image: (p.images && p.images.length > 0) ? p.images[0] : "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80",
          tags: p.tags || [],
          order: idx + 1,
          description: p.content,
          lat: p.location!.lat,
          lng: p.location!.lng,
        }));
        setPlaces(mappedPlaces);
      } catch (error) {
        console.error("Failed to process posts for map:", error);
        setErrorMsg("지도 데이터를 처리하는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user, isSingleView]);

  const handleCenterLocation = () => {
    if (!navigator.geolocation) {
      alert("지오로케이션을 지원하지 않는 브라우저입니다.");
      return;
    }

    // IP 주소 접속 시 경고 (Chrome 등 최신 브라우저 제약)
    if (window.location.hostname !== 'localhost' && window.location.protocol !== 'https:') {
      alert("보안 정책상 'localhost' 또는 'https://' 주소에서만 위치 정보를 가져올 수 있습니다. 주소를 확인해 주세요!");
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lng: longitude });
        if (mapInstance) {
          mapInstance.panTo({ lat: latitude, lng: longitude });
          mapInstance.setZoom(15);
        }
      },
      (error) => {
        console.error("Error getting location:", error);
        let message = "위치 정보를 가져올 수 없습니다.";
        if (error.code === 1) message = "위치 정보 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해 주세요.";
        else if (error.code === 3) message = "위치 측정 시간이 초과되었습니다. 다시 시도해 주세요.";
        alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  const filteredPlaces = places.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // 지도의 기본 중심점과 줌 레벨 결정
  const defaultCenter = isSingleView && singlePlace 
    ? { lat: singlePlace.lat, lng: singlePlace.lng } 
    : places.length > 0 ? { lat: places[0].lat, lng: places[0].lng } : { lat: 37.5665, lng: 126.9780 }; // 기본 서울시 중심
  const defaultZoom = isSingleView ? 16 : places.length > 0 ? 13 : 11;

  if (errorMsg) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
          <X size={32} />
        </div>
        <p className="text-lg font-bold text-slate-800">{errorMsg}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-6 px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-colors"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">
      {isLoading ? (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2A9D8F]"></div>
          <p className="mt-4 text-sm font-medium text-[#6C757D]">지도를 불러오는 중...</p>
        </div>
      ) : (
        <>
          {/* Left Sidebar: Search & Controls */}
          <div className="w-80 h-full border-r border-slate-100 flex flex-col bg-white z-20 shadow-[4px_0_15px_rgba(0,0,0,0.02)]">
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={() => router.back()} 
                  className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-[#212529] hover:bg-slate-100 transition-colors"
                >
                  <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black text-[#212529]">Discovery</h1>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#ADB5BD]">
                    <Search size={18} />
                  </div>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="휴양지 이름, 태그 검색..."
                    className="w-full bg-slate-50 border-none rounded-2xl py-3.5 pl-12 pr-10 text-sm font-medium text-[#495057] placeholder:text-[#ADB5BD] focus:ring-2 focus:ring-[#2A9D8F]/20 transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#ADB5BD] hover:text-[#e74c3c]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold text-[#ADB5BD] uppercase tracking-widest">Quick Filters</p>
                  <button onClick={() => setSearchQuery("")} className="text-[10px] font-bold text-[#2A9D8F] hover:underline">Reset</button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="flex items-center space-x-2 bg-[#2A9D8F] text-white p-3 rounded-2xl shadow-sm text-xs font-bold transition-transform active:scale-95">
                    <Compass size={16} />
                    <span>전체 탐험</span>
                  </button>
                  <button className="flex items-center space-x-2 bg-slate-50 text-[#6C757D] p-3 rounded-2xl text-xs font-bold hover:bg-slate-100 transition-all">
                    <Layers size={16} />
                    <span>레이어</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 scrollbar-hide">
              <div className="bg-[#2A9D8F]/5 rounded-3xl p-5 border border-[#2A9D8F]/10">
                <div className="flex items-center space-x-2 mb-3">
                  <MapIcon size={16} className="text-[#2A9D8F]" />
                  <span className="text-sm font-black text-[#264653]">My Vacations</span>
                </div>
                <p className="text-xs text-[#6C757D] leading-relaxed font-medium">
                  {isSingleView ? "선택한 장소의 위치를 확인하세요." : `현재 ${filteredPlaces.length}개의 어썸한 휴양지가 지도에 표시되어 있습니다.`}
                </p>
              </div>
            </div>

            <div className="p-6 bg-slate-50/50 border-t border-slate-50 text-center">
              <p className="text-[10px] font-bold text-[#ADB5BD]">공유 중인 순간들</p>
            </div>
          </div>

          {/* Center Area: Map */}
          <div className="flex-1 relative bg-slate-50">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                key={`${defaultCenter.lat}-${defaultCenter.lng}`}
                defaultCenter={defaultCenter}
                defaultZoom={defaultZoom}
                gestureHandling={"greedy"}
                disableDefaultUI={true}
                className="h-full w-full"
              >
                {isSingleView && singlePlace ? (
                  <Marker
                    position={{ lat: singlePlace.lat, lng: singlePlace.lng }}
                    label={{ text: "📍", color: "white", fontSize: "14px" }}
                    title={singlePlace.name}
                  />
                ) : (
                  filteredPlaces.map((place) => (
                    <Marker
                      key={place.id}
                      position={{ lat: place.lat, lng: place.lng }}
                      label={{
                        text: "🏝️",
                        color: "white",
                        fontSize: "14px",
                      }}
                      title={place.name}
                      onClick={() => {
                        const idx = places.findIndex(p => p.id === place.id);
                        if (idx !== -1) setActiveIndex(idx);
                      }}
                    />
                  ))
                )}

                <MapInstanceHandler setMap={setMapInstance} />

                {currentLocation && (
                  <Marker 
                    position={currentLocation}
                    label={{ text: "🔵", fontSize: "20px" }}
                    title="현재 위치"
                  />
                )}
              </Map>
            </APIProvider>
            
            {/* Map Overlay Button */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex items-center space-x-3">
              <button 
                onClick={handleCenterLocation}
                className="flex items-center space-x-2 bg-white text-[#212529] px-6 py-3 rounded-full shadow-2xl hover:bg-slate-50 transition-all font-bold text-xs"
              >
                <Compass size={18} className="text-[#2A9D8F]" />
                <span>현재 위치로</span>
              </button>
            </div>
          </div>

          {/* Right Sidebar: Post List */}
          {!isSingleView && (
            <div className="w-96 h-full bg-white border-l border-slate-100 flex flex-col z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.02)]">
              <div className="p-8 border-b border-slate-50">
                <h2 className="text-2xl font-black text-[#212529]">Collection</h2>
                <p className="text-[11px] text-[#ADB5BD] font-bold mt-1 uppercase tracking-widest">Shared Moments & Bookmarks</p>
              </div>
              
              <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide">
                {filteredPlaces.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-[#ADB5BD]">
                    <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                      <Compass size={40} className="opacity-20" />
                    </div>
                    <p className="text-sm font-bold text-center px-10 leading-relaxed">
                      {searchQuery ? `'${searchQuery}'에 대한\n장소를 찾을 수 없습니다.` : "저장된 휴양지가 없습니다.\n피드에서 멋진 곳을 탐험해 보세요!"}
                    </p>
                  </div>
                ) : (
                  filteredPlaces.map((place, idx) => (
                    <div 
                      key={place.id} 
                      className={cn(
                        "group cursor-pointer transition-all duration-500",
                        activeIndex === idx ? "translate-x-[-8px]" : "hover:translate-x-[-4px]"
                      )}
                      onClick={() => {
                        setActiveIndex(idx);
                        if (mapInstance) {
                          mapInstance.panTo({ lat: place.lat, lng: place.lng });
                        }
                      }}
                    >
                      <div className={cn(
                        "relative aspect-[16/10] rounded-[32px] overflow-hidden mb-4 shadow-xl transition-all duration-500",
                        activeIndex === idx ? "ring-4 ring-[#2A9D8F] scale-105" : "group-hover:shadow-2xl"
                      )}>
                        <img src={place.image} alt={place.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                        
                        <div className="absolute top-4 left-4">
                          <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full border border-white/30">
                            <span className="text-[10px] font-black text-white">#{idx + 1}</span>
                          </div>
                        </div>

                        <div className="absolute bottom-5 left-5 right-5 text-white">
                          <h3 className="text-lg font-black truncate drop-shadow-md">{place.name}</h3>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {place.tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] font-bold text-white/90 bg-white/20 px-2 py-0.5 rounded-lg backdrop-blur-sm border border-white/10 italic">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="px-2">
                        <p className="text-[12px] text-[#6C757D] line-clamp-2 leading-relaxed font-medium">
                          {place.description || "이 멋진 휴양지에 기록된 정보가 없습니다. 직접 첫 번째 코멘트를 남겨보세요!"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-6 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => router.push('/feed')}
                  className="w-full py-4 bg-[#212529] text-white rounded-[24px] text-sm font-black shadow-xl hover:bg-[#343a40] hover:shadow-2xl transition-all flex items-center justify-center space-x-3 active:scale-95"
                >
                  <MapIcon size={18} />
                  <span>새로운 휴양지 탐색하기</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2A9D8F]"></div>
        <p className="mt-4 text-sm font-medium text-[#6C757D]">지도를 준비하는 중...</p>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
