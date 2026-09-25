'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { FormInput } from '@/components/ui/form-input';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { INDONESIA_REGIONS } from '@/lib/constants/indonesia-regions';

const MapPicker = dynamic(() => import('@/components/shared/map-picker'), {
  ssr: false,
  loading: () => (
    <div className="h-56 bg-gray-50 flex items-center justify-center text-xs text-gray-400 rounded-sm border border-gray-200">
      Memuat peta...
    </div>
  )
});

// Helper to match state and city to INDONESIA_REGIONS options
const findRegionMatch = (stateName?: string, cityName?: string) => {
  if (!stateName) return { province: '', city: '' };

  // Normalize state name (e.g. 'Daerah Khusus Ibukota Jakarta' -> 'DKI Jakarta')
  let cleanState = stateName.toLowerCase();
  if (cleanState.includes('jakarta') || cleanState.includes('dki')) {
    cleanState = 'dki jakarta';
  } else if (cleanState.includes('yogyakarta') || cleanState.includes('diy')) {
    cleanState = 'di yogyakarta';
  }

  // Find province
  const provinceMatch = INDONESIA_REGIONS.find((p) => {
    const pName = p.name.toLowerCase();
    return pName.includes(cleanState) || cleanState.includes(pName);
  });

  if (!provinceMatch) return { province: '', city: '' };

  let cityMatchName = '';
  if (cityName) {
    const cleanCity = cityName
      .toLowerCase()
      .replace(/^(kota|kabupaten)\s+/, '')
      .trim();

    // Find city in matched province
    const matchedCity = provinceMatch.cities.find((c) => {
      const cName = c.name
        .toLowerCase()
        .replace(/^(kota|kabupaten)\s+/, '')
        .trim();
      return (
        cName === cleanCity ||
        cName.includes(cleanCity) ||
        cleanCity.includes(cName)
      );
    });

    if (matchedCity) {
      cityMatchName = matchedCity.name;
    }
  }

  return {
    province: provinceMatch.name,
    city: cityMatchName
  };
};

interface LocationSelectorProps {
  form: UseFormReturn<any>;
  namePrefix?: string; // used for multi-branch arrays like "branches.0"
}

