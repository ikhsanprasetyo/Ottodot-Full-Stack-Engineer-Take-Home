export interface VendorBankAccount {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

/** Unified contact entry: name + phone + email in a single object. */
export interface VendorContact {
  name: string;
  phone: string;
  email: string;
}

/** Social media / store link for a vendor. */
export interface VendorLink {
  type: 'shopee' | 'instagram' | 'tokopedia' | 'website' | 'other';
  url: string;
  label?: string; // used when type === 'other'
}

export interface VendorBranch {
  name: string;
  address: string;
  city: string;
  province: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

export interface RTUVendor {
  _id: string;
  code: string;
  name: string;
  category: string;
  contacts?: VendorContact[];
  links?: VendorLink[];
  branches?: VendorBranch[];
  paymentTermDays: number;
  isActive: boolean;
  notes?: string;
  bankAccounts?: VendorBankAccount[];

  // Legacy fields for backward compatibility (pre-migration data)
  contact?: string;
  phone?: string | string[];
  address?: string;
  city?: string;
  province?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;

  isDeleted: boolean;
  deletedAt?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
