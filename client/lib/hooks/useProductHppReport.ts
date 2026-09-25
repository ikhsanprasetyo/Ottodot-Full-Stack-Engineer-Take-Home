import { useMemo } from 'react';
import { RTUProductionBatch } from '@/lib/type/rtu_production_batch';
import {
  ProductMonthlyHppSummary,
  MonthlyHppReportStats
} from '@/lib/type/rtu_product_hpp_report';

export function useProductHppReport(batches: RTUProductionBatch[]) {
  return useMemo(() => {
    // Exclude cancelled batches
    const validBatches = batches.filter((b) => b.status !== 'cancelled');

    const productMap = new Map<string, ProductMonthlyHppSummary>();
    let grandTotalMaterialCost = 0;
    let grandTotalLaborCost = 0;
    let grandTotalOverheadCost = 0;
    let grandTotalCost = 0;
    let grandTotalQty = 0;

    validBatches.forEach((batch) => {
      const pId = batch.productId || batch.product?._id || 'unknown';
      const pCode = batch.product?.code || '-';
      const pName = batch.product?.name || 'Unassigned Product';
      const catName =
        typeof batch.product?.category === 'object'
          ? batch.product.category?.name || 'General'
          : batch.product?.category || 'General';
      const unitName = batch.product?.outputUnit || 'Pcs';

      const matCost = Number(batch.totalMaterialCost || 0);
      const laborCost = Number(batch.totalLaborCost || 0);
      const overheadCost = Number(batch.totalOverheadCost || 0);
      const totalCost = Number(batch.totalCost || 0);
      const qty = Number(batch.actualQty || 0);

      grandTotalMaterialCost += matCost;
      grandTotalLaborCost += laborCost;
      grandTotalOverheadCost += overheadCost;
      grandTotalCost += totalCost;
      grandTotalQty += qty;

      if (!productMap.has(pId)) {
        productMap.set(pId, {
          productId: pId,
          productCode: pCode,
          productName: pName,
          categoryName: catName,
          unitName: unitName,
          batchCount: 0,
          totalActualQty: 0,
          totalMaterialCost: 0,
          totalLaborCost: 0,
          totalOverheadCost: 0,
          totalCost: 0,
          avgUnitCost: 0,
          contributionPercent: 0,
          batches: [],
          materialBreakdown: []
        });
      }

      const existing = productMap.get(pId)!;
      existing.batchCount += 1;
      existing.totalActualQty += qty;
      existing.totalMaterialCost += matCost;
      existing.totalLaborCost += laborCost;
      existing.totalOverheadCost += overheadCost;
      existing.totalCost += totalCost;
      existing.batches.push(batch);

      // Aggregate material usages for this product
      if (Array.isArray(batch.materialUsages)) {
        batch.materialUsages.forEach((usage) => {
          const mId = usage.materialId || usage.material?._id || 'mat_unknown';
          const mName = usage.material?.name || usage.unit || 'Material';
          const mCode = usage.material?.code || '-';
          const mUnit = usage.unit || usage.material?.unit || 'Unit';
          const uQty = Number(usage.actualQty || usage.plannedQty || 0);
          const uCost = Number(usage.totalCost || 0);

          let matSummary = existing.materialBreakdown.find(
            (m) => m.materialId === mId
          );
          if (!matSummary) {
            matSummary = {
              materialId: mId,
              materialName: mName,
              materialCode: mCode,
              unit: mUnit,
              totalQty: 0,
              totalCost: 0,
              avgUnitCost: 0
            };
            existing.materialBreakdown.push(matSummary);
          }
          matSummary.totalQty += uQty;
          matSummary.totalCost += uCost;
        });
      }
    });

    const productSummaries: ProductMonthlyHppSummary[] = Array.from(
      productMap.values()
    ).map((prod) => {
      const avgUnitCost =
        prod.totalActualQty > 0 ? prod.totalCost / prod.totalActualQty : 0;
      const contributionPercent =
        grandTotalCost > 0 ? (prod.totalCost / grandTotalCost) * 100 : 0;

      // Compute avg unit cost for each material usage
      prod.materialBreakdown.forEach((m) => {
        m.avgUnitCost = m.totalQty > 0 ? m.totalCost / m.totalQty : 0;
      });

      // Sort material breakdown by total cost desc
      prod.materialBreakdown.sort((a, b) => b.totalCost - a.totalCost);

      // Sort batches by plannedDate asc
      prod.batches.sort(
        (a, b) =>
          new Date(a.plannedDate).getTime() - new Date(b.plannedDate).getTime()
      );

      return {
        ...prod,
        avgUnitCost,
        contributionPercent
      };
    });

    // Sort products by total cost descending
    productSummaries.sort((a, b) => b.totalCost - a.totalCost);

    const materialPercent =
      grandTotalCost > 0 ? (grandTotalMaterialCost / grandTotalCost) * 100 : 0;
    const laborPercent =
      grandTotalCost > 0 ? (grandTotalLaborCost / grandTotalCost) * 100 : 0;
    const overheadPercent =
      grandTotalCost > 0 ? (grandTotalOverheadCost / grandTotalCost) * 100 : 0;

    const topProductsByCost = productSummaries.slice(0, 5).map((p) => ({
      name: p.productName,
      cost: p.totalCost,
      percentage: p.contributionPercent
    }));

    const costStructureBreakdown = [
      {
        name: 'Biaya Bahan (Material)',
        value: grandTotalMaterialCost,
        color: '#3b82f6'
      },
      {
        name: 'Tenaga Kerja (Labor)',
        value: grandTotalLaborCost,
        color: '#f59e0b'
      },
      {
        name: 'Operasional (Overhead)',
        value: grandTotalOverheadCost,
        color: '#8b5cf6'
      }
    ].filter((item) => item.value > 0);

    const stats: MonthlyHppReportStats = {
      grandTotalCost,
      grandTotalMaterialCost,
      grandTotalLaborCost,
      grandTotalOverheadCost,
      grandTotalQty,
      totalProductsCount: productSummaries.length,
      totalBatchesCount: validBatches.length,
      materialPercent,
      laborPercent,
      overheadPercent,
      topProductsByCost,
      costStructureBreakdown
    };

    return {
      productSummaries,
      stats
    };
  }, [batches]);
}
