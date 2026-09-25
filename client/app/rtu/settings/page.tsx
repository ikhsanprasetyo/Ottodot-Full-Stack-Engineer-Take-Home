'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { Authorized } from '@/components/ui/authorized';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TableData, ExtendedColumnDef } from '@/components/ui/table-data';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { ReusableSwitch } from '@/components/ui/reusable-switch';
import { ReusableTitle } from '@/components/ui/reusable-title';
import { OutletSelector } from '@/components/shared/outlet-selector';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings,
  isBoolean
} from '@/lib/localStorage';
import { useGetOutlets } from '@/lib/hooks/queries/outlet';
import { useGetRTUMaterials } from '@/lib/hooks/queries/rtu-material';
import { useGetRTUProducts } from '@/lib/hooks/queries/rtu-product';
import {
  useGetMaterialPriceBackups,
  useGetProductPriceBackups,
  useCopyMaterialPrices,
  useCopyProductPrices,
  useRestoreMaterialPriceBackup,
  useRestoreProductPriceBackup,
  PriceBackupRecord
} from '@/lib/hooks/queries/rtu-price-backup';
import { toIDR } from '@/lib/utils';
import dayjs from 'dayjs';
import {
  Terminal,
  Settings,
  Copy,
  Download,
  RotateCcw,
  Package,
  Boxes,
  ArrowRight,
  ShieldCheck,
  History,
  Building2,
  Cpu,
  HardDrive,
  Trash2,
  Wifi
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [mounted, setMounted] = useState(false);
  const [wsDebuggerEnabled, setWsDebuggerEnabled] = useState(false);
  const [mainTab, setMainTab] = useState<'developer' | 'price-transfer'>(
    'developer'
  );
  const [activeTab, setActiveTab] = useState<'material' | 'product'>(
    'material'
  );

  // Outlets
  const { data: outletsData } = useGetOutlets();
  const outlets = useMemo(() => outletsData?.data || [], [outletsData?.data]);

  // Material Outlets selection
  const [sourceMaterialOutletId, setSourceMaterialOutletId] =
    useState<string>('');
  const [targetMaterialOutletId, setTargetMaterialOutletId] =
    useState<string>('');

  // Product Outlets selection
  const [sourceProductOutletId, setSourceProductOutletId] =
    useState<string>('');
  const [targetProductOutletId, setTargetProductOutletId] =
    useState<string>('');

  // Auto-select first two distinct outlets
  useEffect(() => {
    if (outlets.length >= 1) {
      if (!sourceMaterialOutletId) setSourceMaterialOutletId(outlets[0]._id);
      if (!sourceProductOutletId) setSourceProductOutletId(outlets[0]._id);

      if (outlets.length >= 2) {
        if (!targetMaterialOutletId) setTargetMaterialOutletId(outlets[1]._id);
        if (!targetProductOutletId) setTargetProductOutletId(outlets[1]._id);
      }
    }
  }, [
    outlets,
    sourceMaterialOutletId,
    targetMaterialOutletId,
    sourceProductOutletId,
    targetProductOutletId
  ]);

  useEffect(() => {
    setMounted(true);
    const saved = getLocalStorageSettings(
      'settings',
      'wsDebuggerEnabled',
      isBoolean
    );
    setWsDebuggerEnabled(Boolean(saved));
  }, []);

  const handleToggle = (checked: boolean) => {
    setWsDebuggerEnabled(checked);
    updateLocalStorageSettings('settings', 'wsDebuggerEnabled', checked);
    window.dispatchEvent(new Event('settings-updated'));
  };

  const handleClearLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.includes('settings') ||
            key.includes('limit') ||
            key.includes('table'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
      toast.success('Cache pengaturan lokal berhasil dibersihkan');
    }
  };

  // Queries for Materials
  const { data: sourceMaterialsData, isLoading: isLoadingSourceMat } =
    useGetRTUMaterials('', undefined, undefined, sourceMaterialOutletId);
  const { data: targetMaterialsData, isLoading: isLoadingTargetMat } =
    useGetRTUMaterials('', undefined, undefined, targetMaterialOutletId);

  const sourceMaterials = useMemo(
    () => sourceMaterialsData?.data || [],
    [sourceMaterialsData?.data]
  );
  const targetMaterials = useMemo(
    () => targetMaterialsData?.data || [],
    [targetMaterialsData?.data]
  );

  // Queries for Products
  const { data: sourceProductsData, isLoading: isLoadingSourceProd } =
    useGetRTUProducts('', undefined, sourceProductOutletId);
  const { data: targetProductsData, isLoading: isLoadingTargetProd } =
    useGetRTUProducts('', undefined, targetProductOutletId);

  const sourceProducts = useMemo(
    () => sourceProductsData?.data || [],
    [sourceProductsData?.data]
  );
  const targetProducts = useMemo(
    () => targetProductsData?.data || [],
    [targetProductsData?.data]
  );

  // Price Backups
  const { data: materialBackupsData } = useGetMaterialPriceBackups(
    targetMaterialOutletId
  );
  const { data: productBackupsData } = useGetProductPriceBackups(
    targetProductOutletId
  );

  const materialBackups = useMemo(
    () => materialBackupsData?.data || [],
    [materialBackupsData?.data]
  );
  const productBackups = useMemo(
    () => productBackupsData?.data || [],
    [productBackupsData?.data]
  );

  // Mutations
  const copyMaterialMutation = useCopyMaterialPrices();
  const copyProductMutation = useCopyProductPrices();
  const restoreMaterialMutation = useRestoreMaterialPriceBackup();
  const restoreProductMutation = useRestoreProductPriceBackup();

  // Confirmation States
  const [showCopyConfirm, setShowCopyConfirm] = useState(false);
  const [selectedBackupToRestore, setSelectedBackupToRestore] =
    useState<PriceBackupRecord | null>(null);

  const sourceName =
    outlets.find(
      (o: any) =>
        o._id ===
        (activeTab === 'material'
          ? sourceMaterialOutletId
          : sourceProductOutletId)
    )?.label || 'Cabang Asal';

  const targetName =
    outlets.find(
      (o: any) =>
        o._id ===
        (activeTab === 'material'
          ? targetMaterialOutletId
          : targetProductOutletId)
    )?.label || 'Cabang Tujuan';

  // Material Table Comparison Data
  const materialComparison = useMemo(() => {
    const targetMap = new Map<string, number>();
    targetMaterials.forEach((tm: any) => {
      targetMap.set(tm._id, tm.currentPrice || 0);
    });

    return sourceMaterials.map((sm: any) => {
      const targetPrice = targetMap.get(sm._id) ?? 0;
      return {
        _id: sm._id,
        code: sm.code || '-',
        name: sm.name || 'Unknown',
        unit: sm.unit || 'pcs',
        sourcePrice: sm.currentPrice || 0,
        targetPrice: targetPrice
      };
    });
  }, [sourceMaterials, targetMaterials]);

  // Product Table Comparison Data
  const productComparison = useMemo(() => {
    const targetMap = new Map<string, number>();
    targetProducts.forEach((tp: any) => {
      targetMap.set(tp._id, tp.currentPrice || 0);
    });

    return sourceProducts.map((sp: any) => {
      const targetPrice = targetMap.get(sp._id) ?? 0;
      return {
        _id: sp._id,
        code: sp.code || '-',
        name: sp.name || 'Unknown',
        outputUnit: sp.outputUnit || 'pcs',
        sourcePrice: sp.currentPrice || 0,
        targetPrice: targetPrice
      };
    });
  }, [sourceProducts, targetProducts]);

  // Execute Copy Mutation
  const handleExecuteCopy = async () => {
    if (activeTab === 'material') {
      if (!sourceMaterialOutletId || !targetMaterialOutletId) return;
      try {
        await copyMaterialMutation.mutateAsync({
          sourceOutletId: sourceMaterialOutletId,
          targetOutletId: targetMaterialOutletId,
          notes: `Auto backup sebelum copy harga material dari ${sourceName} ke ${targetName}`
        });
        toast.success(
          `Berhasil menyalin seluruh harga material dari "${sourceName}" ke "${targetName}". Snapshot backup telah tersimpan.`
        );
        setShowCopyConfirm(false);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || 'Gagal menyalin harga material'
        );
      }
    } else {
      if (!sourceProductOutletId || !targetProductOutletId) return;
      try {
        await copyProductMutation.mutateAsync({
          sourceOutletId: sourceProductOutletId,
          targetOutletId: targetProductOutletId,
          notes: `Auto backup sebelum copy harga produk dari ${sourceName} ke ${targetName}`
        });
        toast.success(
          `Berhasil menyalin seluruh harga produk dari "${sourceName}" ke "${targetName}". Snapshot backup telah tersimpan.`
        );
        setShowCopyConfirm(false);
      } catch (err: any) {
        toast.error(
          err?.response?.data?.message || 'Gagal menyalin harga produk'
        );
      }
    }
  };

  // Execute Restore Mutation
  const handleExecuteRestore = async () => {
    if (!selectedBackupToRestore) return;
    try {
      if (selectedBackupToRestore.entityType === 'MATERIAL') {
        await restoreMaterialMutation.mutateAsync(selectedBackupToRestore._id);
        toast.success(
          `Berhasil me-rollback data harga material cabang "${selectedBackupToRestore.targetOutlet?.name || 'Tujuan'}"!`
        );
      } else {
        await restoreProductMutation.mutateAsync(selectedBackupToRestore._id);
        toast.success(
          `Berhasil me-rollback data harga produk cabang "${selectedBackupToRestore.targetOutlet?.name || 'Tujuan'}"!`
        );
      }
      setSelectedBackupToRestore(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || 'Gagal melakukan rollback data harga'
      );
    }
  };

  // Download JSON Backup
  const handleDownloadJSON = (type: 'MATERIAL' | 'PRODUCT') => {
    const dataToExport =
      type === 'MATERIAL' ? materialComparison : productComparison;
    const outletName = type === 'MATERIAL' ? sourceName : sourceName;
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_harga_${type.toLowerCase()}_${outletName.replace(/\s+/g, '_')}_${dayjs().format('YYYYMMDD_HHmmss')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Berhasil mengunduh backup JSON harga ${type.toLowerCase()}`);
  };

  // Table Columns
  const materialColumns: ExtendedColumnDef<any>[] = [
    {
      id: 'code',
      header: 'Kode Item',
      size: 100,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-gray-700">
          {row.original.code}
        </span>
      )
    },
    {
      id: 'name',
      header: 'Nama Material',
      size: 220,
      cell: ({ row }) => (
        <span className="font-bold text-xs text-gray-900">
          {row.original.name}
        </span>
      )
    },
    {
      id: 'unit',
      header: 'Satuan',
      size: 80,
      align: 'center',
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className="text-[10px] font-medium rounded-sm"
        >
          {row.original.unit}
        </Badge>
      )
    },
    {
      id: 'sourcePrice',
      header: `Harga Asal (${sourceName})`,
      size: 150,
      align: 'right',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-blue-700">
          {toIDR(row.original.sourcePrice)}
        </span>
      )
    },
    {
      id: 'targetPrice',
      header: `Harga Tujuan (${targetName})`,
      size: 150,
      align: 'right',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-700">
          {toIDR(row.original.targetPrice)}
        </span>
      )
    },
    {
      id: 'diff',
      header: 'Perubahan',
      size: 140,
      align: 'center',
      cell: ({ row }) => {
        const diff = row.original.sourcePrice - row.original.targetPrice;
        if (diff === 0) {
          return (
            <Badge
              variant="secondary"
              className="text-[9px] rounded-sm text-gray-500"
            >
              Sama
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className={`text-[9px] font-bold rounded-sm ${
              diff > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {diff > 0 ? `+${toIDR(diff)}` : toIDR(diff)}
          </Badge>
        );
      }
    }
  ];

  const productColumns: ExtendedColumnDef<any>[] = [
    {
      id: 'code',
      header: 'Kode Produk',
      size: 100,
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-gray-700">
          {row.original.code}
        </span>
      )
    },
    {
      id: 'name',
      header: 'Nama Produk',
      size: 220,
      cell: ({ row }) => (
        <span className="font-bold text-xs text-gray-900">
          {row.original.name}
        </span>
      )
    },
    {
      id: 'outputUnit',
      header: 'Satuan',
      size: 80,
      align: 'center',
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className="text-[10px] font-medium rounded-sm"
        >
          {row.original.outputUnit}
        </Badge>
      )
    },
    {
      id: 'sourcePrice',
      header: `Harga Asal (${sourceName})`,
      size: 150,
      align: 'right',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-blue-700">
          {toIDR(row.original.sourcePrice)}
        </span>
      )
    },
    {
      id: 'targetPrice',
      header: `Harga Tujuan (${targetName})`,
      size: 150,
      align: 'right',
      cell: ({ row }) => (
        <span className="font-mono text-xs font-bold text-slate-700">
          {toIDR(row.original.targetPrice)}
        </span>
      )
    },
    {
      id: 'diff',
      header: 'Perubahan',
      size: 140,
      align: 'center',
      cell: ({ row }) => {
        const diff = row.original.sourcePrice - row.original.targetPrice;
        if (diff === 0) {
          return (
            <Badge
              variant="secondary"
              className="text-[9px] rounded-sm text-gray-500"
            >
              Sama
            </Badge>
          );
        }
        return (
          <Badge
            variant="outline"
            className={`text-[9px] font-bold rounded-sm ${
              diff > 0
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}
          >
            {diff > 0 ? `+${toIDR(diff)}` : toIDR(diff)}
          </Badge>
        );
      }
    }
  ];

  return (
    <DashboardLayout>
      <Authorized>
        <div className="w-full space-y-4">
          <ReusableTitle
            title="Settings & Data Tools"
            subtitle="Kelola utilitas pengembang, sinkronisasi harga antar cabang, serta backup & rollback database."
            borderColorClass="border-l-emerald-500"
            icon={Settings}
            iconColorClass="text-emerald-500"
          />

          {/* MAIN SUB MENU TABS */}
          <Tabs
            value={mainTab}
            onValueChange={(v) =>
              setMainTab(v as 'developer' | 'price-transfer')
            }
            className="w-full space-y-6"
          >
            <TabsList className="w-full max-w-md grid grid-cols-2 p-1 bg-slate-100 border border-slate-200/80 rounded-sm">
              <TabsTrigger
                value="developer"
                className="flex items-center justify-center gap-2 rounded-sm py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm"
              >
                <Terminal className="w-4 h-4 text-emerald-600" />
                1. Developer
              </TabsTrigger>
              <TabsTrigger
                value="price-transfer"
                className="flex items-center justify-center gap-2 rounded-sm py-2 text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm"
              >
                <Building2 className="w-4 h-4 text-blue-600" />
                2. Harga antar Cabang
              </TabsTrigger>
            </TabsList>

            {/* SUB MENU 1: DEVELOPER */}
            <TabsContent value="developer" className="space-y-6">
              {/* WebSocket Debugger Tool */}
              <Card>
                <CardHeader className="p-4 border-b border-gray-100 flex flex-row items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Terminal className="h-4 w-4 text-emerald-600" />
                      <CardTitle className="text-sm font-bold">
                        WebSocket Debugger Overlay
                      </CardTitle>
                      <Badge
                        variant="outline"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold gap-1"
                      >
                        <Wifi className="w-3 h-3 text-emerald-600" /> Real-time
                        Engine
                      </Badge>
                    </div>
                    <CardDescription className="text-[11px] text-slate-400">
                      Fitur debugging dan pengawasan koneksi realtime
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <ReusableSwitch
                    id="ws-debugger-toggle"
                    label="WebSocket Debugger Overlay Widget"
                    description="Menampilkan widget melayang status koneksi dan lalu lintas pesan WebSocket secara real-time pada sudut layar."
                    checked={wsDebuggerEnabled}
                    onChange={handleToggle}
                    isLoading={!mounted}
                  />
                </CardContent>
              </Card>

              {/* System Architecture & Environment Info */}
              <Card>
                <CardHeader className="p-4 border-b border-gray-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <CardTitle className="text-xs font-bold text-gray-800">
                      Informasi Arsitektur Sistem
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="text-[9px]">
                    v1.5.7
                  </Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">
                      Frontend Framework
                    </span>
                    <span className="font-bold text-gray-800 font-mono">
                      Next.js 15.5.7 (React 19)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">
                      Backend Engine
                    </span>
                    <span className="font-bold text-gray-800 font-mono">
                      Go (Gin & GORM REST API)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">
                      Database Persistence
                    </span>
                    <span className="font-bold text-gray-800 font-mono">
                      PostgreSQL (JSONB Storage)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">
                      Package Manager
                    </span>
                    <span className="font-bold text-emerald-700 font-mono">
                      pnpm
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Local Storage & Cache Maintenance */}
              <Card>
                <CardHeader className="p-4 border-b border-gray-100 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-amber-600" />
                    <div>
                      <CardTitle className="text-xs font-bold text-gray-800">
                        Pembersihan Cache Pengaturan Lokal (Browser Storage)
                      </CardTitle>
                      <CardDescription className="text-[11px] text-gray-400">
                        Menghapus preferensi batas tabel dan debugging dari
                        localStorage tanpa mempengaruhi database backend.
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearLocalStorage}
                    className="text-xs font-bold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-sm gap-1.5 h-8"
                    icon={Trash2}
                  >
                    Bersihkan Cache Lokal
                  </Button>
                </CardHeader>
              </Card>
            </TabsContent>

            {/* SUB MENU 2: HARGA ANTA CABANG */}
            <TabsContent value="price-transfer" className="space-y-6">
              <Card className="border-t-4 border-t-blue-600">
                <CardHeader className="p-5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Copy className="h-5 w-5 text-blue-600" />
                        <CardTitle className="text-base font-bold text-gray-900">
                          Copy & Paste Harga antar Cabang
                        </CardTitle>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold"
                        >
                          Database Auto-Backup Enabled
                        </Badge>
                      </div>
                      <CardDescription className="text-xs text-gray-500">
                        Salin seluruh patokan harga dari cabang sumber ke cabang
                        tujuan. Sistem akan membuat snapshot backup di
                        PostgreSQL secara otomatis sebelum menimpa data.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-6">
                  {/* RADIX TABS COMPONENT */}
                  <Tabs
                    value={activeTab}
                    onValueChange={(v) =>
                      setActiveTab(v as 'material' | 'product')
                    }
                    className="w-full space-y-6"
                  >
                    <TabsList className="w-full max-w-md grid grid-cols-2">
                      <TabsTrigger value="material" className="gap-2">
                        <Boxes className="w-4 h-4" />
                        Material (Bahan Baku)
                      </TabsTrigger>
                      <TabsTrigger value="product" className="gap-2">
                        <Package className="w-4 h-4" />
                        Product (Produk Jadi)
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: MATERIAL */}
                    <TabsContent value="material" className="space-y-6">
                      {/* Selector Bar */}
                      <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4 space-y-1.5">
                          <label className="text-xs font-bold text-gray-700 block">
                            1. Cabang Asal (Sumber Harga)
                          </label>
                          <OutletSelector
                            value={sourceMaterialOutletId}
                            onSelect={(val) => setSourceMaterialOutletId(val)}
                            allowAll={false}
                            autoSelectFirst={true}
                          />
                        </div>

                        <div className="hidden md:flex md:col-span-1 justify-center items-center pb-2">
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="md:col-span-4 space-y-1.5">
                          <label className="text-xs font-bold text-gray-700 block">
                            2. Cabang Tujuan (Akan Ditimpa)
                          </label>
                          <OutletSelector
                            value={targetMaterialOutletId}
                            onSelect={(val) => setTargetMaterialOutletId(val)}
                            allowAll={false}
                            autoSelectFirst={false}
                          />
                        </div>

                        <div className="md:col-span-3 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadJSON('MATERIAL')}
                            className="rounded-sm text-xs font-bold gap-1.5 h-9"
                            title="Download array harga saat ini dalam bentuk file JSON"
                            icon={Download}
                          >
                            Backup JSON
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !sourceMaterialOutletId ||
                              !targetMaterialOutletId ||
                              sourceMaterialOutletId ===
                                targetMaterialOutletId ||
                              copyMaterialMutation.isPending
                            }
                            onClick={() => setShowCopyConfirm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm text-xs h-9 gap-1.5 shadow-sm"
                            icon={Copy}
                            isLoading={copyMaterialMutation.isPending}
                          >
                            Salin & Timpa Harga
                          </Button>
                        </div>
                      </div>

                      {/* Warning Info */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 leading-relaxed">
                          <b>Keamanan Data Terjamin:</b> Sebelum proses
                          penimpaan dilakukan, sistem akan mengambil snapshot
                          backup seluruh harga cabang tujuan saat ini ke
                          database PostgreSQL. Jika terjadi kesalahan pilih
                          cabang, Anda dapat melakukan <b>Rollback</b> kapan
                          saja dari riwayat backup di bagian bawah.
                        </div>
                      </div>

                      {/* Table Comparison */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Pratinjau Perbandingan Harga Material (
                          {materialComparison.length} Items)
                        </h3>
                        <TableData
                          data={materialComparison}
                          columns={materialColumns}
                          isLoading={isLoadingSourceMat || isLoadingTargetMat}
                          noDataMessage="Pilih cabang asal dan tujuan untuk melihat perbandingan harga"
                        />
                      </div>

                      {/* Backup History & Rollback Section */}
                      <div className="space-y-3 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-600" />
                          <h3 className="text-sm font-bold text-gray-800">
                            Riwayat Backup & Rollback Database (Material)
                          </h3>
                        </div>
                        {materialBackups.length === 0 ? (
                          <div className="p-4 border border-dashed border-gray-200 rounded-sm text-center text-xs text-gray-500">
                            Belum ada riwayat backup database untuk cabang ini.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {materialBackups.map((bk) => (
                              <div
                                key={bk._id}
                                className="p-3 bg-white border border-gray-200 rounded-sm shadow-sm flex items-center justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-gray-800">
                                      {bk.targetOutlet?.name || 'Cabang Tujuan'}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px]"
                                    >
                                      {dayjs(bk.createdAt).format(
                                        'DD MMM YYYY, HH:mm'
                                      )}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-gray-500 leading-tight">
                                    {bk.notes}
                                  </p>
                                  {bk.creator && (
                                    <p className="text-[10px] text-gray-400">
                                      Oleh: {bk.creator.name}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBackupToRestore(bk)}
                                  className="h-8 text-xs font-bold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-sm gap-1 flex-shrink-0"
                                  icon={RotateCcw}
                                >
                                  Rollback
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* TAB 2: PRODUCT */}
                    <TabsContent value="product" className="space-y-6">
                      {/* Selector Bar */}
                      <div className="p-4 bg-gray-50 border border-gray-200/80 rounded-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-4 space-y-1.5">
                          <label className="text-xs font-bold text-gray-700 block">
                            1. Cabang Asal (Sumber Harga)
                          </label>
                          <OutletSelector
                            value={sourceProductOutletId}
                            onSelect={(val) => setSourceProductOutletId(val)}
                            allowAll={false}
                            autoSelectFirst={true}
                          />
                        </div>

                        <div className="hidden md:flex md:col-span-1 justify-center items-center pb-2">
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>

                        <div className="md:col-span-4 space-y-1.5">
                          <label className="text-xs font-bold text-gray-700 block">
                            2. Cabang Tujuan (Akan Ditimpa)
                          </label>
                          <OutletSelector
                            value={targetProductOutletId}
                            onSelect={(val) => setTargetProductOutletId(val)}
                            allowAll={false}
                            autoSelectFirst={false}
                          />
                        </div>

                        <div className="md:col-span-3 flex items-center justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadJSON('PRODUCT')}
                            className="rounded-sm text-xs font-bold gap-1.5 h-9"
                            title="Download array harga saat ini dalam bentuk file JSON"
                            icon={Download}
                          >
                            Backup JSON
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            disabled={
                              !sourceProductOutletId ||
                              !targetProductOutletId ||
                              sourceProductOutletId === targetProductOutletId ||
                              copyProductMutation.isPending
                            }
                            onClick={() => setShowCopyConfirm(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-sm text-xs h-9 gap-1.5 shadow-sm"
                            icon={Copy}
                            isLoading={copyProductMutation.isPending}
                          >
                            Salin & Timpa Harga
                          </Button>
                        </div>
                      </div>

                      {/* Warning Info */}
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-sm flex items-start gap-2.5">
                        <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-amber-800 leading-relaxed">
                          <b>Keamanan Data Terjamin:</b> Sebelum proses
                          penimpaan dilakukan, sistem akan mengambil snapshot
                          backup seluruh harga produk cabang tujuan saat ini ke
                          database PostgreSQL. Jika terjadi kesalahan pilih
                          cabang, Anda dapat melakukan <b>Rollback</b> kapan
                          saja dari riwayat backup di bagian bawah.
                        </div>
                      </div>

                      {/* Table Comparison */}
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                          Pratinjau Perbandingan Harga Produk (
                          {productComparison.length} Items)
                        </h3>
                        <TableData
                          data={productComparison}
                          columns={productColumns}
                          isLoading={isLoadingSourceProd || isLoadingTargetProd}
                          noDataMessage="Pilih cabang asal dan tujuan untuk melihat perbandingan harga"
                        />
                      </div>

                      {/* Backup History & Rollback Section */}
                      <div className="space-y-3 pt-4 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-slate-600" />
                          <h3 className="text-sm font-bold text-gray-800">
                            Riwayat Backup & Rollback Database (Produk)
                          </h3>
                        </div>
                        {productBackups.length === 0 ? (
                          <div className="p-4 border border-dashed border-gray-200 rounded-sm text-center text-xs text-gray-500">
                            Belum ada riwayat backup database untuk cabang ini.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {productBackups.map((bk) => (
                              <div
                                key={bk._id}
                                className="p-3 bg-white border border-gray-200 rounded-sm shadow-sm flex items-center justify-between"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-gray-800">
                                      {bk.targetOutlet?.name || 'Cabang Tujuan'}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px]"
                                    >
                                      {dayjs(bk.createdAt).format(
                                        'DD MMM YYYY, HH:mm'
                                      )}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-gray-500 leading-tight">
                                    {bk.notes}
                                  </p>
                                  {bk.creator && (
                                    <p className="text-[10px] text-gray-400">
                                      Oleh: {bk.creator.name}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedBackupToRestore(bk)}
                                  className="h-8 text-xs font-bold text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-sm gap-1 flex-shrink-0"
                                  icon={RotateCcw}
                                >
                                  Rollback
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Authorized>

      {/* CONFIRMATION DIALOG FOR COPY & PASTE */}
      <ConfirmationDialog
        open={showCopyConfirm}
        onOpenChange={setShowCopyConfirm}
        onConfirm={handleExecuteCopy}
        title={`Konfirmasi Salin & Timpa Harga (${activeTab === 'material' ? 'Material' : 'Produk'})`}
        description={`Apakah Anda yakin ingin menyalin semua harga ${activeTab === 'material' ? 'material' : 'produk'} dari cabang "${sourceName}" ke cabang "${targetName}"? Sistem telah otomatis membuat snapshot backup data harga cabang "${targetName}" ke database PostgreSQL sebelum menimpa data.`}
        confirmText="Salin & Timpa Harga"
        isDestructive={false}
        isLoading={
          copyMaterialMutation.isPending || copyProductMutation.isPending
        }
      />

      {/* CONFIRMATION DIALOG FOR ROLLBACK */}
      <ConfirmationDialog
        open={!!selectedBackupToRestore}
        onOpenChange={(v) => !v && setSelectedBackupToRestore(null)}
        onConfirm={handleExecuteRestore}
        title="Konfirmasi Rollback Harga dari Backup Database"
        description={`Apakah Anda yakin ingin melakukan rollback harga ${selectedBackupToRestore?.entityType === 'MATERIAL' ? 'material' : 'produk'} cabang "${selectedBackupToRestore?.targetOutlet?.name || 'Tujuan'}" ke kondisi backup bertanggal ${selectedBackupToRestore ? dayjs(selectedBackupToRestore.createdAt).format('DD MMMM YYYY, HH:mm') : ''}? Tindakan ini akan mengembalikan seluruh harga ke snapshot tersebut.`}
        confirmText="Rollback Sekarang"
        isDestructive={true}
        isLoading={
          restoreMaterialMutation.isPending || restoreProductMutation.isPending
        }
      />
    </DashboardLayout>
  );
}
