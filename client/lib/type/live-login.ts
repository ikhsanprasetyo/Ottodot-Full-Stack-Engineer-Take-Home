export type UpdateLiveLoginInput = {
  latitude?: number | null;
  longitude?: number | null;
  accuracy?: number | null; // meters
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
  address?: {
    suburb?: string | null; // kelurahan
    city_district: string | null; // kecamatan
    city: string | null; // kota/kabupaten
    village: string | null;
    country?: string | null;
    country_code?: string | null;
    post_code?: string | null;
    region?: string | null;
    state?: string | null;
  } | null;
  type?: string | null; // residential, commercial
  addresstype?: string | null; // road, airport
  display_name?: string | null; // alamat lengkap
  city?: string | null;
  region?: string | null;
  country?: string | null;
  source?: string | null; // 'gps' | 'geoip'
  isGps?: boolean | null;
};

export type LoginLocation = UpdateLiveLoginInput;

export type LiveLogin = {
  isOnline: boolean;
  location?: LoginLocation | null;
  ip?: string | null;
  lastSeenAt?: string | null;
};
