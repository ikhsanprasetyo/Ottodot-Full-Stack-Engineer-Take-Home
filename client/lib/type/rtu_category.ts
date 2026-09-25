export interface RTUCategory {
  _id: string;
  name: string;
  isActive: boolean;
  isDeleted: boolean;
  deletedAt?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
