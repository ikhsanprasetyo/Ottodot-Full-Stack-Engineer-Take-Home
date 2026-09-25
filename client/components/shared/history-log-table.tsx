import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { History } from 'lucide-react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

export interface HistoryLogItem {
  id: string;
  createdAt: string | Date;
  action: string;
  changes: string;
  performerName?: string;
  performerRole?: string;
}

interface HistoryLogTableProps {
  histories: HistoryLogItem[];
  title?: string;
}

export function HistoryLogTable({
  histories,
  title = 'History Log'
}: HistoryLogTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1 border-b pb-4 border-gray-50">
        <History className="w-5 h-5 text-gray-400" />
        <h3 className="font-bold text-gray-800 uppercase tracking-wider text-xs">
          {title}
        </h3>
      </div>
      {histories && histories.length > 0 ? (
        <div className="border border-gray-50 rounded-sm overflow-hidden shadow-sm">
          <Table containerClassName="h-auto" className="w-full">
            <TableHeader className="bg-gray-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead className="font-bold text-xs uppercase py-4">
                  Time
                </TableHead>
                <TableHead className="font-bold text-xs uppercase">
                  Action
                </TableHead>
                <TableHead className="font-bold text-xs uppercase">
                  Changes
                </TableHead>
                <TableHead className="font-bold text-xs uppercase">
                  User
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {histories.map((history) => (
                <TableRow key={history.id} className="border-gray-50">
                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                    {dayjs(history.createdAt).format('DD MMM YY HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold tracking-wider uppercase',
                        history.action === 'CREATED' &&
                          'text-blue-600 border-blue-200 bg-blue-50',
                        history.action === 'STARTED' &&
                          'text-purple-600 border-purple-200 bg-purple-50',
                        history.action === 'COMPLETED' &&
                          'text-green-600 border-green-200 bg-green-50',
                        history.action === 'UPDATED' &&
                          'text-orange-600 border-orange-200 bg-orange-50',
                        history.action === 'CANCELLED' &&
                          'text-red-600 border-red-200 bg-red-50'
                      )}
                    >
                      {history.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-gray-700">
                    {history.changes}
                  </TableCell>
                  <TableCell className="text-sm">
                    {history.performerName ? (
                      <div>
                        <span className="font-bold">
                          {history.performerName}
                        </span>
                        {history.performerRole && (
                          <span className="block text-[10px] text-gray-400">
                            {history.performerRole}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">
                        System
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-4 border border-dashed border-gray-200 text-center text-sm text-gray-400 italic rounded-sm">
          No history recorded yet
        </div>
      )}
    </div>
  );
}
