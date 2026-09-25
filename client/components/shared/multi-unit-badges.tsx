'use client';

import { Badge } from '@/components/ui/badge';
import { round } from '@/lib/number';

interface RTUMaterialUnit {
  unitName: string;
  conversion: number;
  relativeToUnit?: string;
  relativeConversion?: number;
}

interface MultiUnitBadgesProps {
  unit: string;
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

export function MultiUnitBadges({
  unit,
  units = [],
  className = '',
  maxW = 'max-w-[240px]'
}: MultiUnitBadgesProps) {
  const cMap = buildUnitConversionMap(unit, units || []);

  const allUnits = [
    {
      unitName: unit,
      conversion: 1,
      isBase: true,
      relativeToUnit: undefined,
      relativeConversion: undefined
    },
    ...(units || []).map((u: any) => ({
      unitName: u.unitName,
      conversion:
        cMap[u.unitName] && cMap[u.unitName] > 0
          ? cMap[u.unitName]
          : Number(u.conversion) || 1,
      isBase: false,
      relativeToUnit: u.relativeToUnit,
      relativeConversion: u.relativeConversion
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

  const renderBadgeContent = (u: (typeof allUnits)[0]) => {
    if (u.isBase) {
      return `1 ${u.unitName} (Base)`;
    }
    return `1 ${u.unitName} = ${u.relativeConversion ?? u.conversion} ${
      u.relativeToUnit || unit
    }`;
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
        {renderBadgeContent(primaryUnit)}
      </Badge>

      {/* Unit sisanya sebagai Badge Sekunder (Abu-abu Outline) */}
      {secondaryUnits.map((u, idx) => (
        <Badge
          key={idx}
          variant="outline"
          className="text-[9px] font-medium px-1.5 py-0 rounded-sm border-gray-200 text-gray-600 bg-gray-50/50 hover:bg-gray-50/50"
        >
          {renderBadgeContent(u)}
        </Badge>
      ))}
    </div>
  );
}

export { MultiUnitPriceBadges } from './multi-unit-price-badges';