export function LocationSelector({ form, namePrefix }: LocationSelectorProps) {
  const googleMapsUrlName = namePrefix
    ? `${namePrefix}.googleMapsUrl`
    : 'googleMapsUrl';
  const latitudeName = namePrefix ? `${namePrefix}.latitude` : 'latitude';
  const longitudeName = namePrefix ? `${namePrefix}.longitude` : 'longitude';
  const provinceName = namePrefix ? `${namePrefix}.province` : 'province';
  const cityName = namePrefix ? `${namePrefix}.city` : 'city';
  const addressName = namePrefix ? `${namePrefix}.address` : 'address';

  const currentProvince = form.watch(provinceName);

  const provinceOptions = React.useMemo(
    () => INDONESIA_REGIONS.map((p) => ({ value: p.name, label: p.name })),
    []
  );

  const cityOptions = React.useMemo(() => {
    if (!currentProvince) return [];
    const province = INDONESIA_REGIONS.find((p) => p.name === currentProvince);
    if (!province) return [];
    return province.cities.map((c) => ({ value: c.name, label: c.name }));
  }, [currentProvince]);

  const handleProvinceChange = (val: string) => {
    form.setValue(provinceName, val, {
      shouldValidate: true,
      shouldDirty: true
    });
    form.setValue(cityName, '', { shouldValidate: true, shouldDirty: true });
  };

  const handleCityChange = (val: string) => {
    form.setValue(cityName, val, { shouldValidate: true, shouldDirty: true });
  };

  const triggerReverseGeocode = (lat: number, lng: number) => {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&accept-language=id&lat=${lat}&lon=${lng}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (data && data.address) {
          const addr = data.address;
          const parts: string[] = [];

          // 1. Building / Place Name (e.g. Sinar Utama)
          const placeName =
            addr.amenity ||
            addr.restaurant ||
            addr.shop ||
            addr.office ||
            addr.building ||
            addr.tourism ||
            addr.historic ||
            addr.leisure;

          // 2. Road and House Number (nomor bangunan)
          let roadWithNo = addr.road || '';
          if (roadWithNo && addr.house_number) {
            roadWithNo += ` No. ${addr.house_number}`;
          } else if (addr.house_number) {
            roadWithNo = `No. ${addr.house_number}`;
          }

          // Combine place and road
          if (placeName && roadWithNo) {
            parts.push(`${placeName}, ${roadWithNo}`);
          } else if (placeName) {
            parts.push(placeName);
          } else if (roadWithNo) {
            parts.push(roadWithNo);
          }

          // 3. Kelurahan / Suburb
          const subDistrict =
            addr.neighbourhood || addr.suburb || addr.village || addr.hamlet;
          if (subDistrict) {
            parts.push(subDistrict);
          }

          // 4. Kecamatan / District
          const district = addr.city_district || addr.subdistrict;
          if (district) {
            parts.push(district);
          }

          // Fallback to display_name if no parts generated
          const fullAddress =
            parts.length > 0 ? parts.join(', ') : data.display_name || '';
          if (fullAddress) {
            form.setValue(addressName, fullAddress, {
              shouldValidate: true,
              shouldDirty: true
            });
          }

          // 5. Provinsi & Kota
          const state = addr.state || addr.province || addr.region;
          const cityVal =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.city_district ||
            addr.suburb;

          const match = findRegionMatch(state, cityVal);
          if (match.province) {
            form.setValue(provinceName, match.province, {
              shouldValidate: true,
              shouldDirty: true
            });
            if (match.city) {
              form.setValue(cityName, match.city, {
                shouldValidate: true,
                shouldDirty: true
              });
            }
          }
        }
      })
      .catch((err) => {
        console.error('Failed to reverse geocode coordinates:', err);
      });
  };

  const handleGoogleMapsUrlParse = (url: string) => {
    if (!url) return;

    // Pattern 1: @latitude,longitude
    // Pattern 2: q=latitude,longitude
    // Pattern 3: ll=latitude,longitude
    const regexAt = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
    const regexQuery = /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/;
    const regexLL = /[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/;

    let match = url.match(regexAt);
    if (!match) match = url.match(regexQuery);
    if (!match) match = url.match(regexLL);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        form.setValue(latitudeName, lat, {
          shouldValidate: true,
          shouldDirty: true
        });
        form.setValue(longitudeName, lng, {
          shouldValidate: true,
          shouldDirty: true
        });
        toast.success('Koordinat berhasil diekstrak dari Link Google Maps');
        triggerReverseGeocode(lat, lng);
      }
    }
  };

  const latitudeVal = form.watch(latitudeName);
  const longitudeVal = form.watch(longitudeName);

  return (
    <div className="border border-gray-150 rounded-sm p-4 bg-gray-50/40 space-y-4">
      {/* ── Titik Lokasi Peta & Google Maps ─────────────────── */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          {/* Google Maps Link Input */}
          <div className="col-span-2">
            <FormInput
              form={form}
              name={googleMapsUrlName}
              label="Link Google Maps"
              placeholder="Tempel link Google Maps (share link) di sini..."
              onChange={(e: any) => {
                const val = e.target.value;
                handleGoogleMapsUrlParse(val);
              }}
            />
          </div>

          {/* Latitude & Longitude Inputs */}
          <FormInput
            form={form}
            name={latitudeName}
            label="Latitude (Garis Lintang)"
            placeholder="Contoh: 3.5835"
          />
          <FormInput
            form={form}
            name={longitudeName}
            label="Longitude (Garis Bujur)"
            placeholder="Contoh: 98.6634"
          />
        </div>

        {/* Map Picker Component */}
        <div className="w-full">
          <MapPicker
            latitude={latitudeVal ? Number(latitudeVal) : undefined}
            longitude={longitudeVal ? Number(longitudeVal) : undefined}
            onChange={(lat, lng) => {
              form.setValue(latitudeName, lat, {
                shouldValidate: true,
                shouldDirty: true
              });
              form.setValue(longitudeName, lng, {
                shouldValidate: true,
                shouldDirty: true
              });

              const currentUrl = form.getValues(googleMapsUrlName);
              if (
                !currentUrl ||
                currentUrl.startsWith('https://www.google.com/maps?q=')
              ) {
                form.setValue(
                  googleMapsUrlName,
                  `https://www.google.com/maps?q=${lat},${lng}`,
                  { shouldDirty: true }
                );
              }

              triggerReverseGeocode(lat, lng);
            }}
          />
        </div>
      </div>

      {/* ── Wilayah & Alamat Lengkap (Autofilled) ─────────────────── */}
      <div className="border-t border-gray-200 pt-4 space-y-4">
        <div>
          <span className="text-xs font-semibold text-gray-700">
            Detail Wilayah & Alamat
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <ReusableSelect
            form={form}
            name={provinceName}
            label="Provinsi"
            searchable={true}
            options={provinceOptions}
            value={form.watch(provinceName) || ''}
            onChange={handleProvinceChange}
            placeholder="Pilih Provinsi..."
          />
          <ReusableSelect
            form={form}
            name={cityName}
            label="Kota"
            searchable={true}
            options={cityOptions}
            value={form.watch(cityName) || ''}
            onChange={handleCityChange}
            placeholder={
              currentProvince ? 'Pilih Kota...' : 'Pilih Provinsi dulu'
            }
            disabled={!currentProvince}
          />
        </div>

        <FormInput
          form={form}
          name={addressName}
          label="Alamat Lengkap"
          placeholder="Jl. Raya ..."
          rows={3}
        />
      </div>
    </div>
  );
}
