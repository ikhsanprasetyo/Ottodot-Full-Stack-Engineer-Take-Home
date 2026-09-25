import { RTUProductionBatch } from './rtu_production_batch';

export interface ProductMaterialUsageSummary {
  materialId: string;
  materialName: string;
  materialCode: string;
  unit: string;
  totalQty: number;
  totalCost: number;
  avgUnitCost: number;
}

export interface ProductMonthlyHppSummary {
  productId: string;
  productCode: string;
  productName: string;
  categoryName: string;
  unitName: string;
  batchCount: number;
  totalActualQty: number;
  totalMaterialCost: number;
  totalLaborCost: number;
  totalOverheadCost: number;
  totalCost: number;
  avgUnitCost: number; // totalCost / totalActualQty
  contributionPercent: number; // (totalCost / grandTotalCost) * 100
  batches: RTUProductionBatch[];
  materialBreakdown: ProductMaterialUsageSummary[];
}

export interface MonthlyHppReportStats {
  grandTotalCost: number;
  grandTotalMaterialCost: number;
  grandTotalLaborCost: number;
  grandTotalOverheadCost: number;
  grandTotalQty: number;
  totalProductsCount: number;
  totalBatchesCount: number;
  materialPercent: number;
  laborPercent: number;
  overheadPercent: number;
  topProductsByCost: { name: string; cost: number; percentage: number }[];
  costStructureBreakdown: { name: string; value: number; color: string }[];
}
