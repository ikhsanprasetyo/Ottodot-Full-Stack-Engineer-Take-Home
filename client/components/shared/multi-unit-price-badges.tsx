'use client';

import { Badge } from '@/components/ui/badge';
import { toIDR } from '@/lib/utils';
import { round } from '@/lib/number';

interface RTUMaterialUnit {
  unitName: string;
  conversion: number;
  relativeToUnit?: string;
  relativeConversion?: number;
}

interface MultiUnitPriceBadgesProps {
  basePrice: number;
  baseUnit: string;
  units?: RTUMaterialUnit[];
  className?: string;
  maxW?: string;
}

const buildUnitConversionMap = (
  baseUnit: string,
  materialUnits: any[]
): Record<string, number> => {
  const map: Record<string, number> = { [baseUnit]: 1 };

  // Set awal jika conversion > 0
  (materialUnits || []).forEach((u) => {
    if (u.unitName && Number(u.conversion) > 0) {
      map[u.unitName] = Number(u.conversion);
    }
  });

  // Iterasi untuk me-resolve relative conversion (chaining: Dus -> pcs -> L)
  for (let pass = 0; pass < (materialUnits || []).length + 1; pass++) {
    (materialUnits || []).forEach((u) => {
      if (!u.unitName) return;
      const rel = u.relativeToUnit || '';
      const rc = Number(u.relativeConversion) || Number(u.conversion) || 1;
      if (!rel || rel === baseUnit) {
        if (!map[u.unitName] || map[u.unitName] <= 0) {
          map[u.unitName] = rc > 0 ? rc : 1;
        }
      } else if (map[rel] !== undefined && map[rel] > 0) {
        if (!map[u.unitName] || map[u.unitName] <= 0) {
          map[u.unitName] = round(rc * map[rel], 6);
        }
      }
    });
  }

  return map;
};

export function MultiUnitPriceBadges({
  basePrice = 0,
  baseUnit = 'Unit',
  units = [],
  className = '',
  maxW = 'max-w-[240px]'
}: MultiUnitPriceBadgesProps) {
  const cMap = buildUnitConversionMap(baseUnit, units || []);

  const allUnits = [
    { unitName: baseUnit, conversion: 1, isBase: true },
    ...(units || []).map((u: any) => ({
      unitName: u.unitName,
      conversion:
        cMap[u.unitName] && cMap[u.unitName] > 0
          ? cMap[u.unitName]
          : Number(u.conversion) || 1,
      isBase: false
    }))
  ];

  // Urutkan: utamakan unit kemasan (pcs/botol/jerigen) dibanding base unit (L/ml/kg/gr), lalu urutkan konversi terbesar
  allUnits.sort((a, b) => {
    if (!a.isBase && b.isBase) return -1;
    if (a.isBase && !b.isBase) return 1;
    return b.conversion - a.conversion;
  });

  const primaryUnit = allUnits[0];
  const secondaryUnits = allUnits.slice(1);

  const getUnitPrice = (item: (typeof allUnits)[0]) => {
    const rawUnitPrice = basePrice * item.conversion;
    const roundedInt = Math.round(rawUnitPrice);
    if (Math.abs(rawUnitPrice - roundedInt) < 0.01) {
      return roundedInt;
    }
    return round(rawUnitPrice, 2);
  };

  return (
    <div
      className={`flex flex-wrap gap-1 py-0 items-center ${maxW} ${className}`}
    >
      {/* Unit terbesar sebagai Badge Utama (Hijau Emerald) */}
      <Badge
        variant="secondary"
        className="text-[9px] font-bold px-1.5 py-0 rounded-sm bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-50"
      >
        {toIDR(getUnitPrice(primaryUnit), 0, 2)} /{primaryUnit.unitName}
      </Badge>

      {/* Unit sisanya sebagai Badge Sekunder (Abu-abu Outline) */}
      {secondaryUnits.map((u, idx) => (
        <Badge
          key={idx}
          variant="outline"
          className="text-[9px] font-medium px-1.5 py-0 rounded-sm border-gray-200 text-gray-600 bg-gray-50/50 hover:bg-gray-50/50"
        >
          {toIDR(getUnitPrice(u), 0, 2)} /{u.unitName}
        </Badge>
      ))}
    </div>
  );
}
