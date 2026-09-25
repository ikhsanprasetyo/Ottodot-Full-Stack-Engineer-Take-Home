'use client';

import { Pencil, Trash2, RefreshCw, UserX, MapPin } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  useDeleteUser,
  useRestoreUser,
  useHardDeleteUser
} from '@/lib/hooks/mutation/user';
import { Button } from '@/components/ui/button';
import { ExtendedColumnDef, TableData } from '@/components/ui/table-data';
import { LoginHistoryPopover } from '@/components/ui/login-history-popover';
import { UserActivityStatus } from '@/components/ui/user-activity-status';
import { useGetPermission } from '@/lib/hooks/useGetPermission';
import { TooltipProvider } from '@/components/ui/tooltip';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { SortingState } from '@tanstack/react-table';
import { getLocationString } from '@/lib/utils';

dayjs.extend(relativeTime);

type UsersTableProps = {
  dataArray: any[];
  offset: number;
  totalData: number;
  page: number;
  setPage: (val: number) => void;
  totalPages: number;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  isLoading?: boolean;
  limit?: number;
  setLimit?: (value: number) => void;
  showDeleted: boolean;
  setShowDeleted: (val: boolean) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
};

export function UsersTable({
  dataArray,
  offset,
  totalData,
  page,
  setPage,
  totalPages,
  globalFilter,
  setGlobalFilter,
  isLoading = false,
  limit = 10,
  setLimit,
  showDeleted,
  setShowDeleted,
  sorting,
  onSortingChange
}: UsersTableProps) {
  const queryClient = useQueryClient();
  const { mutate: deleteUser } = useDeleteUser();
  const { mutate: restoreUser } = useRestoreUser();
  const { mutate: hardDeleteUser } = useHardDeleteUser();

  const { hasPermission: hasPermissionUpdate } = useGetPermission('update');
  const { hasPermission: hasPermissionDelete } = useGetPermission('delete');

  const handleDelete = (user: any) => {
    if (confirm(`Delete user ${user.name}?`)) {
      deleteUser(user._id, {
        onSuccess: (res) => {
          toast.success(res?.message || 'User deleted!');
          queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to delete');
        }
      });
    }
  };

  const handleRestore = (user: any) => {
    if (confirm(`Restore user ${user.name}?`)) {
      restoreUser(user._id, {
        onSuccess: (res) => {
          toast.success(res?.message || 'User restored!');
          queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message || 'Failed to restore');
        }
      });
    }
  };

  const handleHardDelete = (user: any) => {
    if (
      confirm(`PERMANENTLY delete user ${user.name}? This cannot be undone.`)
    ) {
      hardDeleteUser(user._id, {
        onSuccess: (res) => {
          toast.success(res?.message || 'User permanently deleted!');
          queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (err: any) => {
          toast.error(
            err?.response?.data?.message || 'Failed to permanently delete'
          );
        }
      });
    }
  };

  const columns: ExtendedColumnDef<any>[] = [
    {
      id: 'index',
      header: '#',
      size: 50,
      cell: ({ row }) => (
        <span className="text-center font-medium">
          {offset + row.index + 1}
        </span>
      )
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableGlobalFilter: true,
      size: 150,
      noWrap: true
    },
    {
      accessorKey: 'username',
      header: 'Username',
      minSize: 100, // minimal bisa di-resize
      maxSize: 300 // maksimal bisa di-resize
    },
    {
      accessorKey: 'email',
      header: 'Email',
      enableGlobalFilter: true,
      size: 180, // lebar default
      minSize: 100, // minimal bisa di-resize
      maxSize: 300 // maksimal bisa di-resize
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ getValue }) => (
        <span className=" md:inline">{getValue() as string}</span>
      )
    },
    {
      header: 'Position',
      accessorFn: (row) => row.positionDoc?.name ?? '-'
    },
    {
      header: 'Outlet',
      accessorFn: (row) => row.outletDoc?.label ?? '-'
    },
    {
      accessorKey: 'todayOnlineDuration',
      header: 'Today Online Duration',
      cell: ({ row }) => {
        const lastSeen =
          row.original?.activity?.lastSeenAt || row.original?.lastSeenAt;
        const isToday = lastSeen
          ? dayjs(lastSeen).isSame(dayjs(), 'day')
          : false;
        const timeSec = isToday
          ? (row.original.todayOnlineDuration as number) || 0
          : 0;
        const h = Math.floor(timeSec / 3600);
        const m = Math.floor((timeSec % 3600) / 60);
        const s = timeSec % 60;
        if (h > 0) return `${h}j ${m}m ${s}d`;
        return `${m}m ${s}d`;
      }
    },
    {
      accessorKey: 'onlineDuration',
      header: 'Total Online Duration',
      cell: ({ row }) => {
        const timeSec = (row.original.onlineDuration as number) || 0;
        const h = Math.floor(timeSec / 3600);
        const m = Math.floor((timeSec % 3600) / 60);
        const s = timeSec % 60;
        if (h > 0) return `${h}j ${m}m ${s}d`;
        return `${m}m ${s}d`;
      }
    },
    {
      id: 'activity',
      header: 'Activity Status',
      accessorFn: (row) => row.activity?.lastSeenAt || row.lastSeenAt,
      size: 150,
      cell: ({ row }) => {
        const activity = row.original?.activity;

        return (
          <UserActivityStatus
            lastSeenAt={activity?.lastSeenAt || row.original?.lastSeenAt}
          />
        );
      }
    },
    {
      id: 'lastLogins',
      header: 'Login History',
      size: 140,
      cell: ({ row }) => {
        const history = row.original.lastLogins;
        return history && history.length > 0 ? (
          <LoginHistoryPopover lastLogins={history} />
        ) : (
          <span className="text-xs text-gray-400">-</span>
        );
      }
    },
    {
      id: 'latestLocation',
      header: 'Latest Location',
      size: 200,
      cell: ({ row }) => {
        // Backend extracts these flat fields from live_login JSONB (same pattern as byteseeker)
        const displayName: string | undefined = row.original.lastDisplayName;
        const city: string | undefined = row.original.lastCity;
        const state: string | undefined = row.original.lastState;
        const country: string | undefined = row.original.lastCountry;

        let loc = 'Unknown Location';
        if (displayName) {
          // Shorten: take first 3 parts of display_name (most relevant)
          const parts = displayName.split(',').map((s: string) => s.trim());
          loc = parts.slice(0, 3).join(', ');
        } else {
          loc = getLocationString({ city, region: state, country });
        }

        let mapLink = '';
        const lat = row.original.liveLogin?.location?.latitude;
        const lng = row.original.liveLogin?.location?.longitude;
        if (lat && lng) {
          mapLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        } else {
          const locStr = displayName || loc;
          if (locStr && locStr !== 'Unknown Location' && locStr !== 'Local') {
            mapLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locStr)}`;
          }
        }

        return (
          <div className="flex items-center gap-1.5 py-0.5">
            {mapLink ? (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:bg-slate-100 p-0.5 rounded-sm transition-colors flex-shrink-0 flex items-center justify-center h-5 w-5"
                title="Buka di Google Maps"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icons/google-maps-classic.svg"
                  alt="Google Maps"
                  className="h-3.5 w-3.5"
                />
              </a>
            ) : (
              <MapPin className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
            )}
            <span
              className="text-xs text-gray-700 truncate inline-block max-w-[150px]"
              title={displayName || loc}
            >
              {loc}
            </span>
          </div>
        );
      }
    },
    ...(showDeleted
      ? [
          {
            accessorKey: 'deletedAt',
            header: 'Deleted At',
            size: 160,
            cell: ({ getValue }: any) => {
              const val = getValue();
              return val ? dayjs(val).format('DD MMM YYYY, HH:mm') : '-';
            }
          } as ExtendedColumnDef<any>
        ]
      : []),
    {
      id: 'actions',
      header: 'Actions',
      align: 'center',
      size: 120,
      cell: ({ row }) => {
        const user = row.original;

        if (user.isDeleted && showDeleted) {
          return (
            <div className="flex gap-2 justify-center">
              {hasPermissionUpdate && (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => handleRestore(user)}
                  title="Restore User"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              {hasPermissionDelete && (
                <Button
                  variant="destructive"
                  size="xs"
                  onClick={() => handleHardDelete(user)}
                  title="Delete Permanently"
                >
                  <UserX className="w-4 h-4 mr-1" />
                  Hard Delete
                </Button>
              )}
            </div>
          );
        }

        return (
          <div className="flex gap-2 justify-center">
            {hasPermissionUpdate && (
              <Button
                variant="outline"
                size="xs"
                onClick={() => window.location.assign(`/user/${user._id}`)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            )}
            {hasPermissionDelete && (
              <Button
                variant="destructive"
                size="xs"
                onClick={() => handleDelete(user)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
            )}
          </div>
        );
      }
    }
  ];

  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={0}>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="text-lg font-bold">User Management</h4>
            <p className="text-xs text-gray-500">
              Add, edit, and manage user accounts and permissions.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="show-deleted"
              className="text-sm font-medium cursor-pointer text-gray-700"
            >
              Show Deleted Only
            </label>
            <input
              id="show-deleted"
              type="checkbox"
              className="w-4 h-4 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
            />
          </div>
        </div>

        <TableData
          description="Users"
          data={dataArray}
          page={page}
          setPage={setPage}
          totalPages={totalPages}
          offset={offset}
          totalCount={totalData}
          columns={columns}
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          isLoading={isLoading}
          limit={limit}
          setLimit={setLimit}
          isServerMode
          sorting={sorting}
          onSortingChange={onSortingChange}
        />
      </div>
    </TooltipProvider>
  );
}
