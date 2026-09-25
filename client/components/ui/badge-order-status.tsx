'use client';

import React from 'react';

type StatusBadgeProps = {
  status: string;
};

export const BadgeOrderStatus: React.FC<StatusBadgeProps> = ({ status }) => {
  const baseClass =
    'text-xs font-semibold px-2 py-1 rounded-sm inline-block w-fit';

  const statusClassMap: Record<string, string> = {
    PAID: 'bg-green-100 text-green-700',
    SUCCESSFUL: 'bg-green-100 text-green-700',
    UNPAID: 'bg-gray-100 text-gray-700',
    FAILED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-yellow-100 text-yellow-800',
    REFUND: 'bg-yellow-100 text-yellow-800',
    EXPIRED: 'bg-orange-100 text-orange-700'
  };

  const colorClass = statusClassMap[status] || 'bg-slate-200 text-slate-800';

  return <span className={`${baseClass} ${colorClass}`}>{status}</span>;
};
