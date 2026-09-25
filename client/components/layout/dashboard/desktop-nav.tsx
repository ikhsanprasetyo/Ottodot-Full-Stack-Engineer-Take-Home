'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Users2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShoppingBasket,
  ShoppingCart,
  Store,
  PackageCheck,
  Factory,
  Truck,
  LineChart,
  Database,
  Layers,
  Settings,
  Calculator,
  CreditCard,
  Scale,
  Receipt
} from 'lucide-react';
import { NavItem } from '@/components/layout/dashboard/nav-item';
import { Logo } from '@/components/ui/logo';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { isPathActive } from '@/lib/utils';

type DesktopNavProps = {
  collapsed: boolean;
  onToggle: () => void;
};

const getInitialOpenGroup = (path?: string | null): string | null => {
  if (!path) return null;
  if (path.startsWith('/rtu/stock')) return 'Inventori & Stok';
  if (
    path.startsWith('/rtu/purchase') ||
    path.startsWith('/rtu/grn') ||
    path.startsWith('/rtu/invoice') ||
    path.startsWith('/rtu/payment')
  )
    return 'Pembelian & Inbound';
  if (
    path.startsWith('/rtu/production') ||
    path.startsWith('/rtu/distribution')
  )
    return 'Manufaktur & Shipment';
  if (
    path.startsWith('/rtu/vendor') ||
    path.startsWith('/rtu/material') ||
    path.startsWith('/rtu/product') ||
    path.startsWith('/rtu/recipe') ||
    path.startsWith('/rtu/hpp') ||
    path.startsWith('/rtu/category') ||
    path.startsWith('/rtu/unit')
  )
    return 'Master Data';
  if (path.startsWith('/rtu/report') || path.startsWith('/rtu/ledger'))
    return 'Laporan';
  if (
    path.startsWith('/rtu/settings') ||
    path.startsWith('/outlet') ||
    path.startsWith('/users') ||
    path.startsWith('/user')
  )
    return 'Pengaturan';
  return null;
};

