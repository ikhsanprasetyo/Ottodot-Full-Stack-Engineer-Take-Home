'use client';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { TablePagination } from '@/components/ui/table-pagination';
import { Button } from '@/components/ui/button';
import {
  Pencil,
  Trash2,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  FolderOpen
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ModalEdit } from '@/components/ui/modal-edit';
import { Authorized } from './authorized';
import { cn } from '@/lib/utils';
import { SearchInput } from './search-input';
import React, { memo } from 'react';
import {
  getLocalStorageSettings,
  updateLocalStorageSettings
} from '@/lib/localStorage';

export type ExtendedColumnDef<T> = ColumnDef<T, any> & {
  copy?: boolean;
  align?: 'left' | 'center' | 'right';
  minSize?: number;
  maxSize?: number;
  sticky?: 'left' | 'right';
  stickyIndex?: number;
  noWrap?: boolean;
  visible?: boolean;
};

const cellAlignClass = {
  left: 'text-left justify-start',
  center: 'text-center justify-center',
  right: 'text-right justify-end'
} as const;

const headerAlignClass = {
  left: 'text-left justify-start',
  center: 'text-center justify-center',
  right: 'text-right justify-end'
} as const;

export type TableDataProps<TData> = {
  title?: string;
  description?: string;
  data: TData[];
  columns: ExtendedColumnDef<TData>[];
  page?: number;
  setPage?: (val: number) => void;
  totalPages?: number;
  offset?: number;
  totalCount?: number;

  onEdit?: (item: TData) => void;
  onDelete?: (item: TData) => void;
  onView?: (item: TData) => void;
  renderActions?: (item: TData) => React.ReactNode;

  modalEditTitle?: string;
  renderEditForm?: (
    values: TData,
    setValues: (newVal: Partial<TData>) => void
  ) => React.ReactNode;
  onSubmitEdit?: (
    values: TData,
    helpers: { setIsSaving: (v: boolean) => void; closeModal: () => void }
  ) => void;
  isLoading?: boolean;
  noDataTitle?: string;
  noDataMessage?: string;
  limit?: number;
  setLimit?: (value: number) => void;
  globalFilter?: string;
  setGlobalFilter?: (val: string) => void;
  isServerMode?: boolean;
  hideSearchInput?: boolean;
  initialSorting?: SortingState;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  hidePagination?: boolean;
  tableContainerClassName?: string;
  footerRow?: React.ReactNode;
  actionsColumnSize?: number;
  requireAuthorization?: boolean;
};

// Custom comparison: set to return false to guarantee row re-renders on any data updates
const areRowPropsEqual = (
  _prev: { row: any; _columnsKey: string },
  _next: { row: any; _columnsKey: string }
) => {
  return false;
};

