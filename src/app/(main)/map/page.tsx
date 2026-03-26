"use client";

import React, { useState, useEffect, Suspense } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, Pin } from "@vis.gl/react-google-maps";
import { ChevronLeft, X, Search, Map as MapIcon, Compass, Layers, List } from "lucide-react";
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

// Google Maps Dark Style
const DARK_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#263c3f" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b9a76" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#746855" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1f2835" }] },
  { "featureType": "road.highway", "elementType": "labels.text.fill", "stylers": [{ "color": "#f3d19c" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "transit.station", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#515c6d" }] },
  { "featureType": "water", "elementType": "labels.text.stroke", "stylers": [{ "color": "#17263c" }] }
];

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
  const [currentLocation, setCurrentLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [isMobileListOpen, setIsMobileListOpen] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDarkMode(isDark);

    const matcher = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    matcher.addEventListener("change", onChange);
    return () => matcher.removeEventListener("change", onChange);
  }, []);

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
        <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-4">
          <X size={32} />
        </div>
        <p className="text-lg font-bold text-text-main">{errorMsg}</p>
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
    <div className="flex flex-col md:flex-row h-full w-full bg-bg-base overflow-hidden relative">
      {isLoading ? (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-bg-base/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm font-medium text-text-sub">지도를 불러오는 중...</p>
        </div>
      ) : (
        <>
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden flex items-center justify-between p-4 bg-bg-base border-b border-border-base absolute top-0 left-0 right-0 z-30 shadow-sm">
            {isMobileSearchActive ? (
              <div className="flex flex-1 items-center space-x-3">
                <button
                  onClick={() => {
                    setIsMobileSearchActive(false);
                    setSearchQuery("");
                  }}
                  className="p-2 text-text-sub"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-sub/50">
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="장소, 태그 검색..."
                    className="w-full bg-bg-alt border-none rounded-xl py-2 pl-10 pr-8 text-sm text-text-main focus:ring-2 focus:ring-primary/20"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-sub/50"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => router.back()}
                    className="p-2 text-text-main"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h1 className="text-lg font-black text-text-main">Discovery</h1>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setIsMobileSearchActive(true);
                      setIsMobileListOpen(true);
                    }}
                    className="p-2.5 text-primary bg-primary/10 rounded-xl"
                  >
                    <Search size={20} />
                  </button>
                  <button
                    onClick={() => setIsMobileListOpen(!isMobileListOpen)}
                    className={cn(
                      "p-2.5 rounded-xl transition-all",
                      isMobileListOpen ? "bg-primary text-white" : "text-primary bg-primary/10"
                    )}
                  >
                    <List size={20} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Unified Sidebar: Search & Collection List (Desktop + Tablet) */}
          <div className={cn(
            "h-full border-r border-border-base flex-col bg-bg-base z-20 shadow-sm transition-all duration-300",
            "fixed inset-0 top-[60px] md:static md:w-96 md:flex",
            isMobileListOpen ? "flex" : "hidden md:flex"
          )}>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => router.back()}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-bg-alt text-text-main hover:bg-border-base transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <h1 className="text-xl font-black text-text-main">Discovery</h1>
                </div>
                <button
                  onClick={() => setIsMobileListOpen(false)}
                  className="md:hidden p-2 text-text-sub"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-sub/50">
                    <Search size={18} />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="휴양지 이름, 태그 검색..."
                    className="w-full bg-bg-alt border-none rounded-2xl py-3.5 pl-12 pr-10 text-sm font-medium text-text-main placeholder:text-text-sub/50 focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-sub hover:text-error"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-2 pb-24 scrollbar-hide">
              <div className="flex items-center justify-between mb-6 px-1">
                <p className="text-[11px] font-bold text-text-sub uppercase tracking-widest">Collection list</p>
                <p className="text-[10px] font-bold text-primary">{filteredPlaces.length} locations</p>
              </div>

              {filteredPlaces.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-text-sub">
                  <div className="w-16 h-16 rounded-full bg-bg-alt flex items-center justify-center mb-4">
                    <Compass size={32} className="opacity-20" />
                  </div>
                  <p className="text-xs font-bold text-center px-6 leading-relaxed">
                    {searchQuery ? `'${searchQuery}'에 대한\n장소를 찾을 수 없습니다.` : "저장된 휴양지가 없습니다.\n피드에서 멋진 곳을 탐험해 보세요!"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredPlaces.map((place, idx) => (
                    <div
                      key={place.id}
                      className={cn(
                        "group cursor-pointer transition-all duration-500",
                        activeIndex === idx ? "translate-x-[-4px]" : "hover:translate-x-[-2px]"
                      )}
                      onClick={() => {
                        setActiveIndex(idx);
                        if (mapInstance) {
                          mapInstance.panTo({ lat: place.lat, lng: place.lng });
                          mapInstance.setZoom(15);
                        }
                      }}
                    >
                      <div className={cn(
                        "relative aspect-[16/10] rounded-3xl overflow-hidden mb-3 shadow-md transition-all duration-500",
                        activeIndex === idx ? "ring-2 ring-primary scale-[1.02] shadow-lg" : "group-hover:shadow-xl"
                      )}>
                        <img src={place.image} alt={place.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80" />

                        <div className="absolute top-3 left-3">
                          <div className={cn(
                            "px-2 py-0.5 rounded-full border backdrop-blur-md transition-colors",
                            activeIndex === idx ? "bg-primary border-primary text-white" : "bg-white/20 border-white/30 text-white"
                          )}>
                            <span className="text-[10px] font-black">#{idx + 1}</span>
                          </div>
                        </div>

                        <div className="absolute bottom-4 left-4 right-4 text-white">
                          <h3 className="text-base font-black truncate drop-shadow-md">{place.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {place.tags.slice(0, 2).map(tag => (
                              <span key={tag} className="text-[9px] font-bold text-white/90 bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="px-1">
                        <p className="text-[11px] text-text-sub line-clamp-2 leading-relaxed font-medium">
                          {place.description || "기록된 정보가 없는 장소입니다."}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-6 bg-bg-alt border-t border-border-base md:sticky bottom-0">
              <button
                onClick={() => router.push('/feed')}
                className="w-full py-3 bg-text-main text-bg-base rounded-2xl text-xs font-black shadow-lg hover:opacity-90 transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                <MapIcon size={16} />
                <span>탐색 계속하기</span>
              </button>
            </div>
          </div>

          {/* Center Area: Map */}
          <div className="flex-1 relative bg-bg-alt z-10 w-full h-full">
            <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
              <Map
                mapId="bf50a9134b7f3d6c" // Required for AdvancedMarker
                key={`${defaultCenter.lat}-${defaultCenter.lng}-${isDarkMode}`}
                defaultCenter={defaultCenter}
                defaultZoom={defaultZoom}
                gestureHandling={"greedy"}
                disableDefaultUI={true}
                className="h-full w-full"
                styles={isDarkMode ? DARK_MAP_STYLE : []}
              >
                {isSingleView && singlePlace ? (
                  <AdvancedMarker
                    position={{ lat: singlePlace.lat, lng: singlePlace.lng }}
                    title={singlePlace.name}
                  >
                    <Pin background={"#e74c3c"} glyphColor={"#fff"} borderColor={"#c0392b"} />
                  </AdvancedMarker>
                ) : (
                  filteredPlaces.map((place) => (
                    <AdvancedMarker
                      key={place.id}
                      position={{ lat: place.lat, lng: place.lng }}
                      title={place.name}
                      onClick={() => {
                        const idx = places.findIndex(p => p.id === place.id);
                        if (idx !== -1) {
                          setActiveIndex(idx);
                          // Mobile: Scroll into view or just update map is enough
                        }
                      }}
                    >
                      <div className="text-2xl animate-bounce duration-1000">🏝️</div>
                    </AdvancedMarker>
                  ))
                )}

                <MapInstanceHandler setMap={setMapInstance} />

                {currentLocation && (
                  <AdvancedMarker
                    position={currentLocation}
                    title="현재 위치"
                  >
                    <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
                  </AdvancedMarker>
                )}
              </Map>
            </APIProvider>

            {/* Map Overlay Button */}
            <div className="absolute bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-3">
              <button
                onClick={handleCenterLocation}
                className="flex items-center space-x-2 bg-bg-base/90 backdrop-blur-md text-text-main px-6 py-3 rounded-full shadow-2xl hover:bg-bg-base transition-all font-bold text-xs border border-border-base"
              >
                <Compass size={18} className="text-primary" />
                <span>현재 위치로</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={
      <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-bg-base">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm font-medium text-text-sub">지도를 준비하는 중...</p>
      </div>
    }>
      <MapPageContent />
    </Suspense>
  );
}
