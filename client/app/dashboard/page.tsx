'use client';

import DashboardLayout from '@/components/layout/dashboard/dashboard-layout';
import { useGetUserProfile } from '@/lib/hooks/queries/user';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Store,
  ShoppingBasket,
  UserCircle,
  Truck,
  Zap,
  PackageCheck,
  LineChart,
  Database,
  ChefHat
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useGetPermission } from '@/lib/hooks/useGetPermission';

export default function DashboardPage() {
  const { data, isLoading: isProfileLoading } = useGetUserProfile();
  const user = data?.data;
  const router = useRouter();

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
  const { hasPermission: hasPermissionRtuRecipe } = useGetPermission(
    'list',
    'rtu_recipe'
  );
  const { hasPermission: hasPermissionRtuProduct } = useGetPermission(
    'list',
    'rtu_product'
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

  const quickLinks = [
    {
      title: 'Vendor Bahan Baku',
      description: 'Kelola supplier & harga material',
      icon: <Store className="h-8 w-8 text-blue-500" />,
      href: '/rtu/vendor',
      color: 'bg-blue-50',
      show: hasPermissionRtuVendor
    },
    {
      title: 'Stok Bahan Baku',
      description: 'Pantau ketersediaan material',
      icon: <ShoppingBasket className="h-8 w-8 text-purple-500" />,
      href: '/rtu/material',
      color: 'bg-purple-50',
      show: hasPermissionRtuMaterial
    },
    {
      title: 'Resep & Produk',
      description: 'Master data resep & varian produk',
      icon: <ChefHat className="h-8 w-8 text-emerald-500" />,
      href: '/rtu/product',
      color: 'bg-emerald-50',
      show: hasPermissionRtuProduct || hasPermissionRtuRecipe
    },
    {
      title: 'Penerimaan (GRN)',
      description: 'Inbound stok dari vendor',
      icon: <PackageCheck className="h-8 w-8 text-rose-500" />,
      href: '/rtu/grn',
      color: 'bg-rose-50',
      show: hasPermissionRtuGRN
    },
    {
      title: 'Produksi & HPP',
      description: 'Batch produksi & hitung costing',
      icon: <Zap className="h-8 w-8 text-amber-500" />,
      href: '/rtu/production',
      color: 'bg-amber-50',
      show: hasPermissionRtuProduction
    },
    {
      title: 'Shipment',
      description: 'Kelola logistik pengiriman barang & material',
      icon: <Truck className="h-8 w-8 text-indigo-500" />,
      href: '/rtu/distribution',
      color: 'bg-indigo-50',
      show: hasPermissionRtuDistribution
    },
    {
      title: 'Laporan Produksi',
      description: 'Analisa yield & efisiensi CK',
      icon: <LineChart className="h-8 w-8 text-red-500" />,
      href: '/rtu/report',
      color: 'bg-red-50',
      show: hasPermissionRtuReport
    },
    {
      title: 'Kartu Stok (Audit)',
      description: 'Audit trail mutasi stok CK',
      icon: <Database className="h-8 w-8 text-slate-500" />,
      href: '/rtu/ledger',
      color: 'bg-slate-50',
      show: hasPermissionRtuLedger
    },
    {
      title: 'Outlets',
      description: 'Daftar outlet Sinar Utama',
      icon: <Store className="h-8 w-8 text-sky-500" />,
      href: '/outlet',
      color: 'bg-sky-50',
      show: hasPermissionOutletList
    },
    {
      title: 'Users',
      description: 'Kelola tim & akses sistem',
      icon: <UserCircle className="h-8 w-8 text-gray-500" />,
      href: '/users',
      color: 'bg-gray-50',
      show: hasPermissionUsersList
    }
  ];

  const visibleLinks = quickLinks.filter((link) => link.show);

  return (
    <DashboardLayout isLoading={isProfileLoading}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            Selamat Datang, {user?.name || user?.username || 'User'}!
          </h1>
          <p className="text-gray-500">
            RTU Production & Distribution System — Sinar Utama
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleLinks.map((link) => (
            <Card
              key={link.href}
              className="cursor-pointer hover:shadow-md transition-shadow border-none shadow-sm"
              onClick={() => router.push(link.href)}
            >
              <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                <div className={`p-4 rounded-full ${link.color}`}>
                  {link.icon}
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{link.title}</h3>
                  <p className="text-xs text-gray-500">{link.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-none shadow-sm bg-gradient-to-br from-gray-800 to-gray-900 text-white">
          <CardHeader>
            <CardTitle className="text-lg">RTU System Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 text-sm w-full leading-relaxed">
              Sistem ini digunakan untuk mengelola rantai pasok Central Kitchen
              dari pengadaan bahan baku, produksi produk jadi, hingga distribusi
              ke seluruh jaringan outlet Sinar Utama secara real-time.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
