'use client';

import { useState, useMemo, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Receipt, CheckCircle, Download } from 'lucide-react';
import { PaymentTable } from './payment-table';
import { AddPaymentDialog } from './add-payment-dialog';
import { PaymentExportDialog } from './payment-export-dialog';
import { PaymentExportPrintSheet } from './payment-export-print-sheet';
import { DateExportGroup } from '@/lib/utils/payment-export-utils';
import { POListTable, calculatePoTotal } from './po-list-table';
import { useGetRTUPurchases } from '@/lib/hooks/queries/rtu-purchase';
import { useGetRTUPayments } from '@/lib/hooks/queries/rtu-payment';
import { useGetRTUInvoiceReconciles } from '@/lib/hooks/queries/rtu-invoice-reconcile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OutletSelector } from '@/components/shared/outlet-selector';
import { getUserFromStorage } from '@/lib/hooks/getUserFromStorage';
import { MonthPicker } from '@/components/shared/month-picker';
import { CountCard } from '@/components/ui/count-card';
import { setDateStr } from '@/lib/date';
import { toIDR } from '@/lib/utils';

function PaymentPageContent() {
  const [openAdd, setOpenAdd] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [printData, setPrintData] = useState<DateExportGroup[]>([]);
  const [prefilledPurchase, setPrefilledPurchase] = useState<any>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get('action');
  const poId = searchParams.get('poId');
  const isDp = searchParams.get('isDp') === 'true';

  const [selectedBuyerId, setSelectedBuyerId] = useState(
    () => getUserFromStorage()?.outlet || ''
  );
  const [selectedTargetValue, setSelectedTargetValue] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

  const buyerIdQuery = selectedBuyerId === 'all' ? undefined : selectedBuyerId;

  const { vendorId, sellerId } = useMemo(() => {
    if (!selectedTargetValue)
      return { vendorId: undefined, sellerId: undefined };
    const [type, id] = selectedTargetValue.split(':');
    return {
      vendorId: type === 'vendor' ? id : undefined,
      sellerId: type === 'seller' ? id : undefined
    };
  }, [selectedTargetValue]);

  const { data: purchases = [], isLoading: isPurchasesLoading } =
    useGetRTUPurchases({
      buyerId: buyerIdQuery || undefined
    });

  const { data: payments, isLoading: isPaymentsLoading } = useGetRTUPayments({
    buyerId: buyerIdQuery || undefined,
    vendorId,
    sellerId
  });

  const { data: invoicesResponse } = useGetRTUInvoiceReconciles({
    status: 'CONFIRMED'
  });

  // Map purchaseId → total aktual dari confirmed invoice (dijumlahkan jika multi)
  const poInvoiceTotals = useMemo(() => {
    const map: Record<string, number> = {};
    if (!invoicesResponse?.data) return map;
    invoicesResponse.data.forEach((inv: any) => {
      if (inv.status === 'CONFIRMED' && inv.purchaseId) {
        map[inv.purchaseId] =
          (map[inv.purchaseId] || 0) + (inv.totalAmount || 0);
      }
    });
    return map;
  }, [invoicesResponse]);

  // Helper: gunakan total invoice jika ada, fallback ke kalkulasi PO
  const getEffectiveTotal = (po: any): number =>
    poInvoiceTotals[po._id] ?? calculatePoTotal(po);

  // Calculate accumulated paid amounts from payments list
  const paidAmounts = useMemo(() => {
    const map: Record<string, number> = {};
    if (!payments?.data) return map;

    payments.data.forEach((p: any) => {
      if (p.status === 'CANCELLED') return;
      if (!p.details) return;

      p.details.forEach((det: any) => {
        if (!det.purchaseId) return;
        map[det.purchaseId] =
          (map[det.purchaseId] || 0) + (det.amountApplied || 0);
      });
    });

    return map;
  }, [payments]);

  // Client-side filter purchases by seller outlet / vendor and month
  const filteredPurchases = useMemo(() => {
    return purchases.filter((po: any) => {
      if (selectedMonth) {
        const dateStr = po.requestDate || po.createdAt;
        if (!dateStr || !dateStr.startsWith(selectedMonth)) return false;
      }
      if (vendorId && po.vendorId !== vendorId) {
        return false;
      }
      if (sellerId && po.sellerId !== sellerId) {
        return false;
      }
      return true;
    });
  }, [purchases, vendorId, sellerId, selectedMonth]);

  const filteredPayments = useMemo(() => {
    const list = payments?.data || [];
    return list.filter((p: any) => {
      if (p.status === 'CANCELLED') return false;
      if (selectedMonth) {
        const dateStr = p.paymentDate || p.createdAt;
        if (!dateStr || !dateStr.startsWith(selectedMonth)) return false;
      }
      return true;
    });
  }, [payments, selectedMonth]);

  const cardStats = useMemo(() => {
    let totalPaid = 0;
    let totalUnpaid = 0;
    let paidPoCount = 0;
    let activePoCount = 0;

    filteredPayments.forEach((p: any) => {
      totalPaid += p.amount || 0;
    });

    filteredPurchases.forEach((po: any) => {
      if (po.status === 'CANCELLED') return;

      const total = getEffectiveTotal(po);
      const paid = paidAmounts[po._id] || 0;
      const remaining = total - paid;

      totalUnpaid += Math.max(0, remaining);
      activePoCount++;

      if (remaining <= 0) {
        paidPoCount++;
      }
    });

    return {
      totalPaid,
      totalUnpaid,
      paidPoCount,
      activePoCount
    };
  }, [filteredPayments, filteredPurchases, paidAmounts, poInvoiceTotals]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePay = useCallback(
    (purchase: any, isDpVal = false) => {
      const total = getEffectiveTotal(purchase);
      const paid = paidAmounts[purchase._id] || 0;
      const remaining = total - paid;

      setPrefilledPurchase({
        ...purchase,
        prefillAmount: isDpVal ? purchase.dpAmount : remaining
      });
      setOpenAdd(true);
    },
    [paidAmounts, poInvoiceTotals] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (action === 'create' && poId && purchases.length > 0) {
      const targetPo = purchases.find((p: any) => p._id === poId);
      if (targetPo && !prefilledPurchase) {
        handlePay(targetPo, isDp);
      }
    }
  }, [action, poId, isDp, purchases, prefilledPurchase, handlePay]);

  const handleOpenAddChange = (open: boolean) => {
    setOpenAdd(open);
    if (!open) {
      setPrefilledPurchase(null);
      if (action === 'create' && poId) {
        router.push('/rtu/purchase');
      }
    }
  };

  const handleTriggerPrint = (data: DateExportGroup[]) => {
    setPrintData(data);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-sm shadow-sm border border-gray-100 border-l-4 border-l-blue-600">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-gray-900 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Payment
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Kelola pembayaran tagihan / purchase order ke vendor atau outlet
              lain
            </p>
          </div>
          <div className="flex gap-3 mt-4 md:mt-0">
            <Button
              onClick={() => setOpenExport(true)}
              variant="outline"
              icon={Download}
              className="rounded-sm border-gray-200 hover:bg-slate-50 font-semibold"
            >
              Export Payment
            </Button>
            <Button
              onClick={() => handleOpenAddChange(true)}
              variant="primary"
              icon={Plus}
            >
              Add Payment
            </Button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-sm shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end flex-wrap">
          <OutletSelector
            value={selectedBuyerId}
            onSelect={setSelectedBuyerId}
            className="w-full md:w-64"
            label="Bayar Dari (Outlet)"
            autoSelectFirst={true}
            allowAll={true}
            save={true}
            saveKey="outletId"
          />

          <OutletSelector
            value={selectedTargetValue}
            onSelect={setSelectedTargetValue}
            className="w-full md:w-64"
            label="Penjual / Vendor"
            placeholder="Semua Penjual / Vendor..."
            autoSelectFirst={false}
            allowAll={true}
            includeVendors={true}
            save={true}
            saveKey="selectedTargetValue"
          />

          <MonthPicker
            value={selectedMonth}
            onChange={setSelectedMonth}
            useLabelComponent
            save={true}
            saveKey="selectedMonth"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <CountCard
            title="Total Pembayaran"
            value={toIDR(cardStats.totalPaid)}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={CreditCard}
            iconClassName="text-emerald-600 bg-emerald-50"
          />
          <CountCard
            title="Sisa Hutang Dagang"
            value={toIDR(cardStats.totalUnpaid)}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={Receipt}
            iconClassName="text-amber-600 bg-amber-50"
          />
          <CountCard
            title="PO Sudah Lunas"
            value={cardStats.paidPoCount}
            subValue={`/ ${cardStats.activePoCount} PO`}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={CheckCircle}
            iconClassName="text-blue-600 bg-blue-50"
          />
          <CountCard
            title="Transaksi Pembayaran"
            value={filteredPayments.length}
            description={`Periode: ${setDateStr(selectedMonth, 'MMMM YYYY')}`}
            icon={Receipt}
            iconClassName="text-indigo-600 bg-indigo-50"
          />
        </div>

        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:w-[800px] bg-white border border-gray-200">
            <TabsTrigger
              value="payments"
              className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
            >
              <CreditCard className="w-4 h-4 mr-2" /> List Payment
            </TabsTrigger>
            <TabsTrigger
              value="unpaid"
              className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
            >
              <Receipt className="w-4 h-4 mr-2" /> PO Belum Dibayar
            </TabsTrigger>
            <TabsTrigger
              value="partially_paid"
              className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
            >
              <Receipt className="w-4 h-4 mr-2" /> PO Dibayar Sebagian
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" /> PO Sudah Lunas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-4 mt-0">
            <PaymentTable
              buyerId={buyerIdQuery}
              targetId={vendorId || sellerId}
              targetType={vendorId ? 'VENDOR' : sellerId ? 'SELLER' : 'ALL'}
              selectedMonth={selectedMonth}
            />
          </TabsContent>

          <TabsContent value="unpaid" className="space-y-4 mt-0">
            <POListTable
              purchases={filteredPurchases}
              paidAmounts={paidAmounts}
              invoiceTotals={poInvoiceTotals}
              onPay={handlePay}
              type="unpaid"
              isLoading={isPurchasesLoading || isPaymentsLoading}
            />
          </TabsContent>

          <TabsContent value="partially_paid" className="space-y-4 mt-0">
            <POListTable
              purchases={filteredPurchases}
              paidAmounts={paidAmounts}
              invoiceTotals={poInvoiceTotals}
              onPay={handlePay}
              type="partially_paid"
              isLoading={isPurchasesLoading || isPaymentsLoading}
            />
          </TabsContent>

          <TabsContent value="paid" className="space-y-4 mt-0">
            <POListTable
              purchases={filteredPurchases}
              paidAmounts={paidAmounts}
              invoiceTotals={poInvoiceTotals}
              type="paid"
              isLoading={isPurchasesLoading || isPaymentsLoading}
            />
          </TabsContent>
        </Tabs>

        <AddPaymentDialog
          open={openAdd}
          onOpenChange={handleOpenAddChange}
          prefilledPurchase={prefilledPurchase}
        />

        <PaymentExportDialog
          open={openExport}
          onOpenChange={setOpenExport}
          payments={payments?.data || []}
          initialMonth={selectedMonth}
          initialBuyerId={selectedBuyerId}
          onTriggerPrint={handleTriggerPrint}
        />

        <PaymentExportPrintSheet data={printData} />
      </div>
    </DashboardLayout>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={null}>
      <PaymentPageContent />
    </Suspense>
  );
}
