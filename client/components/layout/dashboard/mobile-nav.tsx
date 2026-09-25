'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Home,
  Users2,
  PanelLeft,
  Store,
  ShoppingBasket,
  ShoppingCart,
  Factory,
  PackageCheck,
  Truck,
  LineChart,
  Database,
  ChevronDown,
  ChevronRight,
  Layers,
  Settings,
  Calculator,
  CreditCard,
  Scale,
  Receipt
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { isPathActive } from '@/lib/utils';

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

export default function MobileNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
  const { hasPermission: hasPermissionRtuProduct } = useGetPermission(
    'list',
    'rtu_product'
  );
  const { hasPermission: hasPermissionRtuCategory } = useGetPermission(
    'list',
    'rtu_category'
  );
  const { hasPermission: hasPermissionRtuUnit } = useGetPermission(
    'list',
    'rtu_unit'
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
  const { hasPermission: hasPermissionRtuPurchase } = useGetPermission(
    'list',
    'rtu_purchase'
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
      icon: <ShoppingCart className="h-5 w-5 text-emerald-500" />,
      show: hasPermissionRtuPurchase || hasPermissionRtuGRN,
      children: [
        ...(hasPermissionRtuPurchase
          ? [
              {
                href: '/rtu/purchase',
                label: 'Purchase Order',
                icon: <ShoppingCart className="h-4 w-4 text-emerald-500" />,
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
      icon: <Layers className="h-5 w-5 text-amber-500" />,
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

  const handleNavigate = (href: string) => {
    router.push(href);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="outline" className="sm:hidden">
          <PanelLeft className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="sm:max-w-xs">
        <SheetTitle className="sr-only">Mobile Navigation</SheetTitle>
        <SheetDescription className="sr-only">
          Navigation menu for mobile users
        </SheetDescription>

        <nav className="grid gap-4 text-base font-medium mt-6">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              if (item.isGroup) {
                const isChildActive = item.children.some((child) =>
                  isPathActive(pathname, child.href)
                );

                const isGroupOpen = openGroup === item.label;

                return (
                  <div key={item.label} className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroup(isGroupOpen ? null : item.label)
                      }
                      className={`relative flex items-center gap-4 px-2.5 py-1.5 rounded-sm transition-colors text-left w-full ${
                        isChildActive
                          ? 'text-emerald-600 font-bold'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isChildActive && (
                        <span className="absolute left-0 top-1 bottom-1 w-1 bg-emerald-500 rounded-r-sm shadow-xs" />
                      )}
                      {item.icon}
                      <span className="flex-1">{item.label}</span>
                      {isGroupOpen ? (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 h-4 text-gray-400" />
                      )}
                    </button>
                    {isGroupOpen && (
                      <div className="flex flex-col gap-2 ml-4 pl-4 border-l border-gray-200">
                        {item.children
                          .filter((child) => child.show)
                          .map((child) => {
                            const isActive = isPathActive(pathname, child.href);
                            return (
                              <button
                                key={child.label}
                                type="button"
                                onClick={() => handleNavigate(child.href)}
                                className={`relative flex items-center gap-3 py-1.5 text-sm rounded-sm px-2.5 ${
                                  isActive
                                    ? 'text-emerald-600 font-bold'
                                    : 'text-muted-foreground hover:text-foreground'
                                }`}
                              >
                                {isActive && (
                                  <span className="absolute left-0 top-1 bottom-1 w-1 bg-emerald-500 rounded-r-sm shadow-xs" />
                                )}
                                {child.icon}
                                <span>{child.label}</span>
                                {isActive && (
                                  <span className="ml-auto w-1.5 h-1.5 rounded-sm bg-emerald-300 animate-pulse" />
                                )}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = isPathActive(pathname, item.href || '');

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavigate(item.href || '')}
                  className={`relative flex items-center gap-4 px-2.5 py-1.5 rounded-sm transition-colors text-left ${
                    isActive
                      ? 'text-emerald-600 font-bold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1 bottom-1 w-1 bg-emerald-500 rounded-r-sm shadow-xs" />
                  )}
                  {item.icon}
                  {item.label}
                </button>
              );
            })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
