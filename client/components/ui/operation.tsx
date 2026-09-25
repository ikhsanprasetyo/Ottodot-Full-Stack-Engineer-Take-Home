import React from 'react';
import clsx from 'clsx';

// 🎨 Warna berdasarkan tone profesional (tidak terlalu mencolok)
export const operationColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700 border border-green-300',
  update: 'bg-blue-100 text-blue-700 border border-blue-300',
  delete: 'bg-red-100 text-red-700 border border-red-300',
  restore: 'bg-purple-100 text-purple-700 border border-purple-300',
  approve: 'bg-emerald-100 text-emerald-700 border border-emerald-300',
  reject: 'bg-amber-100 text-amber-700 border border-amber-300'
};

export const operationLabels: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  restore: 'Restored',
  approve: 'Approved',
  reject: 'Rejected'
};

const OPERATION_PREFIXES = [
  'Create ',
  'Update ',
  'Delete ',
  'Restore ',
  'Approve ',
  'Reject '
];

function getShortLabel(label: string) {
  for (const prefix of OPERATION_PREFIXES) {
    if (label.startsWith(prefix)) {
      return label.replace(prefix, '').trim();
    }
  }

  return label; // fallback aman
}

interface OperationBadgeProps {
  operation: string;
  horizontal?: boolean;
}

export const OperationBadge: React.FC<OperationBadgeProps> = ({
  operation,
  horizontal = false
}) => {
  const key = operation.toLowerCase();

  const label =
    operationLabels[key] ||
    operation?.charAt(0)?.toUpperCase() + operation?.slice(1);
  const labelShortFirstWord = label.split(' ')[0];
  const labelShortSecondWord = getShortLabel(label);

  const colorClass =
    operationColors[key] || 'bg-gray-100 text-gray-700 border border-gray-300';

  return (
    <div
      className={`flex ${horizontal ? 'flex-row gap-1' : 'flex-col'} items-start w-auto`}
    >
      {/* Badge kecil (ikon visual) */}
      <span
        className={clsx(
          'inline-flex items-center justify-center',
          'h-4 min-w-[28px]',
          'px-1 text-[10px] font-semibold leading-none',
          'rounded-sm border select-none text-nowrap overflow-hidden truncate',
          colorClass
        )}
      >
        {labelShortFirstWord}
      </span>

      {/* Label lengkap */}
      {label !== labelShortSecondWord && (
        <span className="text-[10px] leading-none text-muted-foreground text-left whitespace-normal break-words">
          {labelShortSecondWord}
        </span>
      )}
    </div>
  );
};
