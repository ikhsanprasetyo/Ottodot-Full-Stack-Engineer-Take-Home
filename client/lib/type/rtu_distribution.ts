import { RTUProduct } from './rtu_product';
import { RTUMaterial } from './rtu_material';
import { Outlet } from './outlet';
import { RTUVendor } from './rtu_vendor';

export type DistributionStatus = 'DRAFT' | 'SHIPPED' | 'RECEIVED' | 'CANCELLED';
export type DistributionType = 'PRODUCT' | 'MATERIAL';

export interface RTUDistributionItem {
  _id: string;
  distributionId: string;
  productId?: string;
  product?: RTUProduct;
  materialId?: string;
  material?: RTUMaterial;
  qty: number;
  unit: string;
  unitPrice?: number;
  notes?: string;
}

export interface RTUDistributionHistory {
  _id: string;
  distributionId: string;
  action: string;
  changes: string;
  performedBy?: string;
  createdAt: string;
  performer?: {
    _id: string;
    name: string;
  };
}

export interface RTUDistribution {
  _id: string;
  docNumber: string;
  outletId?: string;
  outlet?: Outlet;
  vendorId?: string;
  vendor?: RTUVendor;
  sourceOutletId?: string;
  sourceOutlet?: Outlet;
  type: DistributionType;
  status: DistributionStatus;
  shipmentDate?: string;
  receivedDate?: string;
  notes?: string;
  items: RTUDistributionItem[];
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
  creator?: {
    _id: string;
    name: string;
  };
  updater?: {
    _id: string;
    name: string;
  };
  histories?: RTUDistributionHistory[];
}
