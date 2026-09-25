'use client';

import { useState } from 'react';
import { SortingState } from '@tanstack/react-table';
import { AlertTriangle, Tags, Factory, Download } from 'lucide-react';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetRTUProducts } from '@/lib/hooks/queries/rtu-product';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { TableData } from '@/components/ui/table-data';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { exportToExcel } from '@/lib/utils/excel-export';
import { ProductLotsDialog } from './product-lots-dialog';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { ReusableSelect } from '@/components/ui/reusable-select';
import { useGetRTUCategories } from '@/lib/hooks/queries/rtu-category';
import { Button } from '@/components/ui/button';
import WaterProgressBar from '@/components/ui/water-progress-bar';

export default function ProductStockPage() {
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedOutletId, setSelectedOutletId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'code', desc: false }
  ]);

  const { data, isLoading: isDataLoading } = useGetRTUProducts(
    globalFilter,
    true, // only active products
    selectedOutletId,
    selectedCategory
  );

  const { data: categoriesData } = useGetRTUCategories('', true);
  const categories = categoriesData?.data || [];

  const products = data?.data || [];

  // Filter products with negative stock
  const negativeStockProducts = products.filter((p: any) => p.currentStock < 0);

  const columns = [
    {
      header: '#',
      id: 'index',
      cell: (info: any) => (
        <div className="py-0">
          <span className="text-[11px] text-gray-500 font-medium">
            {info.row.index + 1}
          </span>
        </div>
      ),
      size: 15,
      sticky: 'left' as const
    },
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-medium text-[11px] text-gray-800 tracking-tight">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-medium text-[11px] text-gray-900">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-semibold text-[11px] text-gray-700">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Stock',
      accessorKey: 'currentStock',
      cell: (info: any) => {
        const stock = info.getValue() as number;
        const minStock = (info.row.original.minStock as number) || 0;
        const unit = info.row.original.outputUnit;

        // Hitung persentase terhadap stok minimum
        const percentage =
          minStock > 0 ? (stock / minStock) * 100 : stock > 0 ? 100 : 0;
        const isLow = minStock > 0 && stock < minStock;
        const isNegative = stock < 0;

        // Tentukan skema warna dinamis
        let colorFrom = '#10b981'; // Emerald
        let colorTo = '#0d9488';

        if (stock <= 0) {
          colorFrom = '#f87171'; // Red
          colorTo = '#ef4444';
        } else if (isLow) {
          colorFrom = '#fbbf24'; // Amber
          colorTo = '#f59e0b';
        }

        return (
          <div className="flex flex-col gap-1 w-full max-w-[140px] py-1">
            <div className="flex items-center justify-between text-[10px] font-medium text-gray-500">
              <span className="text-[11px] text-gray-800">
                {stock} <span className="text-gray-400">{unit}</span>
              </span>
              {minStock > 0 ? (
                <span className="text-[9px]">
                  Min: {minStock} {unit}
                </span>
              ) : (
                isNegative && (
                  <span className="text-[9px] text-red-500 font-bold flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" /> Deficit
                  </span>
                )
              )}
            </div>
            <WaterProgressBar
              value={percentage}
              height={8}
              colorFrom={colorFrom}
              colorTo={colorTo}
              decimals={0}
              className="mt-0.5"
            />
          </div>
        );
      }
    },
    {
      header: 'Output Unit',
      accessorKey: 'outputUnit',
      cell: (info: any) => (
        <div className="py-0">
          <span className="font-bold text-[10px] text-gray-600">
            {info.getValue()}
          </span>
        </div>
      )
    },
    {
      header: 'Recipe Status',
      accessorKey: 'recipe',
      cell: (info: any) => {
        const recipe = info.getValue();
        if (!recipe)
          return (
            <div className="py-0">
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                No Recipe
              </Badge>
            </div>
          );
        return (
          <div className="py-0">
            <Badge
              variant="default"
              className="bg-emerald-600 text-[9px] px-1.5 py-0"
            >
              Active Recipe
            </Badge>
          </div>
        );
      }
    }
  ];
  const handleExport = () => {
    const sortedProducts = [...products].sort((a: any, b: any) =>
      (a.code || '').localeCompare(b.code || '')
    );
    const exportData = sortedProducts.map((p: any) => ({
      Code: p.code,
      Name: p.name,
      Category: p.category,
      'Current Stock': p.currentStock,
      Unit: p.outputUnit,
      Recipe: p.recipe ? 'Yes' : 'No'
    }));
    exportToExcel(
      exportData,
      `RTU_Stok_Produk_${new Date().toISOString().split('T')[0]}`,
      'Stok Produk'
    );
  };

  return (
    <DashboardLayout>
      <div className="w-full space-y-6">
        <ReusableTitle
          title="Laporan Stok Produk (Ready-to-Use)"
          subtitle="Pantau persediaan produk siap jual / kirim di setiap outlet secara real-time dengan alokasi FIFO."
          borderColorClass="border-l-indigo-500"
          actions={
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={products.length === 0}
              icon={Download}
            >
              Export Excel
            </Button>
          }
          icon={Factory}
          iconColorClass="text-indigo-400"
        />

        {/* Global Filter */}
        <div className="bg-white p-6 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
          <OutletSelector
            value={selectedOutletId}
            onSelect={setSelectedOutletId}
            className="w-full md:w-80"
            label="Cabang"
            autoSelectFirst={true}
          />
          <div className="w-full md:w-80">
            <ReusableSelect
              label="Kategori"
              icon={Tags}
              value={selectedCategory || 'ALL'}
              onChange={(v) =>
                setSelectedCategory(v === 'ALL' ? '' : String(v))
              }
              options={[
                { label: 'Semua Kategori', value: 'ALL' },
                ...categories.map((c: any) => ({
                  label: c.name,
                  value: c.name
                }))
              ]}
              triggerClassName="h-10 border-gray-200 text-sm"
              searchable={false}
              save={true}
              saveKey="productStockCategoryFilter"
            />
          </div>
          <div className="text-xs text-gray-500 pb-2 italic">
            * Menampilkan kuantitas stok yang tersedia di cabang terpilih.
          </div>
        </div>

        {/* Negative Stock Alerts */}
        {negativeStockProducts.length > 0 && (
          <Alert
            variant="destructive"
            className="border-red-200 bg-red-50/50 rounded-sm"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle className="font-black text-sm uppercase tracking-wide">
              Peringatan Defisit Stok
            </AlertTitle>
            <AlertDescription className="text-xs font-semibold mt-1">
              Terdapat {negativeStockProducts.length} produk dengan stok negatif
              (defisit) di outlet ini. Kuantitas ini akan direkonsiliasi
              otomatis setelah barang masuk.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Table */}
        <TableData
          data={products}
          columns={columns}
          sorting={sorting}
          onSortingChange={setSorting}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={isDataLoading && products.length === 0}
          renderActions={(item: any) => (
            <div className="flex justify-start py-0">
              <ProductLotsDialog product={item} outletId={selectedOutletId} />
            </div>
          )}
        />
      </div>
    </DashboardLayout>
  );
}
