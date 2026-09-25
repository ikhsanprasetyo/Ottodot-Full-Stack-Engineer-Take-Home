export interface RTUUnit {
  _id: string;
  name: string;
  /**
   * Hierarki satuan:
   *   0 = Satuan Dasar (ml, gr, L, kg)
   *   1 = Satuan Individual (pcs, botol, sachet, jerigen)
   *   2 = Satuan Bundel (Dus, Box, Karton)
   *   3 = Satuan Besar (Container, Pallet, Truk)
   */
  level: number;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/** Label dan warna badge untuk tiap level satuan */
export const UNIT_LEVELS = [
  {
    value: 0,
    label: 'Level 0 — Satuan Dasar',
    example: 'ml, gr, L, kg',
    color: 'bg-gray-100 text-gray-600'
  },
  {
    value: 1,
    label: 'Level 1 — Satuan Individual',
    example: 'pcs, botol, sachet, jerigen',
    color: 'bg-blue-100 text-blue-700'
  },
  {
    value: 2,
    label: 'Level 2 — Satuan Bundel',
    example: 'Dus, Box, Karton',
    color: 'bg-amber-100 text-amber-700'
  },
  {
    value: 3,
    label: 'Level 3 — Satuan Besar',
    example: 'Container, Pallet, Truk',
    color: 'bg-purple-100 text-purple-700'
  }
] as const;

export type UnitLevel = 0 | 1 | 2 | 3;
