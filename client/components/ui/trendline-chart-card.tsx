'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import dayjs from 'dayjs';
import React from 'react';
import { CustomTooltip } from '@/components/ui/custom-tooltip';

type TrendLineChartCardProps<T> = {
  title: string;
  data: T[];
  dataKey: keyof T;
  xKey: keyof T;

  height?: number;
  gradientId?: string;

  productType?: string;
  date?: Date | string;

  tooltip?: React.ReactElement;

  /** 🔥 NEW FLEXIBLE OPTIONS */
  xTickFormatter?: (value: any) => string;
  headerFormatter?: () => React.ReactNode;
  lineProps?: Partial<React.ComponentProps<typeof Line>>;
};

export function TrendLineChartCard<T extends Record<string, any>>({
  title,
  data,
  dataKey,
  xKey,
  height = 260,
  gradientId = 'lineGradient',
  productType,
  date,
  tooltip = <CustomTooltip />,
  xTickFormatter,
  headerFormatter,
  lineProps
}: TrendLineChartCardProps<T>) {
  return (
    <Card className="shadow-sm border border-gray-100 rounded-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-gray-700 tracking-wider">
          {headerFormatter ? (
            headerFormatter()
          ) : (
            <>
              {title}
              {date && ` ${dayjs(date).format('MMMM YYYY')}`}
              {productType && ` (${productType})`}
            </>
          )}
        </h3>

        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.8} />
              </linearGradient>
            </defs>

            <XAxis
              dataKey={xKey as string}
              stroke="#6b7280"
              tickFormatter={
                xTickFormatter ?? ((value: string) => dayjs(value).format('DD'))
              }
            />

            <YAxis stroke="#6b7280" />

            {tooltip && <Tooltip content={tooltip} />}

            <Line
              type="monotone"
              dataKey={dataKey as string}
              stroke={`url(#${gradientId})`}
              strokeWidth={3}
              dot={{
                r: 4,
                stroke: '#2563eb',
                strokeWidth: 2,
                fill: '#60a5fa'
              }}
              activeDot={{ r: 6 }}
              {...lineProps}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
