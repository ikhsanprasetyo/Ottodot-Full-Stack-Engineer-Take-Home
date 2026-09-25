import { RTUMaterial } from './rtu_material';
import { RTUVendor } from './rtu_vendor';
import { RTUPurchase, AdditionalCost } from './rtu_purchase';

export type GRNStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface RTUGRNItem {
  _id?: string;
  grnId?: string;
  materialId?: string;
  material?: RTUMaterial;
  productId?: string;
  product?: {
    _id: string;
    name: string;
    code: string;
  };
  qtyReceived: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  subtotal: number;
}

export interface RTUGRN {
  _id: string;
  grnNumber: string;
  purchaseId?: string;
  purchase?: RTUPurchase;
  vendorId?: string;
  vendor?: RTUVendor;
  outletId: string;
  outlet?: {
    _id: string;
    name: string;
    label: string;
  };
  status: GRNStatus;
  receiptDate: string;
  notes?: string;
  totalAmount: number;
  items: RTUGRNItem[];
  paymentType?: 'DP' | 'Pelunasan';
  dpAmount?: number;
  taxPercent?: number;
  shippingFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  additionalCosts?: AdditionalCost[];
  isDeleted: boolean;
  creator?: {
    _id: string;
    name: string;
  };
  histories?: RTUGRNHistory[];
  createdAt: string;
  updatedAt: string;
}

export type RTUGRNHistory = {
  _id: string;
  grnId: string;
  action: string;
  changes: string;
  performedBy?: string;
  createdAt: string;
  performer?: {
    _id: string;
    name: string;
  };
};

export interface CreateGRNInput {
  purchaseId?: string;
  vendorId?: string;
  receiptDate: string;
  notes?: string;
  shippingFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  additionalCosts?: AdditionalCost[];
  items: {
    materialId: string;
    qtyReceived: number;
    unit: string;
    unitPrice: number;
  }[];
}
