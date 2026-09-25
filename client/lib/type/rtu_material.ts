import { RTUVendor } from './rtu_vendor';

export interface RTUMaterial {
  _id: string;
  code: string;
  name: string;
  brand?: string;
  category: string;
  unit: string;
  vendorId?: string;
  vendor?: RTUVendor;

  currentPrice: number;
  lastPriceDate?: string;
  currentStock: number;
  minStock: number;
  isActive: boolean;
  description?: string;

  barcode?: string;
  units?: RTUMaterialUnit[];
  imageUrl?: string;

  isDeleted: boolean;
  deletedAt?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RTUMaterialUnit {
  _id?: string;
  materialId?: string;
  unitName: string;
  /** Final conversion to base unit — always stored, used by GRN/price/stock calculations */
  conversion: number;
  /** Intermediate unit this is relative to (Accurate-style). null = relative to base unit */
  relativeToUnit?: string;
  /** User-entered value: 1 [unitName] = relativeConversion [relativeToUnit] */
  relativeConversion?: number;
  barcode?: string;
}

export interface RTUMaterialPriceHistory {
  _id: string;
  materialId: string;
  material?: RTUMaterial;
  vendorId?: string;
  vendor?: RTUVendor;
  price: number;
  effectiveDate: string;
  source: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}

export interface RTUStockLedger {
  _id: string;
  materialId: string;
  material?: RTUMaterial;
  movementType: string;
  qty: number;
  unit: string;
  refType: string;
  refId?: string;
  balanceAfter: number;
  priceAtTime: number;
  notes?: string;
  createdBy?: string;
  createdAt: string;
}
