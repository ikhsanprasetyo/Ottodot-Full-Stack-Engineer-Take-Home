import { RTUMaterial } from './rtu_material';
import { RTUProduct } from './rtu_product';
import { RTURecipeVersion } from './rtu_recipe';
import { Outlet } from './outlet';

export type ProductionBatchStatus =
  'planned' | 'in_progress' | 'completed' | 'cancelled';

export interface RTUMaterialUsage {
  _id: string;
  batchId: string;
  recipeIngredientId?: string;
  materialId: string;
  material?: RTUMaterial;
  plannedQty: number;
  actualQty: number;
  unit: string;
  unitCost: number;
  totalCost: number;
}

export interface RTULaborItem {
  _id: string;
  batchId: string;
  description: string;
  workerCount: number;
  hoursWorked: number;
  ratePerHour: number;
  totalCost: number;
}

export interface RTUOverheadItem {
  _id: string;
  batchId: string;
  description: string;
  cost: number;
}

export interface RTUProductionBatchHistory {
  _id: string;
  batchId: string;
  action: string;
  changes: string;
  performedBy?: string;
  performer?: { _id: string; name: string; positionDoc?: { title: string } };
  createdAt: string;
}

export interface RTUProductionBatch {
  _id: string;
  batchNumber: string;
  productId: string;
  product?: RTUProduct;
  outletId: string;
  outlet?: Outlet;
  recipeVersionId: string;
  recipeVersion?: RTURecipeVersion;
  status: ProductionBatchStatus;
  actualQty: number;
  plannedDate: string;
  completedDate?: string;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalCost: number;
  unitCost?: number;
  notes?: string;
  materialUsages: RTUMaterialUsage[];
  laborItems: RTULaborItem[];
  overheadItems: RTUOverheadItem[];
  histories?: RTUProductionBatchHistory[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  creator?: { _id: string; name: string; positionDoc?: { title: string } };
  updatedBy?: string;
  updater?: { _id: string; name: string; positionDoc?: { title: string } };
}

export interface CreateProductionBatchInput {
  productId: string;
  recipeVersionId: string;
  actualQty: number;
  plannedDate: string;
  notes?: string;
}

export interface CompleteProductionBatchInput {
  actualQty: number;
  notes?: string;
  materialUsages: {
    _id?: string;
    materialId: string;
    actualQty: number;
  }[];
  laborItems: {
    description: string;
    workerCount: number;
    hoursWorked: number;
    ratePerHour: number;
  }[];
  overheadItems: {
    description: string;
    cost: number;
  }[];
}
