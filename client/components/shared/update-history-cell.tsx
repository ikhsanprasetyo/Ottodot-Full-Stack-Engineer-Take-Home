'use client';

import { useMemo } from 'react';
import dayjs from 'dayjs';
import { Clock, History, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

// Generic types — works with any RTU entity that has histories
export interface HistoryPerformer {
  _id?: string;
  name?: string;
  username?: string;
  email?: string;
  positionDoc?: { title?: string };
}

export interface HistoryEntry {
  _id: string;
  action: string;
  changes?: string;
  performer?: HistoryPerformer;
  createdAt: string;
}

export interface FieldChangeItem {
  field: string;
  old: string;
  new: string;
}

function parseFieldChanges(changes?: string): FieldChangeItem[] | null {
  if (!changes) return null;
  const trimmed = changes.trim();
  if (!trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].field) {
      return parsed as FieldChangeItem[];
    }
  } catch {
    // fallback to plain text
  }
  return null;
}

interface UpdateHistoryCellProps {
  histories?: HistoryEntry[];
  /** Fallback performer shown when history performer is empty */
  creator?: HistoryPerformer;
  /** Fallback updater performer */
  updater?: HistoryPerformer;
  /** Fallback date shown when histories is empty */
  createdAt?: string;
}

const ACTION_META: Record<
  string,
  { dot: string; badge: string; label: string }
> = {
  CREATED: {
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-600',
    label: 'Created'
  },
  UPDATED: {
    dot: 'bg-gray-400',
    badge: 'bg-gray-100 text-gray-600',
    label: 'Updated'
  },
  STARTED: {
    dot: 'bg-yellow-400',
    badge: 'bg-yellow-50 text-yellow-700',
    label: 'Started'
  },
  COMPLETED: {
    dot: 'bg-green-500',
    badge: 'bg-green-50 text-green-600',
    label: 'Completed'
  },
  CANCELLED: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-600',
    label: 'Cancelled'
  },
  DELETED: {
    dot: 'bg-red-700',
    badge: 'bg-red-100 text-red-700',
    label: 'Deleted'
  },
  APPROVED: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-600',
    label: 'Approved'
  },
  RESTORED: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-600',
    label: 'Restored'
  },
  REJECTED: {
    dot: 'bg-orange-500',
    badge: 'bg-orange-50 text-orange-600',
    label: 'Rejected'
  }
};

function getMeta(action: string) {
  return (
    ACTION_META[action?.toUpperCase()] ?? {
      dot: 'bg-gray-300',
      badge: 'bg-gray-50 text-gray-500',
      label: action
    }
  );
}

function resolvePerformerInfo(
  primary?: HistoryPerformer,
  updater?: HistoryPerformer,
  creator?: HistoryPerformer
) {
  const p = primary || updater || creator;
  if (!p) return { name: 'System', title: undefined };
  const name = p.name || p.username || p.email || 'System';
  const title = p.positionDoc?.title;
  return { name, title };
}

export function UpdateHistoryCell({
  histories = [],
  creator,
  updater,
  createdAt
}: UpdateHistoryCellProps) {
  const effectiveHistories = useMemo(() => {
    if (histories && histories.length > 0) return histories;
    if (creator || updater || createdAt) {
      return [
        {
          _id: 'initial-created-event',
          action: 'CREATED',
          performer: creator || updater,
          createdAt: createdAt || new Date().toISOString()
        }
      ];
    }
    return [];
  }, [histories, creator, updater, createdAt]);

  const latest = effectiveHistories[0];
  const latestMeta = getMeta(latest?.action ?? 'CREATED');
  const latestPerformerInfo = resolvePerformerInfo(
    latest?.performer,
    updater,
    creator
  );
  const latestDate = latest
    ? dayjs(latest.createdAt).format('DD/MM/YY HH:mm')
    : createdAt
      ? dayjs(createdAt).format('DD/MM/YY HH:mm')
      : '-';

  return (
    <div className="flex items-center justify-between gap-2 py-0">
      {/* Compact preview */}
      <div className="flex items-start gap-1.5 truncate">
        <div
          className={`w-1.5 h-1.5 rounded-sm shrink-0 mt-1 ${latestMeta.dot}`}
          title={latestMeta.label}
        />
        <div className="flex flex-col gap-0.5 truncate leading-none py-0.5">
          <div className="flex items-center gap-1 truncate">
            <span
              className="text-[10px] font-bold text-gray-700 truncate max-w-[120px]"
              title={latestPerformerInfo.name}
            >
              {latestPerformerInfo.name}
            </span>
            {latestPerformerInfo.title && (
              <span
                className="text-[9px] text-gray-400 italic truncate max-w-[80px]"
                title={latestPerformerInfo.title}
              >
                ({latestPerformerInfo.title})
              </span>
            )}
          </div>
          <span className="text-[9px] text-gray-400 font-medium shrink-0">
            {latestDate}
          </span>
        </div>
      </div>

      {/* Dialog trigger */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-gray-400 hover:text-blue-600 hover:bg-blue-50 shrink-0 cursor-pointer rounded-sm"
          >
            <History className="w-3.5 h-3.5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md rounded-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <span>Update History</span>
              <span className="px-2 py-0.5 rounded-sm bg-gray-100 text-gray-600 text-[10px] font-medium">
                {effectiveHistories.length} entri
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 max-h-[60vh] overflow-y-auto">
            {effectiveHistories.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-6">
                Belum ada history.
              </p>
            ) : (
              <div className="relative">
                {/* vertical timeline line */}
                <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-gray-100 z-0" />
                <div className="space-y-4">
                  {effectiveHistories.map((h) => {
                    const meta = getMeta(h.action);
                    const perfInfo = resolvePerformerInfo(
                      h.performer,
                      updater,
                      creator
                    );
                    return (
                      <div key={h._id} className="relative pl-8">
                        <div
                          className={`absolute left-2 top-1.5 w-2.5 h-2.5 rounded-sm ${meta.dot} ring-4 ring-white z-10 shrink-0`}
                        />
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] font-bold text-gray-900">
                              {perfInfo.name}
                            </span>
                            {perfInfo.title && (
                              <span className="text-[10px] text-gray-400 italic">
                                {perfInfo.title}
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${meta.badge}`}
                            >
                              {meta.label}
                            </span>
                          </div>
                          {(() => {
                            const parsedChanges = parseFieldChanges(h.changes);
                            if (parsedChanges) {
                              return (
                                <div className="mt-1 space-y-1 bg-gray-50/80 border border-gray-200/60 rounded-sm p-2">
                                  {parsedChanges.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center gap-1.5 text-[10px] flex-wrap leading-tight"
                                    >
                                      <span className="font-semibold text-gray-700 min-w-[70px]">
                                        {item.field}:
                                      </span>
                                      <span className="line-through text-red-600 bg-red-50 border border-red-200/60 px-1 py-0.5 rounded-sm font-mono text-[9px]">
                                        {item.old || '-'}
                                      </span>
                                      <ArrowRight className="w-3 h-3 text-gray-400 shrink-0" />
                                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-200/60 font-bold px-1 py-0.5 rounded-sm font-mono text-[9px]">
                                        {item.new || '-'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return (
                              h.changes && (
                                <p className="text-[10px] text-gray-500 leading-snug">
                                  {h.changes}
                                </p>
                              )
                            );
                          })()}
                          <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium mt-1">
                            <Clock className="w-2.5 h-2.5" />
                            {dayjs(h.createdAt).format('DD MMM YYYY, HH:mm')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
