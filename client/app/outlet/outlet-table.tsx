'use client';

import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCreateOutlet,
  useUpdateOutlet,
  useDeleteOutlet
} from '@/lib/hooks/mutation/outlet';
import { ExtendedColumnDef, TableData } from '@/components/ui/table-data';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { Outlet } from '@/lib/type/outlet';
import { OutletForm } from './outlet-form';
import { useState } from 'react';
import { ModalEdit } from '@/components/ui/modal-edit';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type OutletTableProps = {
  dataArray: Outlet[];
  offset: number;
  totalData: number;
  page: number;
  setPage: (val: number) => void;
  totalPages: number;
  limit?: number;
  setLimit?: (value: number) => void;
  sorting: any[];
  setSorting: (val: any) => void;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading?: boolean;
};

export function OutletTable({
  dataArray,
  offset,
  totalData,
  page,
  setPage,
  totalPages,
  globalFilter,
  setGlobalFilter,
  sorting,
  setSorting,
  isLoading = false,
  limit = 10,
  setLimit
}: OutletTableProps) {
  const queryClient = useQueryClient();
  const { mutate: createOutlet } = useCreateOutlet();
  const { mutate: updateOutlet } = useUpdateOutlet();
  const { mutate: deleteOutlet } = useDeleteOutlet();

  const [showAddModal, setShowAddModal] = useState(false);

  const { hasPermission: hasPermissionCreate } = useGetPermission('create');
  const { hasPermission: hasPermissionUpdate } = useGetPermission('update');
  const { hasPermission: hasPermissionDelete } = useGetPermission('delete');

  const handleDelete = (item: Outlet) => {
    if (confirm(`Are you sure you want to delete outlet "${item.label}"?`)) {
      deleteOutlet(item._id, {
        onSuccess: (res) => {
          toast.success(res?.message || 'Outlet deleted successfully');
          queryClient.invalidateQueries({ queryKey: ['outlets'] });
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || 'Failed to delete outlet'
          );
        }
      });
    }
  };

  const columns: ExtendedColumnDef<Outlet>[] = [
    {
      id: 'index',
      header: '#',
      size: 50,
      sticky: 'left',
      cell: ({ row, table }) => {
        const visualIndex = table
          .getSortedRowModel()
          .flatRows.findIndex((r) => r.id === row.id);
        return (
          <span className="text-center font-medium">
            {offset + visualIndex + 1}
          </span>
        );
      }
    },
    {
      accessorKey: 'label',
      header: 'Outlet Name',
      size: 100,
      noWrap: true
    },
    {
      accessorKey: 'abbreviation',
      header: 'Abbreviation',
      size: 80,
      cell: ({ getValue }) => (
        <span className="font-mono text-[11px] font-bold text-gray-700">
          {(getValue() as string) || '-'}
        </span>
      )
    },
    {
      accessorKey: 'type',
      header: 'Type',
      size: 100,
      cell: ({ getValue }) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
            getValue() === 'HO'
              ? 'bg-purple-100 text-purple-700'
              : getValue() === 'Warehouse'
                ? 'bg-orange-100 text-orange-700'
                : 'bg-blue-100 text-blue-700'
          }`}
        >
          {getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'city',
      header: 'City',
      size: 80
    },
    {
      accessorKey: 'region',
      header: 'Region',
      size: 100
    },
    {
      accessorKey: 'address',
      header: 'Address',
      size: 200
    },
    // Hidden columns for sorting
    {
      accessorKey: 'createdAt',
      header: 'Created At',
      visible: false
    },
    {
      accessorKey: '_id',
      header: 'ID',
      visible: false
    }
  ];

  const handleAddSubmit = (values: any, helpers: any) => {
    createOutlet(values, {
      onSuccess: (res) => {
        toast.success(res?.message || 'Outlet created successfully');
        setShowAddModal(false);
        queryClient.invalidateQueries({ queryKey: ['outlets'] });
        helpers.setIsSaving(false);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to create outlet');
        helpers.setIsSaving(false);
      }
    });
  };

  const handleEditSubmit = (values: Outlet, helpers: any) => {
    updateOutlet(values, {
      onSuccess: (res) => {
        toast.success(res?.message || 'Outlet updated successfully');
        queryClient.invalidateQueries({ queryKey: ['outlets'] });
        helpers.setIsSaving(false);
        helpers.closeModal();
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message || 'Failed to update outlet');
        helpers.setIsSaving(false);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-lg font-bold">Outlet Management</h4>
          <p className="text-xs text-gray-500">
            Add, edit, and manage company outlets.
          </p>
        </div>
        {hasPermissionCreate && (
          <Button onClick={() => setShowAddModal(true)} className="flex gap-2">
            <Plus className="w-4 h-4" /> Add Outlet
          </Button>
        )}
      </div>

      {showAddModal && (
        <ModalEdit
          title="Add New Outlet"
          item={{ _id: '' } as Outlet}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddSubmit}
          renderForm={(values, setValues) => (
            <OutletForm values={values} setValues={setValues} />
          )}
        />
      )}

      <TableData
        description="Outlets"
        data={dataArray}
        columns={columns}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
        offset={offset}
        totalCount={totalData}
        globalFilter={globalFilter}
        setGlobalFilter={setGlobalFilter}
        isLoading={isLoading}
        limit={limit}
        setLimit={setLimit}
        onDelete={hasPermissionDelete ? handleDelete : undefined}
        renderEditForm={
          hasPermissionUpdate
            ? (values, setValues) => (
                <OutletForm values={values} setValues={setValues} />
              )
            : undefined
        }
        onSubmitEdit={handleEditSubmit}
        modalEditTitle="Edit Outlet"
        isServerMode
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  );
}