export default function DesktopNav({ collapsed, onToggle }: DesktopNavProps) {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(() =>
    getInitialOpenGroup(pathname)
  );

  useEffect(() => {
    const group = getInitialOpenGroup(pathname);
    if (group) setOpenGroup(group);
  }, [pathname]);

  const { hasPermission: hasPermissionUsersList } = useGetPermission(
    'list',
    'users'
  );

  const { hasPermission: hasPermissionOutletList } = useGetPermission(
    'list',
    'outlet'
  );

  const { hasPermission: hasPermissionRtuVendor } = useGetPermission(
    'list',
    'rtu_vendor'
  );
  const { hasPermission: hasPermissionRtuMaterial } = useGetPermission(
    'list',
    'rtu_material'
  );
  const { hasPermission: hasPermissionRtuGRN } = useGetPermission(
    'list',
    'rtu_grn'
  );
  const { hasPermission: hasPermissionRtuProduction } = useGetPermission(
    'list',
    'rtu_production'
  );
  const { hasPermission: hasPermissionRtuDistribution } = useGetPermission(
    'list',
    'rtu_distribution'
  );
  const { hasPermission: hasPermissionRtuReport } = useGetPermission(
    'list',
    'rtu_report'
  );
  const { hasPermission: hasPermissionRtuLedger } = useGetPermission(
    'list',
    'rtu_ledger'
  );
  const { hasPermission: hasPermissionRtuProduct } = useGetPermission(
    'list',
    'rtu_product'
  );
  const { hasPermission: hasPermissionRtuPurchase } = useGetPermission(
    'list',
    'rtu_purchase'
  );
  const { hasPermission: hasPermissionRtuCategory } = useGetPermission(
    'list',
    'rtu_category'
  );
  const { hasPermission: hasPermissionRtuUnit } = useGetPermission(
    'list',
    'rtu_unit'
  );
  const { hasPermission: hasPermissionRtuSettings } = useGetPermission(
    'list',
    'rtu_settings'
  );

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <Home className="h-5 w-5" />,
      show: true
    },
    {
      isGroup: true,
      label: 'Pembelian & Inbound',
      icon: <ShoppingCart className="h-5 w-5 text-emerald-400" />,
      show: hasPermissionRtuPurchase || hasPermissionRtuGRN,
      children: [
        ...(hasPermissionRtuPurchase
          ? [
              {
                href: '/rtu/purchase',
                label: 'Purchase Order',
                icon: <ShoppingCart className="h-4 w-4 text-emerald-400" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuGRN
          ? [
              {
                href: '/rtu/grn',
                label: 'Penerimaan Barang',
                icon: <PackageCheck className="h-4 w-4 text-indigo-400" />,
                show: true
              },
              {
                href: '/rtu/invoice',
                label: 'Reconcile Invoice',
                icon: <Receipt className="h-4 w-4 text-indigo-400" />,
                show: true
              },
              {
                href: '/rtu/payment',
                label: 'Payment',
                icon: <CreditCard className="h-4 w-4 text-indigo-400" />,
                show: true
              }
            ]
          : [])
      ]
    },
    {
      isGroup: true,
      label: 'Inventori & Stok',
      icon: <Layers className="h-5 w-5 text-amber-400" />,
      show: hasPermissionRtuMaterial || hasPermissionRtuProduct,
      children: [
        ...(hasPermissionRtuMaterial
          ? [
              {
                href: '/rtu/stock/material',
                label: 'Stok Bahan Baku',
                icon: <ShoppingBasket className="h-4 w-4 text-emerald-400" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuProduct
          ? [
              {
                href: '/rtu/stock/product',
                label: 'Stok Produk (RTU)',
                icon: <Factory className="h-4 w-4 text-indigo-400" />,
                show: true
              }
            ]
          : [])
      ]
    },
    {
      isGroup: true,
      label: 'Manufaktur & Shipment',
      icon: <Truck className="h-5 w-5 text-blue-400" />,
      show: hasPermissionRtuProduction || hasPermissionRtuDistribution,
      children: [
        ...(hasPermissionRtuProduction
          ? [
              {
                href: '/rtu/production',
                label: 'Produksi & HPP',
                icon: <Factory className="h-4 w-4 text-orange-400" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuDistribution
          ? [
              {
                href: '/rtu/distribution',
                label: 'Shipment',
                icon: <Truck className="h-4 w-4 text-blue-400" />,
                show: true
              }
            ]
          : [])
      ]
    },
    {
      isGroup: true,
      label: 'Master Data',
      icon: <Database className="h-5 w-5 text-indigo-400" />,
      show:
        hasPermissionRtuVendor ||
        hasPermissionRtuMaterial ||
        hasPermissionRtuProduct ||
        hasPermissionRtuCategory ||
        hasPermissionRtuUnit ||
        hasPermissionOutletList,
      children: [
        ...(hasPermissionOutletList
          ? [
              {
                href: '/rtu/hpp',
                label: 'Input HPP',
                icon: <Calculator className="h-4 w-4 text-orange-400" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuVendor
          ? [
              {
                href: '/rtu/vendor',
                label: 'Vendor',
                icon: <Store className="h-4 w-4 text-indigo-400" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuMaterial
          ? [
              {
                href: '/rtu/material',
                label: 'Bahan Baku',
                icon: <ShoppingBasket className="h-4 w-4 text-emerald-400" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuProduct
          ? [
              {
                href: '/rtu/product',
                label: 'Produk & Resep',
                icon: <Factory className="h-4 w-4 text-indigo-400" />,
                show: true
              }
            ]
          : []),

        ...(hasPermissionRtuCategory
          ? [
              {
                href: '/rtu/category',
                label: 'Kategori',
                icon: <Layers className="h-4 w-4 text-emerald-400" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuUnit
          ? [
              {
                href: '/rtu/unit',
                label: 'Satuan',
                icon: <Scale className="h-4 w-4 text-indigo-400" />,
                show: true
              }
            ]
          : [])
      ]
    },
    {
      isGroup: true,
      label: 'Laporan',
      icon: <LineChart className="h-5 w-5 text-pink-400" />,
      show: hasPermissionRtuReport || hasPermissionRtuLedger,
      children: [
        ...(hasPermissionRtuReport
          ? [
              {
                href: '/rtu/report',
                label: 'Laporan CK',
                icon: <LineChart className="h-4 w-4" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuLedger
          ? [
              {
                href: '/rtu/ledger',
                label: 'Kartu Stok (Audit)',
                icon: <Database className="h-4 w-4" />,
                show: true
              }
            ]
          : [])
      ]
    },
    {
      isGroup: true,
      label: 'Pengaturan',
      icon: <Settings className="h-5 w-5 text-gray-400" />,
      show:
        hasPermissionOutletList ||
        hasPermissionUsersList ||
        hasPermissionRtuSettings,
      children: [
        ...(hasPermissionOutletList
          ? [
              {
                href: '/outlet',
                label: 'Outlets',
                icon: <Store className="h-4 w-4" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionUsersList
          ? [
              {
                href: '/users',
                label: 'Users',
                icon: <Users2 className="h-4 w-4" />,
                show: true
              }
            ]
          : []),
        ...(hasPermissionRtuSettings
          ? [
              {
                href: '/rtu/settings',
                label: 'Settings',
                icon: <Settings className="h-4 w-4" />,
                show: true
              }
            ]
          : [])
      ]
    }
  ];

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 hidden flex-col border-r bg-gray-800 text-white sm:flex transition-all duration-300 no-scrollbar
        ${collapsed ? 'w-16' : 'w-60'}`}
    >
      <nav className="flex flex-col items-start gap-2 px-2 sm:py-5 w-full h-full">
        <div className="w-full flex justify-center mb-4">
          <Logo href="/dashboard" size={collapsed ? 'lg' : 'xxl'} />
        </div>

        <div
          className={`flex-1 w-full flex flex-col gap-2 no-scrollbar ${
            collapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'
          }`}
        >
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              if (item.isGroup) {
                const isChildActive = item.children.some((child) =>
                  isPathActive(pathname, child.href)
                );

                if (collapsed) {
                  return (
                    <div
                      key={item.label}
                      className="group relative w-full flex justify-center"
                    >
                      <button
                        className={`relative flex h-10 w-10 items-center justify-center rounded-sm transition-colors ${
                          isChildActive
                            ? 'text-emerald-400 font-bold'
                            : 'text-white hover:bg-gray-700 hover:text-white'
                        }`}
                      >
                        {isChildActive && (
                          <span className="absolute left-0 top-1 bottom-1 w-1 bg-emerald-400 rounded-r-sm shadow-xs" />
                        )}
                        {item.icon}
                      </button>

                      {/* Floating Submenu */}
                      <div className="absolute left-full top-0 pl-2 hidden group-hover:block z-50">
                        <div className="bg-gray-900 border border-gray-700 rounded-sm shadow-xl p-1.5 min-w-[180px] whitespace-nowrap animate-in fade-in zoom-in-95 duration-100">
                          <div className="px-2.5 py-1 text-[10px] font-bold text-gray-400 border-b border-gray-800 mb-1.5 uppercase tracking-wider">
                            {item.label}
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {item.children
                              .filter((child) => child.show)
                              .map((child) => {
                                const isActive = isPathActive(
                                  pathname,
                                  child.href
                                );
                                return (
                                  <Link
                                    key={child.href}
                                    href={child.href}
                                    className={`relative flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-xs font-semibold transition-colors duration-150 ${
                                      isActive
                                        ? 'text-emerald-400 font-bold'
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }`}
                                  >
                                    {isActive && (
                                      <span className="absolute left-0 top-1 bottom-1 w-1 bg-emerald-400 rounded-r-sm shadow-xs" />
                                    )}
                                    {child.icon}
                                    <span>{child.label}</span>
                                    {isActive && (
                                      <span className="ml-auto w-1.5 h-1.5 rounded-sm bg-emerald-300 animate-pulse" />
                                    )}
                                  </Link>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const isGroupOpen = openGroup === item.label;

                return (
                  <div key={item.label} className="w-full flex flex-col gap-1">
                    <button
                      onClick={() =>
                        setOpenGroup(isGroupOpen ? null : item.label)
                      }
                      className={`relative flex h-9 items-center rounded-sm transition-colors w-full justify-start px-2.5 gap-2.5 ${
                        isChildActive
                          ? 'text-emerald-400 font-bold'
                          : 'text-gray-300 hover:bg-gray-700/70 hover:text-white font-medium'
                      }`}
                    >
                      {isChildActive && (
                        <span className="absolute left-0 top-1 bottom-1 w-1 bg-emerald-400 rounded-r-sm shadow-xs" />
                      )}
                      {item.icon}
                      <span className="font-semibold text-xs truncate">
                        {item.label}
                      </span>
                      <span className="ml-auto">
                        {isGroupOpen ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </span>
                    </button>
                    {isGroupOpen && (
                      <div className="w-auto flex flex-col gap-1 ml-3 border-l border-gray-700 pl-2">
                        {item.children
                          .filter((child) => child.show)
                          .map((child) => (
                            <NavItem
                              key={child.href}
                              href={child.href}
                              label={child.label}
                              isCollapsed={collapsed}
                              className="whitespace-nowrap overflow-hidden text-ellipsis h-8 text-[11px]"
                            >
                              {child.icon}
                            </NavItem>
                          ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavItem
                  key={item.href}
                  href={item.href || ''}
                  label={item.label || ''}
                  isCollapsed={collapsed}
                  className="whitespace-nowrap overflow-hidden text-ellipsis"
                >
                  {item.icon}
                </NavItem>
              );
            })}
        </div>

        <div className="flex w-full justify-end px-2 mb-2 border-t border-gray-700 pt-2">
          <button
            onClick={onToggle}
            className="p-1 rounded-sm hover:bg-accent hover:text-black text-gray-400 hover:text-white"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `
        }}
      />
    </aside>
  );
}
