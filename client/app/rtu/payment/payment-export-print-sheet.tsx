'use client';

import React from 'react';
import { DateExportGroup } from '@/lib/utils/payment-export-utils';
import { toIDR } from '@/lib/utils';
import { PrintFooter } from '@/components/print/print-footer';

interface PaymentExportPrintSheetProps {
  data: DateExportGroup[];
  title?: string;
}

export const PaymentExportPrintSheet = React.forwardRef<
  HTMLDivElement,
  PaymentExportPrintSheetProps
>(({ data, title = 'REKAP LAPORAN PEMBAYARAN TAGIHAN' }, ref) => {
  if (!data || data.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref}
      id="payment-print-sheet"
      className="print-only hidden print:block text-slate-900 bg-white p-6 leading-tight text-xs print:p-0 print:m-0"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              size: A4 landscape;
              margin: 4mm 5mm;
            }
            body {
              background-color: white !important;
              color: black !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            /* Hide app elements during print */
            header,
            sidebar,
            nav,
            button,
            .no-print {
              display: none !important;
            }
            .print-only,
            .print-only *,
            #payment-print-sheet,
            #payment-print-sheet * {
              visibility: visible !important;
            }
            #payment-print-sheet {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background-color: white !important;
              color: black !important;
              z-index: 99999 !important;
            }
            .page-break-after {
              page-break-after: always;
              break-after: page;
            }
          }
        `
        }}
      />

      {data.map((dateGroup, dateIdx) => (
        <div
          key={dateGroup.dateKey}
          className={`space-y-6 ${
            dateIdx < data.length - 1 ? 'page-break-after pb-6' : ''
          }`}
        >
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-end">
            <div>
              <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                SINAR UTAMA MIE AYAM SETIAP HARI
              </span>
              <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900 mt-0.5">
                {title}
              </h1>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Tanggal Pembayaran:{' '}
                <span className="font-semibold text-slate-900">
                  {dateGroup.dateLabel}
                </span>
              </p>
            </div>

            <div className="text-right border-l-2 border-slate-200 pl-4 py-0.5">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">
                Total Pembayaran Hari Ini
              </p>
              <p className="text-base font-extrabold text-emerald-700">
                {toIDR(
                  dateGroup.outlets.reduce(
                    (acc, o) =>
                      acc +
                      o.vendors.reduce((vAcc, v) => vAcc + v.totalPaid, 0),
                    0
                  )
                )}
              </p>
            </div>
          </div>

          {/* Outlets Sections */}
          {dateGroup.outlets.map((outlet) => {
            const outletTotal = outlet.vendors.reduce(
              (acc, v) => acc + v.totalPaid,
              0
            );

            return (
              <div key={outlet.buyerName} className="space-y-3">
                {/* Outlet Section Title Banner */}
                <div className="bg-slate-900 text-white px-3 py-1.5 rounded-sm flex justify-between items-center font-bold">
                  <span className="text-xs tracking-wide">
                    TAGIHAN MINGGUAN ( {outlet.buyerName} )
                  </span>
                  <span className="text-xs text-slate-200 font-normal">
                    Total Outlet:{' '}
                    <strong className="text-white font-bold">
                      {toIDR(outletTotal)}
                    </strong>
                  </span>
                </div>

                {/* Main Payment Table */}
                <table className="w-full border-collapse text-[11px] border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-semibold">
                      <th className="p-1.5 border-r border-slate-300 text-left w-36">
                        NAMA SUPLIER
                      </th>
                      <th className="p-1.5 border-r border-slate-300 text-left">
                        REKENING
                      </th>
                      <th className="p-1.5 border-r border-slate-300 text-center w-24">
                        TGL INVOICE
                      </th>
                      <th className="p-1.5 border-r border-slate-300 text-center w-24">
                        TGL BAYAR
                      </th>
                      <th className="p-1.5 border-r border-slate-300 text-right w-28">
                        NOMINAL
                      </th>
                      <th className="p-1.5 border-r border-slate-300 text-left">
                        KETERANGAN
                      </th>
                      <th className="p-1.5 border-r border-slate-300 text-left w-24">
                        NO HP
                      </th>
                      <th className="p-1.5 border-r border-slate-300 text-left">
                        REMARK
                      </th>
                      <th className="p-1.5 text-right w-32 font-bold">
                        TOTAL BAYAR
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {outlet.vendors.map((vendor) => (
                      <React.Fragment key={vendor.vendorName}>
                        {vendor.invoices.map((inv, invIdx) => (
                          <tr
                            key={invIdx}
                            className={`border-b border-slate-200 ${
                              invIdx === 0
                                ? 'bg-white font-medium'
                                : 'bg-slate-50/50 text-slate-700'
                            }`}
                          >
                            {invIdx === 0 ? (
                              <>
                                <td className="p-1.5 border-r border-slate-300 font-bold text-slate-900 align-top">
                                  {vendor.vendorName}
                                </td>
                                <td className="p-1.5 border-r border-slate-300 text-slate-800 align-top">
                                  {vendor.accountInfo}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-1.5 border-r border-slate-300 bg-slate-100/40"></td>
                                <td className="p-1.5 border-r border-slate-300 bg-slate-100/40"></td>
                              </>
                            )}

                            <td className="p-1.5 border-r border-slate-300 text-center align-top whitespace-nowrap">
                              {inv.invoiceDate}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-center align-top whitespace-nowrap">
                              {invIdx === 0 ? inv.paymentDate : ''}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 text-right align-top font-mono">
                              {toIDR(inv.nominal)}
                            </td>
                            <td className="p-1.5 border-r border-slate-300 align-top">
                              {inv.keterangan}
                            </td>

                            {invIdx === 0 ? (
                              <>
                                <td className="p-1.5 border-r border-slate-300 align-top text-slate-700">
                                  {vendor.phone}
                                </td>
                                <td className="p-1.5 border-r border-slate-300 align-top text-slate-700">
                                  {vendor.remark}
                                </td>
                                <td className="p-1.5 text-right font-bold text-emerald-800 align-top font-mono bg-emerald-50/30">
                                  {toIDR(vendor.totalPaid)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-1.5 border-r border-slate-300 bg-slate-100/40"></td>
                                <td className="p-1.5 border-r border-slate-300 bg-slate-100/40"></td>
                                <td className="p-1.5 bg-slate-100/40"></td>
                              </>
                            )}
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 text-slate-900 font-bold border-t-2 border-slate-400">
                      <td
                        colSpan={8}
                        className="p-1.5 text-right uppercase tracking-wider"
                      >
                        TOTAL TAGIHAN {outlet.buyerName}:
                      </td>
                      <td className="p-1.5 text-right font-mono text-xs text-slate-950">
                        {toIDR(outletTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}

          <PrintFooter className="mt-8" />
        </div>
      ))}
    </div>
  );
});

PaymentExportPrintSheet.displayName = 'PaymentExportPrintSheet';
