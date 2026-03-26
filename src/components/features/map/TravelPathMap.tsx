"use client";

import React, { useEffect, useState } from "react";
import { 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary 
} from "@vis.gl/react-google-maps";
import { Post } from "@/types/post";
import { MapPin, Navigation } from "lucide-react";

interface TravelPathMapProps {
  posts: Post[];
  center?: { lat: number; lng: number };
}

export const TravelPathMap = ({ posts, center }: TravelPathMapProps) => {
  const map = useMap();
  const mapsLib = useMapsLibrary("maps");
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  // Filter posts with location data and sort by createdAt
  const locatedPosts = posts
    .filter(p => p.location && p.location.lat && p.location.lng)
    .sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);

  useEffect(() => {
    if (!map || !mapsLib || locatedPosts.length < 2) {
      if (polyline) polyline.setMap(null);
      return;
    }

    // Create path coordinates
    const path = locatedPosts.map(p => ({
      lat: p.location!.lat,
      lng: p.location!.lng
    }));

    // Remove existing polyline
    if (polyline) polyline.setMap(null);

    // Create new polyline
    const newPolyline = new mapsLib.Polyline({
      path,
      geodesic: true,
      strokeColor: "#2A9D8F",
      strokeOpacity: 0.8,
      strokeWeight: 4,
    });

    newPolyline.setMap(map);
    setPolyline(newPolyline);

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    path.forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds, 50);

    return () => {
      newPolyline.setMap(null);
    };
  }, [map, mapsLib, locatedPosts.length]);

  return (
    <div className="w-full h-full rounded-[32px] overflow-hidden shadow-inner bg-bg-alt relative border-4 border-bg-base">
      <Map
        mapId="HANS_TRAVEL_MAP"
        defaultCenter={center || { lat: 37.5665, lng: 126.9780 }}
        defaultZoom={12}
        gestureHandling="greedy"
        disableDefaultUI={true}
      >
        {locatedPosts.map((post, index) => (
          <AdvancedMarker
            key={post.id || index}
            position={{ lat: post.location!.lat, lng: post.location!.lng }}
          >
            <div className="flex flex-col items-center group">
                <div className="bg-bg-base/90 backdrop-blur-md px-2 py-1 rounded-lg shadow-md mb-1 border border-border-base opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[10px] font-bold text-text-main whitespace-nowrap">{post.location!.name}</p>
                </div>
                <Pin background={"var(--primary)"} borderColor={"var(--bg-base)"} glyphColor={"var(--text-main)"}>
                  <span className="text-[10px] font-black text-white">{index + 1}</span>
                </Pin>
            </div>
          </AdvancedMarker>
        ))}
      </Map>
      
      {/* Legend / Overlay */}
      <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
        <div className="bg-bg-base/90 backdrop-blur-md px-4 py-3 rounded-2xl shadow-lg border border-border-base/50 pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm shadow-primary/20">
              <Navigation size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-text-sub uppercase tracking-wider">이동 경로</p>
              <p className="text-sm font-black text-text-main tracking-tight">총 {locatedPosts.length}개의 장소</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
