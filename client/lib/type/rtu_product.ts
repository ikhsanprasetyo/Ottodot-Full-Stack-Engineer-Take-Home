import { RTURecipe } from './rtu_recipe';

export interface RTUProduct {
  _id: string;
  code: string;
  name: string;
  category: string | { _id?: string; name?: string };
  outputUnit: string;
  description?: string;
  isActive: boolean;
  minStock?: number;
  currentStock?: number;

  barcode?: string;
  imageUrl?: string;
  units?: RTUProductUnit[];

  recipe?: RTURecipe;

  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RTUProductUnit {
  _id?: string;
  productId?: string;
  unitName: string;
  conversion: number;
  relativeToUnit?: string;
  relativeConversion?: number;
  barcode?: string;
}
