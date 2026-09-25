export interface Position {
  _id: string;
  name: string;
  label: string;

  // soft delete
  isDeleted?: boolean;
  deletedAt?: string | Date | null;

  createdAt?: string | Date;
  updatedAt?: string | Date;
}
