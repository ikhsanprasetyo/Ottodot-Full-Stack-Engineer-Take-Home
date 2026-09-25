export type PurchaseStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
export type PurchaseType = 'PRODUCT' | 'MATERIAL';

export interface RTUPurchaseItem {
  _id: string;
  purchaseId: string;
  productId?: string;
  product?: {
    _id: string;
    name: string;
    code: string;
    outputUnit: string;
  };
  materialId?: string;
  material?: {
    _id: string;
    name: string;
    code: string;
    unit: string;
    brand?: string;
  };
  qty: number;
  unit: string;
  conversion: number;
  unitPrice: number;
  discount?: number;
  notes?: string;
}

export interface RTUPurchase {
  _id: string;
  docNumber: string;
  buyerId: string;
  buyer?: {
    _id: string;
    name: string;
    label: string;
    type: string;
    address?: string;
  };
  sellerId?: string;
  seller?: {
    _id: string;
    name: string;
    label: string;
    type: string;
    address?: string;
  };
  vendorId?: string;
  vendor?: {
    _id: string;
    name: string;
    code: string;
    picName?: string;
    picPhone?: string;
    phone?: string;
    address?: string;
    contactPerson?: string;
  };
  type: PurchaseType;
  status: PurchaseStatus;
  isLoan?: boolean;
  notes: string;
  paymentType: string;
  dpAmount: number;
  taxPercent: number;
  shippingFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  requestDate: string;
  processDate?: string;
  receivedDate?: string;
  items: RTUPurchaseItem[];
  isDeleted: boolean;
  createdBy?: string;
  updatedBy?: string;
  creator?: {
    _id: string;
    name: string;
  };
  histories?: RTUPurchaseHistory[];
  additionalCosts?: AdditionalCost[];
  createdAt: string;
  updatedAt: string;
}

export interface AdditionalCost {
  name: string;
  amount: number;
  notes?: string;
}

export type RTUPurchaseHistory = {
  _id: string;
  purchaseId: string;
  action: string;
  changes: string;
  performedBy?: string;
  createdAt: string;
  performer?: {
    _id: string;
    name: string;
  };
};
