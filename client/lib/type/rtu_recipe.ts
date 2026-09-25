import { RTUMaterial } from './rtu_material';

export interface RTURecipeIngredient {
  _id: string;
  versionId: string;
  materialId: string;
  alternativeMaterialIds?: string[];
  material?: RTUMaterial;
  alternatives?: RTUMaterial[];
  qty: number;
  unit: string;
}

export interface RTURecipeVersion {
  _id: string;
  recipeId: string;
  versionNumber: string;
  status: 'draft' | 'active' | 'archived';
  notes?: string;
  expectedOutput: number;
  ingredients?: RTURecipeIngredient[];
  isLocked: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RTURecipe {
  _id: string;
  productId: string;
  versions?: RTURecipeVersion[];
  createdAt: string;
  updatedAt: string;
}
