export interface Outlet {
  _id: string;
  name: string;
  label: string;
  outletID?: number;
  address?: string;
  subDistrict?: string;
  district?: string;
  city?: string;
  region?: string;
  state?: string;

  totalEmployees?: number;
  totalPermanentEmployees?: number;
  totalProbationEmployees?: number;
  totalMen?: number;
  totalWomen?: number;
  totalShiftPerDay?: number;

  abbreviation?: string;
  dateFound?: string | Date;

  // in minutes
  lateInTolerance?: number;
  type?: string;

  // soft delete
  isDeleted?: boolean;
  deletedAt?: string | Date | null;

  image?: string | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}
