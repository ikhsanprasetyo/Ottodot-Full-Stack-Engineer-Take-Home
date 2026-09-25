import { RTUMaterial } from './rtu_material';
import { RTUVendor } from './rtu_vendor';
import { RTUGRN } from './rtu_grn';
import { RTUPurchase, AdditionalCost } from './rtu_purchase';

export type InvoiceReconcileStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface RTUInvoiceReconcileItem {
  _id?: string;
  invoiceId?: string;
  materialId: string;
  material?: RTUMaterial;
  qtyInvoiced: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  subtotal: number;
}

export interface RTUInvoiceReconcile {
  _id: string;
  invoiceNumber: string;
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
  status: InvoiceReconcileStatus;
  invoiceDate: string;
  taxPercent?: number;
  shippingFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  notes?: string;
  additionalCosts?: AdditionalCost[];
  totalAmount: number;
  items: RTUInvoiceReconcileItem[];
  grns?: RTUGRN[];
  isDeleted: boolean;
  creator?: {
    _id: string;
    name: string;
  };
  histories?: RTUInvoiceReconcileHistory[];
  createdAt: string;
  updatedAt: string;
}

export type RTUInvoiceReconcileHistory = {
  _id: string;
  invoiceId: string;
  action: string;
  changes: string;
  performedBy?: string;
  createdAt: string;
  performer?: {
    _id: string;
    name: string;
  };
};

export interface CreateInvoiceReconcileInput {
  purchaseId?: string;
  vendorId?: string;
  outletId: string;
  invoiceDate: string;
  taxPercent?: number;
  shippingFee?: number;
  loadingFee?: number;
  unloadingFee?: number;
  notes?: string;
  additionalCosts?: AdditionalCost[];
  grnIds?: string[];
  items: {
    materialId: string;
    qtyInvoiced: number;
    unit: string;
    unitPrice: number;
    discount?: number;
  }[];
}