const TableDataRow = memo((props: { row: any; _columnsKey: string }) => {
  const { row } = props;
  const original: any = row.original;

  // ================= GROUP HEADER ROW =================
  if (original.isGroupHeader) {
    return (
      <TableRow key={row.id} className="bg-emerald-200 hover:bg-sky-200">
        <TableCell
          colSpan={row.getVisibleCells().length}
          className="p-0 border-b-0"
        >
          <div className="sticky left-0 w-max px-2 py-1.5 font-bold text-sm text-slate-700">
            {original.productType || original.name || 'GROUP'}
          </div>
        </TableCell>
      </TableRow>
    );
  }

  // ================= NORMAL ROW =================
  return (
    <TableRow
      key={row.id}
      className="hover:bg-[#FFF6E5]/60 border-b border-[#EDE7DC]/60 transition-colors duration-150"
    >
      {row.getVisibleCells().map((cell: any) => {
        const colDef = cell.column.columnDef as ExtendedColumnDef<any>;

        return (
          <TableCell
            key={cell.id}
            style={{
              width: cell.column.getSize(),
              minWidth: colDef.minSize,
              maxWidth: colDef.maxSize,
              ...(colDef.sticky === 'left'
                ? {
                    left: cell.column.getStart()
                  }
                : colDef.sticky === 'right'
                  ? {
                      right: cell.column.getAfter('right')
                    }
                  : {})
            }}
            className={cn(
              'px-3 py-3.5 text-xs text-[#15172B] align-middle',
              cellAlignClass[colDef.align || 'left'],
              colDef.sticky === 'left' || colDef.sticky === 'right'
                ? 'sticky z-20 bg-opacity-100 bg-white'
                : '',
              colDef.sticky === 'left' ? 'left-0' : '',
              colDef.sticky === 'right' ? 'right-0' : '',
              colDef.noWrap ? 'whitespace-nowrap' : ''
            )}
          >
            {flexRender(colDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </TableRow>
  );
}, areRowPropsEqual);
TableDataRow.displayName = 'TableDataRow';

export function TableData<TData>(props: TableDataProps<TData>) {
  const {
    title = '',
    data,
    columns,
    page = 1,
    setPage = () => {},
    totalPages = 1,
    offset = 0,
    totalCount = 0,
    onEdit,
    onDelete,
    onView,
    renderActions,
    modalEditTitle,
    renderEditForm,
    onSubmitEdit,
    isLoading = false,
    limit = 10,
    setLimit,
    description = '',
    isServerMode = false,
    hideSearchInput = false,
    hidePagination = false,
    tableContainerClassName,
    footerRow
  } = props;

  //const isServerSearch = totalPages > 1;

  const [selectedItem, setSelectedItem] = useState<TData | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [internalPage, setInternalPage] = useState(1);
  const [internalLimit, setInternalLimit] = useState(() => {
    if (typeof window !== 'undefined') {
      const pageKey = window.location.pathname.replace(/\/$/, '') || '/';
      const saved = getLocalStorageSettings(
        pageKey,
        'limit',
        (val): val is number | string =>
          typeof val === 'number' || typeof val === 'string'
      );
      if (saved) {
        const num = parseInt(String(saved), 10);
        if (!isNaN(num)) return num;
      }
    }
    return props.limit ?? 10;
  });

  const activePage = props.page !== undefined ? page : internalPage;
  const activeLimit = props.limit !== undefined ? limit : internalLimit;
  const activeSetPage = props.setPage || setInternalPage;
  const activeSetLimit = setLimit || setInternalLimit;

  useEffect(() => {
    if (props.limit !== undefined) return;
    if (typeof window === 'undefined') return;
    const pageKey = window.location.pathname.replace(/\/$/, '') || '/';
    const numLimit = parseInt(String(activeLimit), 10);
    if (!isNaN(numLimit)) {
      updateLocalStorageSettings(pageKey, 'limit', numLimit);
    }
  }, [activeLimit, props.limit]);

  const {
    globalFilter = '',
    setGlobalFilter,
    initialSorting = [],
    onSortingChange,
    sorting: propsSorting
  } = props;
  const [searchInput, setSearchInput] = useState(globalFilter ?? '');
  const [internalSorting, setInternalSorting] =
    useState<SortingState>(initialSorting);

  // Use props.sorting if provided (controlled), otherwise use internal state
  const sorting = propsSorting ?? internalSorting;

  // Function to handle sorting change
  const handleSortingChange = useCallback(
    (updaterOrValue: any) => {
      const newSorting =
        typeof updaterOrValue === 'function'
          ? updaterOrValue(sorting)
          : updaterOrValue;

      if (onSortingChange) {
        onSortingChange(newSorting);
      }

      // If not fully controlled (propsSorting is undefined), keep internal state in sync
      if (propsSorting === undefined) {
        setInternalSorting(newSorting);
      }
    },
    [onSortingChange, propsSorting, sorting]
  );
  const tableTopRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    // Commented out to prevent unintended scrolling that may conflict with layout-level scroll resets
    /*
    if (tableTopRef.current) {
      tableTopRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
    if (tableRef.current?.parentElement) {
      tableRef.current.parentElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
    */
  }, [activePage]);

  useEffect(() => {
    if (!isServerMode) return;
    if (setGlobalFilter) {
      setGlobalFilter(searchInput ?? '');
    }
    if (setPage) setPage(1);
  }, [searchInput, isServerMode, setGlobalFilter, setPage]);

  useEffect(() => {
    if (isServerMode) return;
    setInternalPage(1);
  }, [searchInput, isServerMode]);

  // Reset page to 1 whenever limit (rows per page) changes
  const prevLimitRef = useRef(activeLimit);
  useEffect(() => {
    if (prevLimitRef.current !== activeLimit) {
      activeSetPage(1);
      prevLimitRef.current = activeLimit;
    }
  }, [activeLimit, activeSetPage]);

  // Reset page to 1 whenever client-side data changes (due to external filters)
  const dataIdsSerialized = useMemo(() => {
    if (isServerMode) return '';
    return data
      .map((item: any) => {
        if (!item) return '';
        return String(
          item._id ||
            item.id ||
            item.ID ||
            item.uuid ||
            item.code ||
            item.docNumber ||
            item.batchNumber ||
            item.grnNumber ||
            item.invoiceNumber ||
            item.name ||
            item.username ||
            item.email ||
            ''
        );
      })
      .filter(Boolean)
      .join(',');
  }, [data, isServerMode]);

  const locallyFilteredData = useMemo(() => {
    if (isServerMode) return data;

    const keyword = (searchInput || '').toLowerCase().trim();
    const isSorting = sorting.length > 0;

    return data.filter((row: any) => {
      // ❌ hide group header saat search atau sorting
      if (row.isGroupHeader && (keyword || isSorting)) return false;

      // kalau ada search, lakukan pencarian generik ke seluruh value dalam object (deep search)
      if (keyword) {
        const searchInObject = (obj: any): boolean => {
          if (!obj) return false;
          return Object.values(obj).some((val) => {
            if (val && typeof val === 'object' && !(val instanceof Date)) {
              return searchInObject(val);
            }
            return String(val ?? '')
              .toLowerCase()
              .includes(keyword);
          });
        };
        return searchInObject(row);
      }

      // kalau tidak ada search dan sorting, tampilkan semua (termasuk group header)
      return true;
    });
  }, [data, searchInput, isServerMode, sorting]);

  const prevDataIdsRef = useRef(dataIdsSerialized);
  useEffect(() => {
    if (isServerMode) return;
    if (prevDataIdsRef.current !== dataIdsSerialized) {
      const maxPage = Math.max(
        1,
        Math.ceil(locallyFilteredData.length / activeLimit)
      );
      if (activePage > maxPage) {
        activeSetPage(maxPage);
      }
      prevDataIdsRef.current = dataIdsSerialized;
    }
  }, [
    dataIdsSerialized,
    isServerMode,
    activeSetPage,
    activePage,
    locallyFilteredData.length,
    activeLimit
  ]);

  const handleEdit = useCallback(
    (item: TData) => {
      if (onEdit) return onEdit(item);
      setSelectedItem(item);
      setShowEditModal(true);
    },
    [onEdit]
  );

  const handleModalClose = useCallback(() => {
    setShowEditModal(false);
    setSelectedItem(null);
  }, []);

  // ================== ACTION COLUMN ==================
  const actionColumn: ExtendedColumnDef<TData> = useMemo(
    () => ({
      id: 'actions',
      header: 'Actions',
      align: 'left',
      size: props.actionsColumnSize ?? 160,
      noWrap: true,
      cell: ({ row }) => {
        const item = row.original;
        return renderActions ? (
          <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
            {renderActions(item)}
          </div>
        ) : (
          <div className="flex items-center gap-1 flex-nowrap whitespace-nowrap">
            {onView && (
              <Button variant="green" size="sm" onClick={() => onView(item)}>
                <Eye className="w-4 h-4 mr-1" /> View
              </Button>
            )}
            {(onEdit || renderEditForm) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(item)}
              >
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(item)}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Delete
              </Button>
            )}
          </div>
        );
      },
      sticky: 'right'
    }),
    [
      onView,
      onEdit,
      renderEditForm,
      onDelete,
      renderActions,
      handleEdit,
      props.actionsColumnSize
    ]
  );

  // ================== COLUMN SETUP ==================
  const allColumns = useMemo(() => {
    const cols: ExtendedColumnDef<TData>[] = columns.map((col) => {
      if (col.header === '#' || col.id === 'index') {
        return {
          ...col,
          cell: (info: any) => {
            const meta = info.table.options.meta as any;
            const visualIndex = info.table
              .getSortedRowModel()
              .flatRows.findIndex((r: any) => r.id === info.row.id);
            const actualIndex =
              visualIndex !== -1 ? visualIndex : info.row.index;
            const globalIndex = (meta?.offset ?? 0) + actualIndex + 1;
            return (
              <div className="py-0">
                <span className="text-[11px] text-gray-500 font-medium">
                  {globalIndex}
                </span>
              </div>
            );
          }
        };
      }
      return col;
    });
    if (onEdit || onDelete || onView || renderActions || renderEditForm) {
      cols.push(actionColumn);
    }

    // Sort so sticky columns are at the front
    return cols.sort((a, b) => {
      // sticky left preferred at start
      if (a.sticky === 'left' && b.sticky !== 'left') return -1;
      if (a.sticky !== 'left' && b.sticky === 'left') return 1;
      // sticky right preferred at end
      if (a.sticky === 'right' && b.sticky !== 'right') return 1;
      if (a.sticky !== 'right' && b.sticky === 'right') return -1;
      return 0;
    });
  }, [
    columns,
    onEdit,
    onDelete,
    onView,
    renderActions,
    renderEditForm,
    actionColumn
  ]);

  const visibleColumns = useMemo(() => {
    return allColumns.filter((col) => col.visible !== false);
  }, [allColumns]);

  const columnVisibility = useMemo(() => {
    const visibility: Record<string, boolean> = {};
    allColumns.forEach((col) => {
      const id = col.id ?? (col as any).accessorKey;
      if (id) visibility[id] = col.visible !== false;
    });
    return visibility;
  }, [allColumns]);

  // Stable key untuk deteksi perubahan kolom & sorting (trigger re-render index)
  const columnsKey = useMemo(
    () =>
      [
        ...visibleColumns.map((c: any) => c.id ?? c.accessorKey ?? ''),
        JSON.stringify(sorting)
      ].join('|'),
    [visibleColumns, sorting]
  );

  // ================== CREATE TABLE ==================
  const table = useReactTable({
    data: isServerMode ? data : locallyFilteredData,
    columns: allColumns as ColumnDef<TData, unknown>[],
    getRowId: (row: any, index: number) =>
      row._id ||
      row.id ||
      row.ID ||
      row.uuid ||
      row.docNumber ||
      row.invoiceNumber ||
      row.grnNumber ||
      row.code ||
      String(index),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: handleSortingChange,
    state: {
      sorting,
      columnVisibility
    },
    meta: {
      offset: isServerMode ? (offset ?? 0) : 0
    },
    manualSorting: isServerMode ? totalCount > (limit ?? 0) : false,
    enableSortingRemoval: true,
    sortDescFirst: false,
    manualPagination: true,
    columnResizeMode: 'onEnd',
    defaultColumn: {
      size: 80,
      minSize: 1,
      maxSize: 300,
      enableSorting: true
    }
  });

  const tableRows = table.getRowModel().rows;
  const displayRows = useMemo(() => {
    if (isServerMode) return tableRows;
    return tableRows.slice(
      (activePage - 1) * activeLimit,
      activePage * activeLimit
    );
  }, [tableRows, isServerMode, activePage, activeLimit]);
  return (
    <Authorized isLoading={isLoading}>
      {showEditModal && selectedItem && renderEditForm && onSubmitEdit && (
        <ModalEdit
          title={modalEditTitle || 'Edit Item'}
          item={selectedItem}
          onClose={handleModalClose}
          onSubmit={(values, helpers) =>
            onSubmitEdit(values, { ...helpers, closeModal: handleModalClose })
          }
          renderForm={renderEditForm}
        />
      )}

      <Card
        ref={tableTopRef}
        className="flex flex-col w-[100%] shadow-sm border border-[#EDE7DC] rounded-sm hover:shadow-md transition-shadow bg-white overflow-hidden"
      >
        <CardContent className="flex-1 rounded-sm border border-transparent shadow-sm p-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#FFF6E5]/40 border-b border-[#EDE7DC]">
            <div>
              {title && (
                <h3 className="font-serif text-lg font-bold text-[#15172B] tracking-tight flex items-center gap-2">
                  {title}
                  {locallyFilteredData && (
                    <span className="px-2.5 py-0.5 bg-[#E73449] text-white text-[10px] font-bold rounded-sm uppercase tracking-wider shadow-xs">
                      {locallyFilteredData.length}
                    </span>
                  )}
                </h3>
              )}
              {description && (
                <p className="text-xs text-[#555770] mt-0.5">{description}</p>
              )}
            </div>
            {!hideSearchInput && (
              <SearchInput
                value={searchInput ?? ''}
                onChange={setSearchInput}
                placeholder="Search records..."
                className="w-full sm:w-64"
              />
            )}
          </div>

          <div className="relative">
            <Table
              ref={tableRef}
              className="w-[100%]"
              containerClassName={tableContainerClassName}
            >
              {/* HEADER */}
              <TableHeader className="sticky top-0 z-50 bg-[#FFF6E5] border-b border-[#EDE7DC]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="border-b border-[#EDE7DC] bg-[#FFF6E5]">
                    {headerGroup?.headers?.map((header) => {
                      const colDef = header.column
                        .columnDef as ExtendedColumnDef<TData>;
                      const canSort = header.column.getCanSort();
                      const isSorted = header.column.getIsSorted();

                      return (
                        <TableHead
                          key={header.id}
                          style={{
                            width: header.getSize(),
                            minWidth: colDef.minSize,
                            maxWidth: colDef.maxSize,
                            ...(colDef.sticky === 'left'
                              ? { left: header.getStart() }
                              : colDef.sticky === 'right'
                                ? { right: header.column.getAfter('right') }
                                : {})
                          }}
                          className={cn(
                            'bg-[#FFF6E5] py-3.5 px-3',
                            'uppercase text-[11px] font-bold tracking-wider text-[#15172B]',
                            headerAlignClass[colDef.align || 'left'],
                            colDef.sticky === 'left' ||
                              colDef.sticky === 'right'
                              ? 'sticky z-[60]'
                              : '',
                            colDef.sticky === 'left' ? 'left-0' : '',
                            colDef.sticky === 'right' ? 'right-0' : ''
                          )}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              className={cn(
                                'flex items-center gap-2 w-full',
                                canSort &&
                                  'cursor-pointer select-none hover:text-[#E73449] transition-colors',
                                headerAlignClass[colDef.align || 'left']
                              )}
                              onClick={
                                canSort
                                  ? header.column.getToggleSortingHandler()
                                  : undefined
                              }
                            >
                              <span>
                                {flexRender(colDef.header, header.getContext())}
                              </span>
                              {canSort && (
                                <span className="flex-shrink-0">
                                  {isSorted === 'asc' ? (
                                    <ArrowUp className="h-3 w-3 text-[#E73449]" />
                                  ) : isSorted === 'desc' ? (
                                    <ArrowDown className="h-3 w-3 text-[#E73449]" />
                                  ) : (
                                    <ArrowUpDown className="h-3 w-3 opacity-40" />
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>

              {/* BODY */}
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibleColumns.length +
                        (onEdit ||
                        onDelete ||
                        onView ||
                        renderActions ||
                        renderEditForm
                          ? 1
                          : 0)
                      }
                      className="text-center h-24"
                    >
                      <div className="flex items-center justify-center gap-2 py-4">
                        <Loader2 className="animate-spin h-5 w-5 text-[#E73449]" />
                        <span className="text-xs text-[#555770] font-medium">
                          Memuat data...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : displayRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={
                        visibleColumns.length +
                        (onEdit ||
                        onDelete ||
                        onView ||
                        renderActions ||
                        renderEditForm
                          ? 1
                          : 0)
                      }
                      className="text-center py-12 bg-white"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="w-12 h-12 rounded-full bg-[#FFF6E5] border border-[#EDE7DC] text-[#E73449] flex items-center justify-center shadow-xs">
                          <FolderOpen className="w-6 h-6" />
                        </div>
                        <div className="font-serif font-bold text-base text-[#15172B]">
                          {props.noDataTitle ?? 'No Records Found'}
                        </div>
                        <p className="text-xs text-[#555770] max-w-sm">
                          {props.noDataMessage ?? 'There are no confirmed items or entries to display at the moment.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayRows.map((row) => (
                    <TableDataRow
                      key={row.id}
                      row={row}
                      _columnsKey={columnsKey}
                    />
                  ))
                )}
              </TableBody>
              {footerRow && (
                <tfoot className="sticky bottom-0 z-40 bg-white">
                  {footerRow}
                </tfoot>
              )}
            </Table>
          </div>
        </CardContent>

        {!hidePagination && (
          <CardFooter>
            <TablePagination
              title={title}
              page={activePage}
              setPage={activeSetPage}
              totalPages={
                isServerMode
                  ? totalPages
                  : Math.ceil(locallyFilteredData.length / activeLimit)
              }
              offset={isServerMode ? offset : (activePage - 1) * activeLimit}
              currentCount={displayRows.length}
              totalCount={
                isServerMode ? totalCount : locallyFilteredData.length
              }
              limit={activeLimit}
              setLimit={activeSetLimit}
            />
          </CardFooter>
        )}
      </Card>
    </Authorized>
  );
}
