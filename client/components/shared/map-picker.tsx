'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Define custom SVG marker icon to prevent broken assets in Next.js
const customIcon = L.divIcon({
  html: `<div class="flex items-center justify-center bg-transparent border-none">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ef4444" class="w-8 h-8 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
      <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
    </svg>
  </div>`,
  className: 'bg-transparent border-none',
  iconSize: [32, 32],
  iconAnchor: [16, 32]
});
L.Marker.prototype.options.icon = customIcon;

interface MapPickerProps {
  latitude?: number;
  longitude?: number;
  onChange?: (lat: number, lng: number) => void;
  readOnly?: boolean;
}

interface SearchResult {
  display_name: string;
  lat: string;
  lon: string;
}

export default function MapPicker({
  latitude,
  longitude,
  onChange,
  readOnly = false
}: MapPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Default ke Sinar Utama Mie Ayam Jl Sriwijaya Medan jika koordinat kosong
  const defaultLat = 3.5835804184944733;
  const defaultLng = 98.66345523110539;

  const currentLat = latitude ?? defaultLat;
  const currentLng = longitude ?? defaultLng;

  // 1. Inisialisasi Peta
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Bersihkan instance peta lama jika ada
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Buat map baru dengan menonaktifkan default zoom control
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView([currentLat, currentLng], 13);

    mapRef.current = map;

    // Gunakan CartoDB Voyager tiles yang bersih dan modern
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }
    ).addTo(map);

    // Tambah Marker jika koordinat awal valid
    if (
      latitude !== undefined &&
      longitude !== undefined &&
      latitude !== null &&
      longitude !== null
    ) {
      const marker = L.marker([latitude, longitude], {
        draggable: !readOnly,
        icon: customIcon
      }).addTo(map);
      markerRef.current = marker;

      // Event saat marker digeser (drag)
      if (!readOnly && onChange) {
        marker.on('dragend', () => {
          const position = marker.getLatLng();
          onChange(
            Number(position.lat.toFixed(6)),
            Number(position.lng.toFixed(6))
          );
        });
      }
    }

    // Event saat peta diklik
    if (!readOnly && onChange) {
      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        const roundedLat = Number(lat.toFixed(6));
        const roundedLng = Number(lng.toFixed(6));

        if (!markerRef.current) {
          // Buat marker baru jika belum ada
          const newMarker = L.marker([lat, lng], {
            draggable: !readOnly,
            icon: customIcon
          }).addTo(map);
          markerRef.current = newMarker;

          newMarker.on('dragend', () => {
            const position = newMarker.getLatLng();
            onChange(
              Number(position.lat.toFixed(6)),
              Number(position.lng.toFixed(6))
            );
          });
        } else {
          markerRef.current.setLatLng([lat, lng]);
        }

        onChange(roundedLat, roundedLng);
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly]);

  // 2. Perbarui posisi peta & marker jika prop latitude/longitude berubah secara eksternal
  useEffect(() => {
    if (mapRef.current) {
      if (
        latitude !== undefined &&
        longitude !== undefined &&
        latitude !== null &&
        longitude !== null
      ) {
        if (!markerRef.current) {
          // Buat marker baru jika belum ada
          const marker = L.marker([latitude, longitude], {
            draggable: !readOnly,
            icon: customIcon
          }).addTo(mapRef.current);
          markerRef.current = marker;

          if (!readOnly && onChange) {
            marker.on('dragend', () => {
              const position = marker.getLatLng();
              onChange(
                Number(position.lat.toFixed(6)),
                Number(position.lng.toFixed(6))
              );
            });
          }
        } else {
          const markerLatLng = markerRef.current.getLatLng();
          if (markerLatLng.lat !== latitude || markerLatLng.lng !== longitude) {
            markerRef.current.setLatLng([latitude, longitude]);
          }
        }

        const mapCenter = mapRef.current.getCenter();
        const dist =
          Math.abs(mapCenter.lat - latitude) +
          Math.abs(mapCenter.lng - longitude);
        if (dist > 0.01) {
          mapRef.current.setView([latitude, longitude]);
        }
      } else {
        // Hapus marker dari peta jika koordinat eksternal dikosongkan
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude, readOnly]);

  // 3. Cari Lokasi via Nominatim OSM (Geocoding)
  const handleSearch = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setShowDropdown(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&limit=5`
      );
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Failed to fetch map locations:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // 4. Pilih Lokasi dari Dropdown Hasil Pencarian
  const selectLocation = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    if (mapRef.current) {
      mapRef.current.flyTo([lat, lon], 16);

      if (!markerRef.current) {
        const marker = L.marker([lat, lon], {
          draggable: !readOnly,
          icon: customIcon
        }).addTo(mapRef.current);
        markerRef.current = marker;

        if (!readOnly && onChange) {
          marker.on('dragend', () => {
            const position = marker.getLatLng();
            onChange(
              Number(position.lat.toFixed(6)),
              Number(position.lng.toFixed(6))
            );
          });
        }
      } else {
        markerRef.current.setLatLng([lat, lon]);
      }

      if (onChange) {
        onChange(Number(lat.toFixed(6)), Number(lon.toFixed(6)));
      }
    }

    setSearchQuery(result.display_name);
    setShowDropdown(false);
  };

  return (
    <div className="relative w-full border border-gray-200 rounded-sm overflow-hidden bg-gray-50 flex flex-col">
      {/* Search Bar - hanya aktif jika bukan readOnly */}
      {!readOnly && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md bg-white/95 backdrop-blur-sm p-1.5 rounded-sm shadow-md border border-gray-200/80 flex gap-2 items-center">
          <div className="flex-1 relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari lokasi/alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSearch();
                }
              }}
              className="w-full pl-8 pr-2 py-1 text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 placeholder-gray-400"
            />
          </div>
          <Button
            type="button"
            onClick={() => handleSearch()}
            size="xs"
            variant="outline"
            className="h-7 px-3 bg-slate-900 border-slate-900 text-white hover:bg-slate-800 shrink-0 font-semibold"
            disabled={isSearching}
          >
            {isSearching ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              'Cari'
            )}
          </Button>

          {/* Dropdown Hasil Pencarian */}
          {showDropdown && (searchResults.length > 0 || isSearching) && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-sm shadow-lg max-h-48 overflow-y-auto z-[2000]">
              {isSearching ? (
                <div className="p-3 text-xs text-gray-400 italic text-center">
                  Mencari lokasi...
                </div>
              ) : (
                searchResults.map((result, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectLocation(result)}
                    className="w-full text-left px-3 py-2 text-[11px] text-gray-700 hover:bg-slate-50 border-b border-gray-50 last:border-b-0 focus:outline-none truncate block"
                  >
                    {result.display_name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Klik di luar untuk tutup dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-[999]"
          onClick={() => setShowDropdown(false)}
        />
      )}

      {/* Zoom Controls kustom */}
      <div className="absolute bottom-3 right-3 z-[1000] flex flex-col gap-1">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 bg-white hover:bg-gray-100 active:bg-gray-200 border border-gray-200 text-slate-800 font-bold rounded-sm shadow-md flex items-center justify-center text-sm transition-colors cursor-pointer select-none"
          title="Perbesar"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 bg-white hover:bg-gray-100 active:bg-gray-200 border border-gray-200 text-slate-800 font-bold rounded-sm shadow-md flex items-center justify-center text-sm transition-colors cursor-pointer select-none"
          title="Perkecil"
        >
          -
        </button>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-56 z-0" />
    </div>
  );
}
