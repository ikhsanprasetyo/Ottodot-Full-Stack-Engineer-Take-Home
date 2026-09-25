import { RTUMaterial } from './rtu_material';

export type MovementType = 'IN' | 'OUT' | 'ADJUSTMENT' | 'TRANSFER';

export interface RTUStockLedger {
  _id: string;
  materialId: string;
  material?: RTUMaterial;
  outletId?: string;
  outlet?: {
    _id: string;
    name: string;
    label?: string;
    region?: string;
  };
  movementType: MovementType;
  qty: number;
  unit: string;
  refType: string;
  refId?: string;
  balanceAfter: number;
  priceAtTime: number;
  notes?: string;
  createdBy?: string;
  creator?: {
    _id?: string;
    name?: string;
    username?: string;
    email?: string;
    positionDoc?: { title?: string };
  };
  createdAt: string;
}
